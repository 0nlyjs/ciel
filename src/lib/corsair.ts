import { useCielStore, Email, CalendarEvent } from "@/store/useCielStore";
import { createClient } from "@corsair-dev/app";

// handles connection to corsair API or MCP server
// falls back to local zustand state if credentials are missing
export class CorsairClient {
  private static get apiKey() {
    return typeof process !== "undefined"
      ? (process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY)
      : null;
  }

  private static getClient() {
    const key = this.apiKey;
    if (!key) return null;
    return createClient({ apiKey: key });
  }

  private static cachedTenant: any = null;
  private static cachedTenantId: string = "";
  private static cachedInstanceId: string = "";

  private static async getTenant(tenantId?: string) {
    const resolvedTenantId = tenantId || "guest@ciel.app";
    if (this.cachedTenant && this.cachedTenantId === resolvedTenantId) {
      return this.cachedTenant;
    }

    const client = this.getClient();
    if (!client) return null;
    try {
      const targetId = process.env.CORSAIR_INSTANCE_ID;
      
      console.log(`[Corsair getTenant] Resolving tenant. targetId=${targetId}, cachedInstanceId=${this.cachedInstanceId}`);
      
      // If we have a cached UUID, use it directly!
      if (this.cachedInstanceId) {
        console.log(`[Corsair getTenant] Using cached instance UUID: ${this.cachedInstanceId}`);
        const tenant = client.instance(this.cachedInstanceId).tenant(resolvedTenantId);
        this.cachedTenant = tenant;
        this.cachedTenantId = resolvedTenantId;
        return tenant;
      }

      // Otherwise, list instances to resolve it (only happens once)
      console.log("[Corsair getTenant] Listing instances to resolve name...");
      const { instances } = await client.instances.list();
      let targetInstance = null;
      if (targetId) {
        targetInstance = instances.find(
          (inst) => inst.id === targetId || inst.name === targetId
        );
      }

      // Fallback: look for active instance, then default to first
      if (!targetInstance) {
        targetInstance = instances.find(inst => inst.status === "active") || instances[0];
      }

      if (!targetInstance) {
        console.warn("[Corsair getTenant] No instances found!");
        return null;
      }

      console.log(`[Corsair getTenant] Resolved instance to ID: ${targetInstance.id} (Name: ${targetInstance.name})`);

      // Cache the resolved UUID for subsequent calls
      this.cachedInstanceId = targetInstance.id;

      const tenant = client.instance(targetInstance.id).tenant(resolvedTenantId);
      this.cachedTenant = tenant;
      this.cachedTenantId = resolvedTenantId;
      return tenant;
    } catch (e) {
      console.error("[Corsair SDK] Failed to get tenant:", e);
      return null;
    }
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
    let body = "";
    if (part.mimeType === "text/plain" && part.body?.data) {
      body = this.base64urlDecode(part.body.data);
    } else if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        const subBody = this.extractBody(subPart);
        if (subBody) {
          body += (body ? "\n" : "") + subBody;
        }
      }
    }
    return body;
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
    
    const tenant = await this.getTenant(tenantId);
    if (tenant) {
      try {
        const filter = query ? {
          or: [
            { subject: { contains: query } },
            { body: { contains: query } },
            { from: { contains: query } }
          ]
        } : undefined;

        const res = (await tenant.run("gmail.db.messages.search", {
          data: filter,
          limit: 100
        })) as any;

        if (res.success && res.data) {
          const emails: Email[] = [];
          for (const msg of res.data) {
            const data = msg.data || msg;
            let fullMsg = data;
            
            // If it's a skeleton record (missing body, payload, subject, etc.), fetch details live
            if (!data.payload && !data.from && !data.subject) {
              try {
                const liveMsgRes = await tenant.run("gmail.api.messages.get", {
                  userId: "me",
                  id: msg.entity_id || msg.id || data.id
                });
                if (liveMsgRes.success && liveMsgRes.data) {
                  fullMsg = liveMsgRes.data;
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

    const tenant = await this.getTenant(tenantId);
    if (tenant) {
      try {
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

        const res = await tenant.run("gmail.api.messages.send", {
          userId: "me",
          raw: raw
        });
        if (res.success) {
          return true;
        }
      } catch (error) {
        console.error("[Corsair API] sendEmail error, falling back:", error);
      }
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

    const tenant = await this.getTenant(tenantId);
    if (tenant) {
      try {
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

        const res = await tenant.run("gmail.api.drafts.create", {
          userId: "me",
          draft: {
            message: { raw }
          }
        });
        if (res.success && res.data) {
          const draftId = (res.data as any).id || Math.random().toString();
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
    
    const tenant = await this.getTenant(tenantId);
    if (tenant) {
      try {
        const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago
        const res = (await tenant.run("googlecalendar.api.events.getMany", {
          calendarId: "primary",
          timeMin: timeMin,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100
        })) as any;
        if (res.success && res.data && res.data.items) {
          const events: CalendarEvent[] = res.data.items.map((item: any) => {
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

    const tenant = await this.getTenant(tenantId);
    if (tenant) {
      try {
        const attendeesList = attendees.map(email => ({ email }));
        const res = await tenant.run("googlecalendar.api.events.create", {
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
        if (res.success && res.data) {
          const item = res.data as any;
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

  static async listGmailMessagesDirectly(tenantId?: string, maxResults: number = 100): Promise<any[]> {
    console.log(`[Corsair] Listing Gmail messages directly for tenant: ${tenantId}`);
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return [];
    try {
      const res = (await tenant.run("gmail.api.messages.list", {
        userId: "me",
        maxResults: maxResults,
        includeSpamTrash: false
      })) as any;
      if (res.success && res.data && res.data.messages) {
        return res.data.messages;
      }
    } catch (error) {
      console.error("[Corsair API] listGmailMessagesDirectly error:", error);
    }
    return [];
  }

  static async getGmailMessageDirectly(messageId: string, tenantId?: string): Promise<any> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return null;
    try {
      const res = await tenant.run("gmail.api.messages.get", {
        userId: "me",
        id: messageId
      });
      if (res.success && res.data) {
        return res.data;
      }
    } catch (error) {
      console.error(`[Corsair API] getGmailMessageDirectly error for ${messageId}:`, error);
    }
    return null;
  }

  static async markGmailMessageRead(messageId: string, tenantId?: string): Promise<boolean> {
    console.log(`[Corsair] Marking message read on Gmail: ${messageId} (tenant: ${tenantId})`);
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return false;
    try {
      const res = await tenant.run("gmail.api.messages.modify", {
        userId: "me",
        id: messageId,
        removeLabelIds: ["UNREAD"]
      });
      return !!res.success;
    } catch (error) {
      console.error(`[Corsair API] markGmailMessageRead error for ${messageId}:`, error);
      return false;
    }
  }
}
