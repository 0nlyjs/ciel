import { create } from "zustand";
import toast from "react-hot-toast";

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
  quickReplies?: string[] | null;
  contextTag?: string | null;
  labelIds?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  location?: string;
  attendees?: string[];
  description?: string;
  contextTag?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type CielStatus =
  | "idle"
  | "thinking"
  | "speaking"
  | "listening"
  | "error";

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
  setActiveTab: (
    tab: "overview" | "inbox" | "calendar" | "chat" | "settings",
  ) => void;

  // email data
  emails: Email[];
  emailsTotal: number;
  emailsPage: number;
  emailsPerPage: number;
  emailsHasMore: boolean;
  selectedEmailIndex: number | null;
  searchQuery: string;
  activeFolder: "all" | "sent";
  setEmails: (emails: Email[]) => void;
  setEmailsPage: (page: number) => void;
  setSelectedEmailIndex: (index: number | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveFolder: (folder: "all" | "sent") => void;
  markAsRead: (id: string) => Promise<void>;
  archiveEmail: (id: string) => Promise<void>;
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;

  // calendar data
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (events: CalendarEvent[]) => void;
  addCalendarEvent: (event: CalendarEvent) => void;

  // db synchronization actions
  fetchEmails: (forceSync?: boolean, page?: number) => Promise<void>;
  fetchCalendarEvents: () => Promise<void>;
  performSearch: (query: string) => Promise<void>;
  loadEmailsFromCache: () => void;

  // chat state
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;

  // 3D face animation state
  cielStatus: CielStatus;
  setCielStatus: (status: CielStatus) => void;
  currentVolume: number; // voice volume level (0-1)
  setCurrentVolume: (vol: number) => void;

  // settings state
  syncInterval: number;
  aiAutoPriority: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (
    settings: Partial<{
      syncInterval: number;
      aiAutoPriority: boolean;
    }>,
  ) => Promise<void>;

  // local integrations list
  localIntegrations: Array<{
    id: number;
    provider: string;
    connected_email: string;
    status: string;
  }>;
  fetchLocalIntegrations: () => Promise<void>;

  // grouped selectors
  getEmailsByContext: () => Record<string, Email[]>;
  getEventsByContext: () => Record<string, CalendarEvent[]>;

  // 3D Canvas states
  isSyncing: boolean;
  isSearching: boolean;

  // calendar date state
  selectedDate: Date | null;
  initializeClientDate: () => void;
}

