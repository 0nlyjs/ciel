import { useCielStore, Email, CalendarEvent } from "@/store/useCielStore";

// handles connection to corsair API or MCP server
// falls back to local zustand state if credentials are missing
export class CorsairClient {
  private static get apiKey() {
    return typeof process !== "undefined" ? process.env.CORSAIR_API_KEY : null;
  }

  // gmail operations
  static async searchEmails(query: string): Promise<Email[]> {
    console.log(`[Corsair] Searching emails for query: "${query}"`);
    
    if (this.apiKey) {
      // real api call would look like this:
      // const res = await fetch(`https://api.corsair.dev/v1/gmail/search?q=${encodeURIComponent(query)}`, {
      //   headers: { Authorization: `Bearer ${this.apiKey}` }
      // });
      // return res.json();
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
      // todo: send via real endpoint
      // await fetch("https://api.corsair.dev/v1/gmail/send", {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      //   body: JSON.stringify({ to, subject, body })
      // });
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
      // const res = await fetch("https://api.corsair.dev/v1/calendar/events", { ... });
      // return res.json();
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
      // const res = await fetch("https://api.corsair.dev/v1/calendar/events", { ... });
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
