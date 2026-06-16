import { useCielStore, Email, CalendarEvent } from "@/store/useCielStore";
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { pool } from "./db";
import { setupCorsair } from "corsair/setup";

export const corsair = createCorsair<readonly [
  ReturnType<typeof gmail>,
  ReturnType<typeof googlecalendar>
]>({
  multiTenancy: true,
  plugins: [gmail(), googlecalendar()] as const,
  integrations: [gmail(), googlecalendar()] as const,
  database: pool,
  kek: process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY || "ch_lMXup536Xjs1dZBzvEPkgU6s7aA6wdJHwGYn-GIiRk4",
} as any);

let isSetupInitialized = false;
export async function ensureCorsairSetup() {
  if (isSetupInitialized) return;
  try {
    await setupCorsair(corsair, {
      credentials: {
        gmail: {
          client_id: process.env.CORSAIR_GOOGLE_CLIENT_ID || "",
          client_secret: process.env.CORSAIR_GOOGLE_CLIENT_SECRET || "",
        },
        googlecalendar: {
          client_id: process.env.CORSAIR_GOOGLE_CLIENT_ID || "",
          client_secret: process.env.CORSAIR_GOOGLE_CLIENT_SECRET || "",
        },
      },
    });
    isSetupInitialized = true;
    console.log("[Corsair] setupCorsair completed successfully.");
  } catch (error) {
    console.error("[Corsair] setupCorsair failed:", error);
  }
}

// handles connection to corsair API or MCP server
// falls back to local zustand state if credentials are missing
export class CorsairClient {
  private static getTenant(tenantId?: string) {
    const resolvedTenantId = tenantId || "guest@ciel.app";
    return corsair.withTenant(resolvedTenantId);
  }

