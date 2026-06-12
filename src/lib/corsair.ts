import { useCielStore, Email, CalendarEvent } from "@/store/useCielStore";

// handles connection to corsair API or MCP server
// falls back to local zustand state if credentials are missing
export class CorsairClient {
  private static get apiKey() {
    return typeof process !== "undefined"
      ? (process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY)
      : null;
  }

  // gmail operations
  static async searchEmails(query: string): Promise<Email[]> {
    console.log(`[Corsair] Searching emails for query: "${query}"`);
    
    if (this.apiKey) {
      try {
        const res = await fetch(`https://api.corsair.dev/v1/gmail/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` }
        });
        if (res.ok) {
          const data = await res.json();
          return data.emails || data;
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

  static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[Corsair] Sending email to: ${to}, subject: "${subject}"`);

    if (this.apiKey) {
      try {
        const res = await fetch("https://api.corsair.dev/v1/gmail/send", {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${this.apiKey}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ to, subject, body })
        });
        if (res.ok) {
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

  static async createDraft(to: string, subject: string, body: string): Promise<Email> {
    console.log(`[Corsair] Creating draft for: ${to}`);

    if (this.apiKey) {
      try {
        const res = await fetch("https://api.corsair.dev/v1/gmail/draft", {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${this.apiKey}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ to, subject, body })
        });
        if (res.ok) {
          const data = await res.json();
          return data.draft || data;
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
  static async listCalendarEvents(): Promise<CalendarEvent[]> {
    console.log("[Corsair] Listing calendar events");
    if (this.apiKey) {
      try {
        const res = await fetch("https://api.corsair.dev/v1/calendar/events", {
          headers: { Authorization: `Bearer ${this.apiKey}` }
        });
        if (res.ok) {
          const data = await res.json();
          return data.events || data;
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
    description?: string
  ): Promise<CalendarEvent> {
    console.log(`[Corsair] Creating invite: "${title}" on ${start} - ${end}`);

    if (this.apiKey) {
      try {
        const res = await fetch("https://api.corsair.dev/v1/calendar/events", {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${this.apiKey}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ title, start, end, location, description, attendees })
        });
        if (res.ok) {
          const data = await res.json();
          return data.event || data;
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
}
