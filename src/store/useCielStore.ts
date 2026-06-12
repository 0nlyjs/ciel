import { create } from "zustand";

export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  priority: "high" | "medium" | "low";
  category: "work" | "personal" | "updates" | "promotions";
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  location?: string;
  attendees?: string[];
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type CielStatus = "idle" | "thinking" | "speaking" | "listening" | "error";

interface CielState {
  // auth state
  user: { name: string; email: string } | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  updateUserName: (name: string) => void;

  // integration state
  gmailConnected: boolean;
  calendarConnected: boolean;
  fetchIntegrationStatus: () => Promise<void>;

  // view state
  activeTab: "overview" | "inbox" | "calendar" | "chat" | "settings";
  setActiveTab: (tab: "overview" | "inbox" | "calendar" | "chat" | "settings") => void;

  // email data
  emails: Email[];
  emailsTotal: number;
  emailsPage: number;
  emailsPerPage: number;
  selectedEmailIndex: number | null;
  searchQuery: string;
  setEmails: (emails: Email[]) => void;
  setEmailsPage: (page: number) => void;
  setSelectedEmailIndex: (index: number | null) => void;
  setSearchQuery: (query: string) => void;
  markAsRead: (id: string) => Promise<void>;
  archiveEmail: (id: string) => Promise<void>;
  addEmail: (email: Email) => void;

  // calendar data
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (events: CalendarEvent[]) => void;
  addCalendarEvent: (event: CalendarEvent) => void;

  // db synchronization actions
  fetchEmails: (forceSync?: boolean, page?: number) => Promise<void>;
  fetchCalendarEvents: () => Promise<void>;
  performSearch: (query: string) => Promise<void>;

  // chat state
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;

  // 3D face animation state
  cielStatus: CielStatus;
  setCielStatus: (status: CielStatus) => void;
  currentVolume: number; // voice volume level (0-1)
  setCurrentVolume: (vol: number) => void;
}

export const useCielStore = create<CielState>((set) => ({
  // auth state
  user: null,
  gmailConnected: false,
  calendarConnected: false,
  login: (name, email) => set({ user: { name, email } }),
  updateUserName: (name) => set((state) => ({ user: state.user ? { ...state.user, name } : null })),
  logout: () => set({
    user: null,
    activeTab: "overview",
    gmailConnected: false,
    calendarConnected: false,
    emails: [],
    emailsTotal: 0,
    emailsPage: 1,
    calendarEvents: [],
    selectedEmailIndex: null,
    searchQuery: "",
    chatMessages: [
      {
        id: "init",
        role: "assistant",
        content: "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Gmail and Google Calendar. How may I assist you with your inbox or schedule today?",
        timestamp: new Date(),
      },
    ],
    cielStatus: "idle",
    currentVolume: 0,
  }),

  // view state
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // email data (starts empty in real production environment)
  emails: [],
  emailsTotal: 0,
  emailsPage: 1,
  emailsPerPage: 50,
  selectedEmailIndex: null,
  searchQuery: "",
  setEmails: (emails) => set({ emails, selectedEmailIndex: emails.length > 0 ? 0 : null }),
  setEmailsPage: (page) => set({ emailsPage: page }),
  setSelectedEmailIndex: (index) => set({ selectedEmailIndex: index }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  markAsRead: async (id) => {
    // update local state first
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === id ? { ...email, read: true } : email
      ),
    }));
    // push to database
    try {
      await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", id }),
      });
    } catch (error) {
      console.error("[Store] Error marking email read in DB:", error);
    }
  },
  archiveEmail: async (id) => {
    // update local state first
    set((state) => {
      const filtered = state.emails.filter((email) => email.id !== id);
      return {
        emails: filtered,
        selectedEmailIndex:
          filtered.length > 0
            ? Math.min(state.selectedEmailIndex ?? 0, filtered.length - 1)
            : null,
      };
    });
    // push delete to database
    try {
      await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", id }),
      });
    } catch (error) {
      console.error("[Store] Error archiving email in DB:", error);
    }
  },
  addEmail: (email) =>
    set((state) => ({
      emails: [email, ...state.emails],
      selectedEmailIndex: 0,
    })),

  // calendar data (starts empty in real production environment)
  calendarEvents: [],
  setCalendarEvents: (events) => set({ calendarEvents: events }),
  addCalendarEvent: (event) =>
    set((state) => ({
      calendarEvents: [...state.calendarEvents, event].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
    })),

  // db synchronization actions
  fetchEmails: async (forceSync?: boolean, page?: number) => {
    try {
      const state = useCielStore.getState();
      const targetPage = page !== undefined ? page : state.emailsPage;
      const limit = state.emailsPerPage;
      const offset = (targetPage - 1) * limit;

      const queryParams = new URLSearchParams();
      if (forceSync) queryParams.set("sync", "true");
      queryParams.set("limit", limit.toString());
      queryParams.set("offset", offset.toString());

      const res = await fetch(`/api/emails?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.emails) {
          set({
            emails: data.emails,
            emailsTotal: data.total ?? data.emails.length,
            emailsPage: targetPage,
            selectedEmailIndex: data.emails.length > 0 ? 0 : null,
          });
        }
      }
    } catch (error) {
      console.error("[Store] Failed to fetch emails from database:", error);
    }
  },

  fetchCalendarEvents: async () => {
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data = await res.json();
        if (data.calendarEvents) {
          set({ calendarEvents: data.calendarEvents });
        }
      }
    } catch (error) {
      console.error("[Store] Failed to fetch calendar events from database:", error);
    }
  },

  performSearch: async (queryStr) => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryStr)}`);
      if (res.ok) {
        const data = await res.json();
        set({
          emails: data.emails || [],
          emailsTotal: data.emails?.length || 0,
          emailsPage: 1,
          calendarEvents: data.calendarEvents || [],
          selectedEmailIndex: data.emails && data.emails.length > 0 ? 0 : null,
        });
      }
    } catch (error) {
      console.error("[Store] Vector/ILIKE Search failed:", error);
    }
  },

  // chat data
  chatMessages: [
    {
      id: "init",
      role: "assistant",
      content: "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Gmail and Google Calendar. How may I assist you with your inbox or schedule today?",
      timestamp: new Date(),
    },
  ],
  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: Math.random().toString(),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        },
      ],
    })),
  clearChat: () => set({ chatMessages: [] }),

  // integration status action
  fetchIntegrationStatus: async () => {
    try {
      const res = await fetch("/api/auth/corsair/status");
      if (res.ok) {
        const data = await res.json();
        set({
          gmailConnected: !!data.gmailConnected,
          calendarConnected: !!data.calendarConnected,
        });
      }
    } catch (error) {
      console.error("[Store] Failed to fetch integration status:", error);
    }
  },

  // 3D face animation state
  cielStatus: "idle",
  setCielStatus: (status) => set({ cielStatus: status }),
  currentVolume: 0,
  setCurrentVolume: (vol) => set({ currentVolume: vol }),
}));