  private static base64urlDecode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    try {
      return Buffer.from(base64, "base64").toString("utf8");
    } catch (e) {
      console.error("Base64 decode error:", e);
      return "";
    }
  }

  private static extractBody(part: any): string {
    const findPart = (p: any, mimeType: string): string => {
      if (p.mimeType === mimeType && p.body?.data) {
        return this.base64urlDecode(p.body.data);
      }
      if (p.parts && p.parts.length > 0) {
        for (const subPart of p.parts) {
          const content = findPart(subPart, mimeType);
          if (content) return content;
        }
      }
      return "";
    };

    const htmlBody = findPart(part, "text/html");
    if (htmlBody) return htmlBody;

    const plainBody = findPart(part, "text/plain");
    if (plainBody) return plainBody;

    return "";
  }

  private static replaceInlineImages(body: string, payload: any): string {
    if (!body || !payload) return body;
    const imageMap: Record<string, string> = {};
    const traverseParts = (p: any) => {
      if (p.mimeType?.startsWith("image/") && p.body?.data) {
        const contentIdHeader = p.headers?.find(
          (h: any) => h.name.toLowerCase() === "content-id"
        );
        if (contentIdHeader) {
          const contentId = contentIdHeader.value.replace(/[<>]/g, "").trim();
          const base64 = p.body.data.replace(/-/g, "+").replace(/_/g, "/");
          imageMap[contentId] = `data:${p.mimeType};base64,${base64}`;
        }
      }
      if (p.parts && p.parts.length > 0) {
        for (const subPart of p.parts) {
          traverseParts(subPart);
        }
      }
    };
    traverseParts(payload);

    let updatedBody = body;
    for (const [cid, dataUri] of Object.entries(imageMap)) {
      const escapedCid = cid.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`src=['"]cid:${escapedCid}['"]`, "gi");
      updatedBody = updatedBody.replace(regex, `src="${dataUri}"`);
      const rawRegex = new RegExp(`cid:${escapedCid}`, "gi");
      updatedBody = updatedBody.replace(rawRegex, dataUri);
    }
    return updatedBody;
  }

  static parseGmailMessage(msg: any): Email | null {
    if (!msg || !msg.id) return null;

    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => {
      const h = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return h ? h.value : "";
    };

    const subject = getHeader("subject") || "(No Subject)";
    const fromHeader = getHeader("from");
    let fromName = "Unknown Sender";
    let fromEmail = "unknown@domain.com";

    if (fromHeader) {
      const match = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
      if (match) {
        fromName = match[1].replace(/['"]/g, "").trim() || match[2];
        fromEmail = match[2].trim();
      } else {
        fromName = fromHeader.trim();
        fromEmail = fromHeader.trim();
      }
    }

    const dateHeader = getHeader("date");
    let dateStr = new Date().toISOString();
    try {
      if (msg.internalDate) {
        const ms = Number(msg.internalDate);
        if (!isNaN(ms)) {
          dateStr = new Date(ms).toISOString();
        } else {
          dateStr = new Date(msg.internalDate).toISOString();
        }
      } else if (dateHeader) {
        dateStr = new Date(dateHeader).toISOString();
      }
    } catch (e) {
      console.error("[Corsair SDK] Date parse error in parseGmailMessage:", e);
    }

    let body = "";
    if (msg.payload) {
      body = this.extractBody(msg.payload);
      body = this.replaceInlineImages(body, msg.payload);
    }
    if (!body) {
      body = msg.snippet || "";
    }

    const read = !(msg.labelIds || []).includes("UNREAD");

    return {
      id: msg.id,
      from: fromName,
      fromEmail: fromEmail,
      subject: subject,
      body: body,
      date: dateStr,
      read: read,
      priority: "medium",
      category: "work",
    };
  }

  static parseGmailMessageFromDb(msg: any): Email | null {
    if (!msg) return null;

    const data = msg.data || msg;
    const msgId = msg.entity_id || msg.id || data.id;
    if (!msgId) return null;

    const fromHeader = data.from || "";
    let fromName = "Unknown Sender";
    let fromEmail = "unknown@domain.com";

    const headers = data.payload?.headers || [];
    const getHeader = (name: string) => {
      const h = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return h ? h.value : "";
    };

    const subject = data.subject || getHeader("subject") || "(No Subject)";
    const fromVal = fromHeader || getHeader("from");

    if (fromVal) {
      const match = fromVal.match(/^(.*?)\s*<([^>]+)>/);
      if (match) {
        fromName = match[1].replace(/['"]/g, "").trim() || match[2];
        fromEmail = match[2].trim();
      } else {
        fromName = fromVal.trim();
        fromEmail = fromVal.trim();
      }
    }

    const dateHeader = getHeader("date");
    let dateStr = new Date().toISOString();
    try {
      if (data.internalDate) {
        const ms = Number(data.internalDate);
        if (!isNaN(ms)) {
          dateStr = new Date(ms).toISOString();
        } else {
          dateStr = new Date(data.internalDate).toISOString();
        }
      } else if (dateHeader) {
        dateStr = new Date(dateHeader).toISOString();
      } else if (msg.createdAt) {
        dateStr = new Date(msg.createdAt).toISOString();
      }
    } catch (e) {
      console.error("[Corsair SDK] Date parse error, fallback to now:", e);
    }

    let body = data.body || "";
    if (!body && data.payload) {
      body = this.extractBody(data.payload);
    }
    if (data.payload) {
      body = this.replaceInlineImages(body, data.payload);
    }
    if (!body) {
      body = data.snippet || "";
    }

    const read = !(data.labelIds || []).includes("UNREAD");

    return {
      id: msgId,
      from: fromName,
      fromEmail: fromEmail,
      subject: subject,
      body: body,
      date: dateStr,
      read: read,
      priority: "medium",
      category: "work",
    };
  }

  // gmail operations
  static async searchEmails(query: string, tenantId?: string): Promise<Email[]> {
    console.log(`[Corsair] Searching emails for query: "${query}" (tenant: ${tenantId})`);
    
    try {
      const client = this.getTenant(tenantId);
      let list: any[] = [];
      if (query) {
        const subjectList = await client.gmail.db.messages.search({
          data: { subject: { contains: query } },
          limit: 100
        });
        const bodyList = await client.gmail.db.messages.search({
          data: { body: { contains: query } },
          limit: 100
        });
        const fromList = await client.gmail.db.messages.search({
          data: { from: { contains: query } },
          limit: 100
        });
        const map = new Map();
        for (const item of [...subjectList, ...bodyList, ...fromList]) {
          map.set(item.id, item);
        }
        list = Array.from(map.values());
      } else {
        list = await client.gmail.db.messages.list({
          limit: 100
        });
      }

      if (list) {
        const emails: Email[] = [];
        for (const msg of list) {
          const data = msg.data || msg;
          let fullMsg: any = data;
          
          // If it's a skeleton record (missing body, payload, subject, etc.), fetch details live
          if (!data.payload && !data.from && !data.subject) {
            try {
              const liveMsg = await client.gmail.api.messages.get({
                userId: "me",
                id: msg.entity_id || msg.id || data.id
              });
              if (liveMsg) {
                fullMsg = liveMsg;
              }
            } catch (getErr: any) {
              console.error(`[Corsair API] Failed to fetch full message for ${msg.id}:`, getErr.message);
            }
          }
          
          const parsed = this.parseGmailMessageFromDb(fullMsg);
          if (parsed) {
            // Override ID to Corsair DB record ID to ensure sync state matches
            parsed.id = msg.id || parsed.id;
            emails.push(parsed);
          }
        }
        return emails;
      }
    } catch (error) {
      console.error("[Corsair API] searchEmails error, falling back:", error);
    }

    // local fallback search
    const store = useCielStore.getState();
    if (!query.trim()) return store.emails;

    const lowerQuery = query.toLowerCase();
    return store.emails.filter(
      (email) =>
        email.subject.toLowerCase().includes(lowerQuery) ||
        email.body.toLowerCase().includes(lowerQuery) ||
        email.from.toLowerCase().includes(lowerQuery) ||
        email.fromEmail.toLowerCase().includes(lowerQuery)
    );
  }

  static async sendEmail(to: string, subject: string, body: string, tenantId?: string): Promise<boolean> {
    console.log(`[Corsair] Sending email to: ${to}, subject: "${subject}" (tenant: ${tenantId})`);

    try {
      const client = this.getTenant(tenantId);
      const emailParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `MIME-Version: 1.0`,
        "",
        body
      ];
      const emailString = emailParts.join("\r\n");
      const raw = Buffer.from(emailString, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await client.gmail.api.messages.send({
        userId: "me",
        raw: raw
      });
      if (res) {
        return true;
      }
    } catch (error) {
      console.error("[Corsair API] sendEmail error, falling back:", error);
    }

    // append to local emails list
    const store = useCielStore.getState();
    const newEmail: Email = {
      id: Math.random().toString(),
      from: store.user?.name || "You",
      fromEmail: store.user?.email || "user@ciel.app",
      subject: subject || "(No Subject)",
      body: body,
      date: "Just now",
      read: true,
      priority: "medium",
      category: "work",
    };
    
    store.addEmail(newEmail);
    return true;
  }

  static async createDraft(to: string, subject: string, body: string, tenantId?: string): Promise<Email> {
    console.log(`[Corsair] Creating draft for: ${to} (tenant: ${tenantId})`);

    try {
      const client = this.getTenant(tenantId);
      const emailParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `MIME-Version: 1.0`,
        "",
        body
      ];
      const emailString = emailParts.join("\r\n");
      const raw = Buffer.from(emailString, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await client.gmail.api.drafts.create({
        userId: "me",
        draft: {
          message: { raw }
        }
      });
      if (res) {
        const draftId = res.id || Math.random().toString();
        return {
          id: draftId,
          from: "Draft",
          fromEmail: to || "receiver@ciel.app",
          subject: subject || "(Draft Subject)",
          body: body,
          date: "Draft",
          read: true,
          priority: "medium",
          category: "work",
        };
      }
    } catch (error) {
      console.error("[Corsair API] createDraft error, falling back:", error);
    }

    const draftEmail: Email = {
      id: Math.random().toString(),
      from: "Draft",
      fromEmail: to || "receiver@ciel.app",
      subject: subject || "(Draft Subject)",
      body: body,
      date: "Draft",
      read: true,
      priority: "medium",
      category: "work",
    };

    useCielStore.getState().addEmail(draftEmail);
    return draftEmail;
  }

  // calendar operations
  static async listCalendarEvents(tenantId?: string): Promise<CalendarEvent[]> {
    console.log(`[Corsair] Listing calendar events (tenant: ${tenantId})`);
    
    try {
      const client = this.getTenant(tenantId);
      const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago
      const res = await client.googlecalendar.api.events.getMany({
        calendarId: "primary",
        timeMin: timeMin,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100
      });
      if (res && res.items) {
        const events: CalendarEvent[] = res.items.map((item: any) => {
          const attendees = (item.attendees || []).map((a: any) => a.email || a.displayName || "");
          return {
            id: item.id || Math.random().toString(),
            title: item.summary || "No Title",
            start: item.start?.dateTime || item.start?.date || new Date().toISOString(),
            end: item.end?.dateTime || item.end?.date || new Date().toISOString(),
            location: item.location || "",
            attendees: attendees,
            description: item.description || "",
          };
        });
        return events;
      }
    } catch (error) {
      console.error("[Corsair API] listCalendarEvents error, falling back:", error);
    }

    return useCielStore.getState().calendarEvents;
  }

  static async createCalendarInvite(
    title: string,
    attendees: string[],
    start: string,
    end: string,
    location?: string,
    description?: string,
    tenantId?: string
  ): Promise<CalendarEvent> {
    console.log(`[Corsair] Creating invite: "${title}" on ${start} - ${end} (tenant: ${tenantId})`);

    try {
      const client = this.getTenant(tenantId);
      const attendeesList = attendees.map(email => ({ email }));
      const item = await client.googlecalendar.api.events.create({
        calendarId: "primary",
        event: {
          summary: title,
          description: description || "",
          location: location || "",
          start: {
            dateTime: start,
          },
          end: {
            dateTime: end,
          },
          attendees: attendeesList,
        }
      });
      if (item) {
        const returnedAttendees = (item.attendees || []).map((a: any) => a.email || "");
        return {
          id: item.id || Math.random().toString(),
          title: item.summary || title,
          start: item.start?.dateTime || item.start?.date || start,
          end: item.end?.dateTime || item.end?.date || end,
          location: item.location || location || "",
          attendees: returnedAttendees,
          description: item.description || description || "",
        };
      }
    } catch (error) {
      console.error("[Corsair API] createCalendarInvite error, falling back:", error);
    }

    const newEvent: CalendarEvent = {
      id: Math.random().toString(),
      title,
      start,
      end,
      location,
      attendees,
      description,
    };

    useCielStore.getState().addCalendarEvent(newEvent);
    return newEvent;
  }

  static async deleteCalendarEvent(eventId: string, tenantId?: string): Promise<boolean> {
    console.log(`[Corsair] Deleting calendar event: ${eventId} (tenant: ${tenantId})`);
    try {
      const client = this.getTenant(tenantId);
      await client.googlecalendar.api.events.delete({
        calendarId: "primary",
        id: eventId,
      });
      return true;
    } catch (error) {
      console.error("[Corsair API] deleteCalendarEvent error:", error);
    }
    return false;
  }

  static async updateCalendarEvent(
    eventId: string,
    title: string,
    start: string,
    end: string,
    location?: string,
    description?: string,
    tenantId?: string
  ): Promise<boolean> {
    console.log(`[Corsair] Updating calendar event: ${eventId} (tenant: ${tenantId})`);
    try {
      const client = this.getTenant(tenantId);
      const res = await client.googlecalendar.api.events.update({
        calendarId: "primary",
        id: eventId,
        event: {
          summary: title,
          start: { dateTime: start },
          end: { dateTime: end },
          location: location || "",
          description: description || "",
        }
      });
      if (res) {
        return true;
      }
    } catch (error) {
      console.error("[Corsair API] updateCalendarEvent error:", error);
    }
    return false;
  }

  static async listGmailMessagesDirectly(tenantId?: string, maxResults: number = 100, q: string = "label:INBOX"): Promise<any[]> {
    console.log(`[Corsair] Listing Gmail messages directly for tenant: ${tenantId} (query: ${q})`);
    try {
      const client = this.getTenant(tenantId);
      const res = await client.gmail.api.messages.list({
        userId: "me",
        maxResults: maxResults,
        includeSpamTrash: false,
        q: q
      });
      if (res && res.messages) {
        return res.messages;
      }
    } catch (error) {
      console.error("[Corsair API] listGmailMessagesDirectly error:", error);
    }
    return [];
  }

  static async getGmailMessageDirectly(messageId: string, tenantId?: string): Promise<any> {
    try {
      const client = this.getTenant(tenantId);
      const res = await client.gmail.api.messages.get({
        userId: "me",
        id: messageId
      });
      if (res) {
        return res;
      }
    } catch (error) {
      console.error(`[Corsair API] getGmailMessageDirectly error for ${messageId}:`, error);
    }
    return null;
  }

  static async markGmailMessageRead(messageId: string, tenantId?: string): Promise<boolean> {
    console.log(`[Corsair] Marking message read on Gmail: ${messageId} (tenant: ${tenantId})`);
    try {
      const client = this.getTenant(tenantId);
      const res = await client.gmail.api.messages.modify({
        userId: "me",
        id: messageId,
        removeLabelIds: ["UNREAD"]
      });
      return !!res;
    } catch (error) {
      console.error(`[Corsair API] markGmailMessageRead error for ${messageId}:`, error);
      return false;
    }
  }
}

