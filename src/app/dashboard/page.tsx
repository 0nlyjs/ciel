"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCielStore } from "@/store/useCielStore";
import { useSession } from "@/lib/auth-client";
import toast from "react-hot-toast";

// Sub-components
import { DashboardLayout } from "./_components/DashboardLayout";
import { Sidebar } from "./_components/Sidebar";
import { InboxTab } from "./_components/InboxTab";
import { CalendarTab } from "./_components/CalendarTab";
import { ChatTab } from "./_components/ChatTab";
import { SettingsTab } from "./_components/SettingsTab";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Zustand State & Actions
  const user = useCielStore((s) => s.user);
  const login = useCielStore((s) => s.login);
  const logout = useCielStore((s) => s.logout);
  const activeTab = useCielStore((s) => s.activeTab);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const fetchIntegrationStatus = useCielStore((s) => s.fetchIntegrationStatus);
  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const fetchCalendarEvents = useCielStore((s) => s.fetchCalendarEvents);
  const loadEmailsFromCache = useCielStore((s) => s.loadEmailsFromCache);
  const selectedDate = useCielStore((s) => s.selectedDate);
  const initializeClientDate = useCielStore((s) => s.initializeClientDate);
  const fetchSettings = useCielStore((s) => s.fetchSettings);
  const fetchLocalIntegrations = useCielStore((s) => s.fetchLocalIntegrations);
  const syncInterval = useCielStore((s) => s.syncInterval);
  const isDark = true;

  // Modals / global states
  const [mounted, setMounted] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Custom confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger = false,
  ) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      },
      isDanger,
    });
  };

  const updateUserName = useCielStore((s) => s.updateUserName);
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const localIntegrations = useCielStore((s) => s.localIntegrations);

  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSendingCompose, setIsSendingCompose] = useState(false);

  // Initialize profile name when user changes
  useEffect(() => {
    if (user?.name) {
      setProfileName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() }),
      });
      if (res.ok) {
        updateUserName(profileName.trim());
        toast.success("Profile name updated successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDisconnectPlugin = async (plugin: "gmail" | "googlecalendar") => {
    requestConfirm(
      "Disconnect Integration",
      `Are you sure you want to disconnect ${plugin === "gmail" ? "Gmail" : "Google Calendar"}?`,
      async () => {
        try {
          const res = await fetch("/api/auth/corsair/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plugin }),
          });
          if (res.ok) {
            toast.success(
              `${plugin === "gmail" ? "Gmail" : "Google Calendar"} disconnected successfully.`,
            );
            fetchIntegrationStatus();
            fetchLocalIntegrations();
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to disconnect");
          }
        } catch (err) {
          console.error(err);
          toast.error("Error disconnecting integration");
        }
      },
    );
  };

  const handleConnectPlugin = async (plugin: "gmail" | "googlecalendar") => {
    try {
      const res = await fetch(`/api/auth/corsair/connect?plugin=${plugin}`);
      const data = await res.json();
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        toast.error("Failed to fetch connection URL");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error starting connection flow");
    }
  };

  const handleClearWorkspaceData = async () => {
    requestConfirm(
      "Clear Workspace Cache",
      "Are you sure you want to clear your local workspace cache? This will delete all emails, calendar events, and chat histories from our database (Google account data remains untouched).",
      async () => {
        setIsClearingData(true);
        try {
          const res = await fetch("/api/auth/profile/clear-data", {
            method: "POST",
          });
          if (res.ok) {
            toast.success("Local database cache cleared successfully!");
            await fetchEmails(false);
            await fetchCalendarEvents(false);
            useCielStore.getState().clearChat();
            router.refresh();
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to clear workspace data");
          }
        } catch (err) {
          console.error(err);
          toast.error("Error clearing data");
        } finally {
          setIsClearingData(false);
        }
      },
      true,
    );
  };

  const handleDeleteAccount = async () => {
    requestConfirm(
      "Delete Ciel Account",
      "CRITICAL ACTION: Are you sure you want to delete your Ciel account? This will permanently delete your user account and all connected records. This action cannot be undone.",
      async () => {
        setIsDeletingAccount(true);
        try {
          const res = await fetch("/api/auth/profile/delete", {
            method: "POST",
          });
          if (res.ok) {
            toast.success("Account deleted successfully.");
            const { signOut } = await import("@/lib/auth-client");
            await signOut({
              fetchOptions: {
                onSuccess: () => {
                  logout();
                  router.push("/");
                },
              },
            });
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to delete account");
          }
        } catch (err) {
          console.error(err);
          toast.error("Error deleting account");
        } finally {
          setIsDeletingAccount(false);
        }
      },
      true,
    );
  };

  // Auth Redirect Guard
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize client date and schedule midnight rollover sync
  useEffect(() => {
    if (!selectedDate) {
      initializeClientDate();
      return;
    }

    const calculateMsUntilMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0,
      );
      return nextMidnight.getTime() - now.getTime();
    };

    const msToMidnight = calculateMsUntilMidnight();
    console.log(`[Calendar] Midnight rollover timer set for ${msToMidnight}ms`);

    const timer = setTimeout(() => {
      console.log("[Calendar] Midnight reached, updating store client date.");
      initializeClientDate();
    }, msToMidnight);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedDate, initializeClientDate]);

  // Sync Better Auth session state with Zustand store
  useEffect(() => {
    if (session?.user) {
      const name = session.user.name || "User";
      const email = session.user.email || "";
      if (!user || user.email !== email || user.name !== name) {
        login(name, email);
      }
    }
  }, [session, user, login]);

  // Load initial data on dashboard mount
  useEffect(() => {
    if (session) {
      loadEmailsFromCache();
      fetchIntegrationStatus();
      fetchSettings();
      fetchLocalIntegrations();

      // Check if we just redirected from OAuth connection successfully
      let isOAuthSuccess = false;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get("connected");
        if (connected === "gmail") {
          isOAuthSuccess = true;
          window.history.replaceState({}, "", "/dashboard");
          setActiveTab("inbox");
          toast.success("Gmail connected successfully! Starting sync...");
          fetchEmails(true);
        } else if (connected === "googlecalendar") {
          isOAuthSuccess = true;
          window.history.replaceState({}, "", "/dashboard");
          setActiveTab("calendar");
          toast.success("Calendar connected successfully!");
          fetchCalendarEvents(true);
        }
      }

      if (!isOAuthSuccess) {
        fetchEmails();
        fetchCalendarEvents(true);
      }
    }
  }, [
    session,
    fetchIntegrationStatus,
    fetchSettings,
    fetchLocalIntegrations,
    fetchEmails,
    fetchCalendarEvents,
    loadEmailsFromCache,
    setActiveTab,
  ]);

  // Real-time Event Stream Listener (SSE)
  useEffect(() => {
    if (!session || !user?.email) return;

    console.log("[EventSource] Connecting to Server-Sent Events stream...");
    const eventSource = new EventSource("/api/sync/stream");

    eventSource.onmessage = async (event) => {
      console.log("[EventSource] Event received:", event.data);
      if (event.data === "new_email") {
        console.log("[EventSource] Syncing new email...");
        try {
          await fetchEmails(true);
        } catch (e) {
          console.error("SSE fetchEmails error:", e);
        }
      } else if (event.data === "sync_complete") {
        console.log(
          "[EventSource] Sync complete. Fetching updated list from database...",
        );
        try {
          await fetchEmails(false);
          router.refresh();
        } catch (e) {
          console.error("SSE sync_complete fetchEmails error:", e);
        }
      } else if (event.data === "new_calendar") {
        console.log("[EventSource] Syncing calendar events...");
        try {
          await fetchCalendarEvents();
          router.refresh();
        } catch (e) {
          console.error("SSE fetchCalendarEvents error:", e);
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error(
        "[EventSource] Error in event stream, reconnecting:",
        error,
      );
    };

    return () => {
      console.log("[EventSource] Closing Server-Sent Events stream...");
      eventSource.close();
    };
  }, [session, user?.email, fetchEmails, fetchCalendarEvents, router]);

  // Periodic Background Hard Sync Timer based on syncInterval setting
  useEffect(() => {
    if (!session || !user?.email || !syncInterval) return;

    const intervalMs = syncInterval * 60 * 1000;
    console.log(
      `[Sync Timer] Starting periodic hard sync every ${syncInterval} minutes (${intervalMs}ms)`,
    );

    const performHardSync = async () => {
      console.log(`[Sync Timer] Hard sync triggered for ${user.email}...`);
      try {
        // Hard sync Gmail
        await fetchEmails(true);
        // Hard sync Calendar
        await fetchCalendarEvents();
        console.log("[Sync Timer] Hard sync completed successfully.");
      } catch (err) {
        console.error("[Sync Timer] Hard sync failed:", err);
      }
    };

    const timer = setInterval(performHardSync, intervalMs);

    return () => {
      console.log(
        `[Sync Timer] Clearing periodic sync timer for ${user.email}`,
      );
      clearInterval(timer);
    };
  }, [session, user?.email, syncInterval, fetchEmails, fetchCalendarEvents]);

  // Listen for global custom event trigger
  useEffect(() => {
    const handleComposeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { to, subject, body } = customEvent.detail || {};
      handleInitiateCompose(to || "", subject || "");
      if (body) {
        setComposeBody(body);
      }
    };
    window.addEventListener("ciel-compose", handleComposeEvent);
    return () => window.removeEventListener("ciel-compose", handleComposeEvent);
  }, []);

  // Listen for Cmd+K or Ctrl+K to open chat and close open modals
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveTab("chat");
        setShowShortcutsModal(false);
        setShowProfileModal(false);
        setShowComposeModal(false);
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [setActiveTab]);

  const handleInitiateCompose = (to = "", subject = "", body = "") => {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeBody(body);
    setShowComposeModal(true);
  };

  const handleSendComposeMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !composeTo.trim() ||
      !composeSubject.trim() ||
      !composeBody.trim() ||
      isSendingCompose
    )
      return;

    setIsSendingCompose(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
      });

      if (res.ok) {
        setShowComposeModal(false);
        fetchEmails(true, 1);
        toast.success("Email sent successfully!");
      } else {
        const data = await res.json();
        alert("Failed to send email: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to send email", err);
      alert("Error sending email.");
    } finally {
      setIsSendingCompose(false);
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Switch statement rendering the tabs based on activeTab
  const renderTab = () => {
    switch (activeTab) {
      case "chat":
        return <ChatTab />;
      case "inbox":
        return <InboxTab onInitiateCompose={handleInitiateCompose} />;
      case "calendar":
        return <CalendarTab onInitiateCompose={handleInitiateCompose} />;
      case "settings":
        return <SettingsTab />;
      default:
        return <ChatTab />;
    }
  };

  const borderClass = isDark ? "border-white/5" : "border-white/20";
  const border900Class = isDark ? "border-white/10" : "border-white/30";
  const cardBgClass = isDark
    ? "bg-transparent backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
    : "bg-transparent backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]";
  const inputBgClass = isDark
    ? "bg-black/20 focus:bg-black/35 border-white/10 focus:border-purple-500/50 text-white"
    : "bg-white/35 focus:bg-white/55 border-white/40 focus:border-cyan-500/50 text-slate-900";
  const accordionHeaderBgClass = isDark ? "bg-black/15" : "bg-white/20";

  return (
    <DashboardLayout
      sidebar={
        <Sidebar
          onShowShortcuts={() => setShowShortcutsModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
      }
    >
      {renderTab()}

      {/* Compose Email Modal - Gmail-Style Floating Box */}
      {showComposeModal && (
        <div
          className="fixed bottom-4 right-4 z-50 w-full max-w-lg rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col min-h-[420px] max-h-[550px] bg-black/60 backdrop-blur-2xl transition-all duration-300 transform scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20"
          >
            <h3
              className="text-xs font-black text-white uppercase tracking-wider leading-tight"
            >
              Compose New Message
            </h3>
            <button
              onClick={() => setShowComposeModal(false)}
              className="text-white/60 hover:text-white font-bold text-lg cursor-pointer transition-colors"
            >
              ×
            </button>
          </div>
          <form
            onSubmit={handleSendComposeMail}
            className="flex-1 flex flex-col p-4 space-y-4"
          >
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-extrabold tracking-wider">
                To:
              </label>
              <input
                type="email"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="recipient@example.com"
                required
                className="w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 bg-white/5 focus:bg-white/10 border-white/10 focus:border-purple-500/50 text-white placeholder-white/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-extrabold tracking-wider">
                Subject:
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Enter email subject"
                required
                className="w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 bg-white/5 focus:bg-white/10 border-white/10 focus:border-purple-500/50 text-white placeholder-white/30"
              />
            </div>
            <div className="flex-1 flex flex-col space-y-1">
              <label className="text-[10px] text-white/50 uppercase font-extrabold tracking-wider">
                Message:
              </label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message here..."
                rows={8}
                required
                className="flex-1 text-xs p-3 outline-none rounded-xl border transition-all duration-300 bg-white/5 focus:bg-white/10 border-white/10 focus:border-purple-500/50 text-white placeholder-white/30 resize-none"
              />
            </div>
            <div
              className="pt-3 border-t border-white/10 flex justify-end gap-2 shrink-0"
            >
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="px-3.5 py-2 text-white/60 hover:text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSendingCompose ||
                  !composeTo.trim() ||
                  !composeSubject.trim() ||
                  !composeBody.trim()
                }
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-white/5 disabled:text-white/20 text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-all"
              >
                {isSendingCompose ? "Sending..." : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[10px] p-4 animate-in fade-in duration-200"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className={`w-full max-w-2xl border ${
              isDark
                ? "bg-white/[0.06] border-white/10 text-white"
                : "bg-white/45 border-white/50 text-slate-900"
            } backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-6 space-y-5 transition-transform duration-300 transform scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/20 dark:border-white/5 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">⌨️</span>
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Ciel Workspace Mind Console
                  </h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Keyboard & NLP Commands Directory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-3.5 py-1.5 text-xs bg-slate-200/50 dark:bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent rounded-lg text-slate-500 uppercase font-bold transition-all cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Direct System Hotkeys */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-200/20 dark:border-white/5 pb-1">
                  ⌨️ Active Hotkeys
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-sm">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">
                        Focus AI Chat
                      </span>
                      <span className="text-xs text-slate-500">
                        Switch to AI Chat console on dashboard
                      </span>
                    </div>
                    <kbd className="px-2.5 py-1 bg-slate-800 text-xs text-slate-300 rounded-lg border border-slate-700 font-mono font-bold shrink-0">
                      ⌘ K / Ctrl K
                    </kbd>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-sm">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">
                        AI Quick Reply badges
                      </span>
                      <span className="text-xs text-slate-500">
                        Insert AI reply 1, 2, or 3 from expanded mail
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <kbd className="px-2 py-0.5 bg-slate-800 text-xs text-slate-300 rounded-lg border border-slate-700 font-mono font-bold">
                        1
                      </kbd>
                      <kbd className="px-2 py-0.5 bg-slate-800 text-xs text-slate-300 rounded-lg border border-slate-700 font-mono font-bold">
                        2
                      </kbd>
                      <kbd className="px-2 py-0.5 bg-slate-800 text-xs text-slate-300 rounded-lg border border-slate-700 font-mono font-bold">
                        3
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-sm">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">
                        Close Panels / Modals
                      </span>
                      <span className="text-xs text-slate-500">
                        Instantly dismiss active popup or palette
                      </span>
                    </div>
                    <kbd className="px-2.5 py-1 bg-slate-800 text-xs text-slate-300 rounded-lg border border-slate-700 font-mono font-bold shrink-0">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Right Column: Command Palette NLP Capabilities */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-slate-200/20 dark:border-white/5 pb-1">
                  🧠 AI Command Examples
                </h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-xs text-cyan-400 font-semibold block uppercase">
                      🌐 Navigation
                    </span>
                    <span className="text-slate-400">"Go to calendar"</span>
                    <span className="text-slate-500 block text-[10px]">
                      Options: overview, inbox, calendar, chat, settings
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-xs text-purple-400 font-semibold block uppercase">
                      🔍 Deep Vector Search
                    </span>
                    <span className="text-slate-400">
                      "Search for meeting notes"
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-xs text-pink-400 font-semibold block uppercase">
                      ✉️ Smart Compose draft
                    </span>
                    <span className="text-slate-400">
                      "Compose to name@domain.com"
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-xs text-amber-400 font-semibold block uppercase">
                      ⏳ Smart Operations
                    </span>
                    <span className="text-slate-400">
                      "Snooze this email until tomorrow"
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[10px] p-4 animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="w-full max-w-lg border border-white/10 bg-white/[0.06] backdrop-blur-md text-white rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-6 space-y-6 transition-transform duration-300 transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-sm font-black tracking-widest uppercase text-white">
                Profile
              </span>
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-3.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 uppercase font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Profile Avatar & Info */}
            <div className="flex flex-col items-center justify-center gap-3 py-4 bg-black/30 rounded-xl border border-white/5">
              <svg
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-20 h-20 rounded-full bg-purple-900/40 border border-white/10 shadow-inner shrink-0"
              >
                {/* Head/Face shape */}
                <circle cx="18" cy="16" r="8" fill="#FDBA74" />
                {/* Hair */}
                <path
                  d="M10 16C10 11.5817 13.5817 8 18 8C22.4183 8 26 11.5817 26 16V17H10V16Z"
                  fill="#1E293B"
                />
                {/* Eyes */}
                <circle cx="15.5" cy="16" r="1" fill="#0F172A" />
                <circle cx="20.5" cy="16" r="1" fill="#0F172A" />
                {/* Smile */}
                <path
                  d="M16 19.5C16.5 20.2 19.5 20.2 20 19.5"
                  stroke="#0F172A"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                {/* Body/Clothes */}
                <path
                  d="M8 30C8 25.5817 11.5817 22 16 22H20C24.4183 22 28 25.5817 28 30V32H8V30Z"
                  fill="#6366F1"
                />
              </svg>
              <div className="text-center">
                <span className="text-sm font-extrabold block text-white">
                  {user?.name || "User"}
                </span>
                <span className="text-xs text-slate-400 font-mono block mt-0.5">
                  {user?.email || ""}
                </span>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase font-extrabold tracking-wider">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter new display name"
                    required
                    className={`flex-1 text-sm p-3 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
                  />
                  <button
                    type="submit"
                    disabled={
                      isSavingProfile ||
                      !profileName.trim() ||
                      profileName.trim() === user?.name
                    }
                    className="px-5 py-3 bg-purple-600/80 hover:bg-purple-700/80 disabled:bg-slate-800 disabled:text-slate-650 text-white rounded-xl font-bold uppercase text-xs cursor-pointer transition-colors"
                  >
                    {isSavingProfile ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </form>

            {/* Sync Integrations Statuses */}
            <div className="space-y-3">
              <label className="text-xs text-slate-400 uppercase font-extrabold tracking-wider block">
                Connection Integrations
              </label>

              <div className="space-y-2.5">
                {/* Gmail Integration */}
                <div className="p-3.5 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center text-sm">
                  <div>
                    <span className="font-extrabold block text-white uppercase tracking-wider text-xs">
                      Gmail Integration
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {gmailConnected
                        ? `Connected to Workspace`
                        : "Disconnected"}
                    </span>
                  </div>
                  <div>
                    {gmailConnected ? (
                      <button
                        onClick={() => handleDisconnectPlugin("gmail")}
                        className="px-3.5 py-2 text-xs bg-rose-955/20 text-rose-300/80 hover:bg-rose-900/30 border border-rose-900/20 rounded-lg font-extrabold uppercase cursor-pointer transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectPlugin("gmail")}
                        className="px-3.5 py-2 text-xs bg-green-650/25 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg font-extrabold uppercase cursor-pointer transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Calendar Integration */}
                <div className="p-3.5 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center text-sm">
                  <div>
                    <span className="font-extrabold block text-white uppercase tracking-wider text-xs">
                      Google Calendar
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {calendarConnected
                        ? `Connected to Workspace`
                        : "Disconnected"}
                    </span>
                  </div>
                  <div>
                    {calendarConnected ? (
                      <button
                        onClick={() => handleDisconnectPlugin("googlecalendar")}
                        className="px-3.5 py-2 text-xs bg-rose-955/20 text-rose-300/80 hover:bg-rose-900/30 border border-rose-900/20 rounded-lg font-extrabold uppercase cursor-pointer transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectPlugin("googlecalendar")}
                        className="px-3.5 py-2 text-xs bg-green-650/25 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg font-extrabold uppercase cursor-pointer transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-950/20 bg-red-950/5 rounded-xl p-4.5 space-y-3">
              <label className="text-xs text-red-400/60 uppercase font-extrabold tracking-wider block">
                Danger Zone
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isClearingData}
                  onClick={handleClearWorkspaceData}
                  className="flex-1 px-4 py-2.5 bg-red-950/10 hover:bg-red-900/10 border border-red-950/20 text-red-400/65 rounded-lg font-extrabold uppercase text-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isClearingData
                    ? "Clearing Cache..."
                    : "Clear Local Cache Data"}
                </button>
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2.5 bg-red-950/30 hover:bg-red-900/30 border border-red-900/25 text-red-400/80 rounded-lg font-extrabold uppercase text-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isDeletingAccount
                    ? "Deleting Account..."
                    : "Delete Ciel Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Themed Confirmation Modal */}
      {confirmModal && confirmModal.show && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-sm border border-white/10 bg-slate-950/40 backdrop-blur-2xl text-white rounded-2xl p-6 space-y-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transform scale-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <span className="text-base">
                {confirmModal.isDanger ? "⚠️" : "❓"}
              </span>
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${confirmModal.isDanger ? "text-red-450" : "text-purple-400"}`}
              >
                {confirmModal.title}
              </h4>
            </div>

            {/* Message */}
            <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
              {confirmModal.message}
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-wider text-white transition-colors cursor-pointer ${
                  confirmModal.isDanger
                    ? "bg-red-650 hover:bg-red-700"
                    : "bg-purple-650 hover:bg-purple-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