export const useCielStore = create<CielState>((set, get) => ({
  // 3D Canvas states initial values
  isSyncing: false,
  isSearching: false,

  // calendar date state initial values
  selectedDate: null,
  initializeClientDate: () => set({ selectedDate: new Date() }),

  // auth state
  user: null,
  gmailConnected: false,
  calendarConnected: false,
  login: (name, email) => set({ user: { name, email } }),
  updateUserName: (name) =>
    set((state) => ({ user: state.user ? { ...state.user, name } : null })),
  logout: () =>
    set({
      user: null,
      activeTab: "overview",
      gmailConnected: false,
      calendarConnected: false,
      emails: [],
      emailsTotal: 0,
      emailsPage: 1,
      emailsHasMore: true,
      calendarEvents: [],
      selectedEmailIndex: null,
      searchQuery: "",
      activeFolder: "all",
      chatMessages: [
        {
          id: "init",
          role: "assistant",
          content:
            "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Gmail and Google Calendar. How may I assist you with your inbox or schedule today?",
          timestamp: new Date(),
        },
      ],
      cielStatus: "idle",
      currentVolume: 0,
      selectedDate: null,
    }),

  // view state
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // email data (starts empty in real production environment)
  emails: [],
  emailsTotal: 0,
  emailsPage: 1,
  emailsPerPage: 50,
  emailsHasMore: true,
  selectedEmailIndex: null,
  searchQuery: "",
  activeFolder: "all",
  setEmails: (emails) =>
    set({ emails, selectedEmailIndex: emails.length > 0 ? 0 : null }),
  setEmailsPage: (page) => set({ emailsPage: page }),
  setSelectedEmailIndex: (index) => set({ selectedEmailIndex: index }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveFolder: (folder) => {
    set({
      activeFolder: folder,
      emails: [],
      emailsTotal: 0,
      emailsPage: 1,
      emailsHasMore: true,
      selectedEmailIndex: null,
    });
  },
  markAsRead: async (id) => {
    await useCielStore.getState().updateEmail(id, { read: true });
  },
  archiveEmail: async (id) => {
    await useCielStore.getState().deleteEmail(id);
  },
  updateEmail: async (id, updates) => {
    // Step A: Save current state to temporary variable
    const currentEmails = useCielStore.getState().emails;
    const targetEmail = currentEmails.find((email) => email.id === id);
    if (!targetEmail) return;

    // Step B: Immediately update emails array in Zustand store
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === id ? { ...email, ...updates } : email,
      ),
    }));

    // Step C: Make the actual fetch call to PATCH /api/emails
    try {
      const res = await fetch("/api/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update email status: ${res.statusText}`);
      }
    } catch (error: any) {
      // Step D: Revert state using temporary variable and notify via toast
      console.error("[Store] Error updating email, reverting...", error);
      set({ emails: currentEmails });
      toast.error(`Failed to update email: ${error.message || error}`);
    }
  },
  deleteEmail: async (id) => {
    // Step A: Save current state to temporary variables
    const currentEmails = useCielStore.getState().emails;
    const currentSelectedIndex = useCielStore.getState().selectedEmailIndex;
    const targetEmail = currentEmails.find((email) => email.id === id);
    if (!targetEmail) return;

    // Step B: Immediately update emails array (trashing)
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

    // Step C: Make the actual fetch call to DELETE /api/emails
    try {
      const res = await fetch("/api/emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error(`Failed to delete email: ${res.statusText}`);
      }
    } catch (error: any) {
      // Step D: Revert state using temporary variables and notify via toast
      console.error("[Store] Error deleting email, reverting...", error);
      set({
        emails: currentEmails,
        selectedEmailIndex: currentSelectedIndex,
      });
      toast.error(`Failed to delete email: ${error.message || error}`);
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
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    })),

  fetchEmails: async (forceSync?: boolean, page?: number) => {
    if (forceSync) set({ isSyncing: true });
    try {
      const state = useCielStore.getState();
      const targetPage = page !== undefined ? page : state.emailsPage;
      const limit = state.emailsPerPage;
      const offset = (targetPage - 1) * limit;

      const queryParams = new URLSearchParams();
      if (forceSync) queryParams.set("sync", "true");
      queryParams.set("limit", limit.toString());
      queryParams.set("offset", offset.toString());
      queryParams.set("sync_limit", (targetPage * limit).toString());
      queryParams.set("folder", state.activeFolder);
      queryParams.set("t", Date.now().toString()); // Cache buster

      const res = await fetch(`/api/emails?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Discard response if active folder changed in-flight to prevent race conditions
        if (useCielStore.getState().activeFolder !== state.activeFolder) {
          console.warn(`[Store] Discarding fetchEmails response: folder changed from ${state.activeFolder} to ${useCielStore.getState().activeFolder}`);
          return;
        }
        if (data.emails) {
          set({
            emails: data.emails,
            emailsTotal: data.total ?? data.emails.length,
            emailsPage: targetPage,
            emailsHasMore: data.hasMore !== undefined ? !!data.hasMore : true,
            selectedEmailIndex: data.emails.length > 0 ? 0 : null,
          });

          // Cache first page to localStorage
          if (targetPage === 1 && typeof window !== "undefined") {
            try {
              const recent200 = data.emails.slice(0, 200);
              localStorage.setItem(
                `ciel_emails_cache_${state.activeFolder}`,
                JSON.stringify(recent200),
              );
            } catch (cacheErr) {
              console.error("[Store] Failed to cache emails:", cacheErr);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Store] Failed to fetch emails from database:", error);
    } finally {
      if (forceSync) set({ isSyncing: false });
    }
  },

  loadEmailsFromCache: () => {
    if (typeof window !== "undefined") {
      try {
        const folder = get().activeFolder;
        const cached = localStorage.getItem(`ciel_emails_cache_${folder}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            const limit = get().emailsPerPage;
            const initialEmails = parsed.slice(0, limit);
            set({
              emails: initialEmails,
              emailsTotal: parsed.length,
              emailsPage: 1,
              emailsHasMore: parsed.length > limit,
              selectedEmailIndex: 0,
            });
            console.log(
              `[Store] Restored ${initialEmails.length} cached emails for folder ${folder}`,
            );
          }
        }
      } catch (e) {
        console.error("Failed to load cached emails:", e);
      }
    }
  },

  fetchCalendarEvents: async () => {
    try {
      const res = await fetch(`/api/calendar?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.calendarEvents) {
          set({ calendarEvents: data.calendarEvents });
        }
      }
    } catch (error) {
      console.error(
        "[Store] Failed to fetch calendar events from database:",
        error,
      );
    }
  },

  performSearch: async (queryStr) => {
    set({ isSearching: true });
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
    } finally {
      set({ isSearching: false });
    }
  },

  // chat data
  chatMessages: [
    {
      id: "init",
      role: "assistant",
      content:
        "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Gmail and Google Calendar. How may I assist you with your inbox or schedule today?",
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

  // settings default state
  syncInterval: 60,
  aiAutoPriority: true,
  localIntegrations: [],

  fetchSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        set({
          syncInterval: data.sync_interval_minutes || 60,
          aiAutoPriority:
            data.ai_auto_priority !== undefined
               ? !!data.ai_auto_priority
               : true,
        });
      }
    } catch (error) {
      console.error("[Store] Failed to fetch settings:", error);
    }
  },

  updateSettings: async (settings) => {
    const state = get();
    // update locally first
    set((state) => ({
      syncInterval:
        settings.syncInterval !== undefined
          ? settings.syncInterval
          : state.syncInterval,
      aiAutoPriority:
        settings.aiAutoPriority !== undefined
          ? settings.aiAutoPriority
          : state.aiAutoPriority,
    }));

    // push to API
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sync_interval_minutes:
            settings.syncInterval !== undefined
              ? settings.syncInterval
              : state.syncInterval,
          ai_auto_priority:
            settings.aiAutoPriority !== undefined
              ? settings.aiAutoPriority
              : state.aiAutoPriority,
        }),
      });
    } catch (error) {
      console.error("[Store] Failed to save settings:", error);
    }
  },

  fetchLocalIntegrations: async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        set({ localIntegrations: data.integrations || [] });
      }
    } catch (error) {
      console.error("[Store] Failed to fetch local integrations:", error);
    }
  },

  // 3D face animation state
  cielStatus: "idle",
  setCielStatus: (status) => set({ cielStatus: status }),
  currentVolume: 0,
  setCurrentVolume: (vol) => set({ currentVolume: vol }),

  getEmailsByContext: () => {
    const emailsList = get().emails;
    const grouped: Record<string, Email[]> = {};
    emailsList.forEach((email) => {
      const tag = email.contextTag || "General";
      if (!grouped[tag]) grouped[tag] = [];
      grouped[tag].push(email);
    });
    return grouped;
  },

  getEventsByContext: () => {
    const eventsList = get().calendarEvents;
    const grouped: Record<string, CalendarEvent[]> = {};
    eventsList.forEach((event) => {
      const tag = event.contextTag || "General";
      if (!grouped[tag]) grouped[tag] = [];
      grouped[tag].push(event);
    });
    return grouped;
  },
}));
