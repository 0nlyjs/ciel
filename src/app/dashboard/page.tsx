"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCielStore } from "@/store/useCielStore";
import { useSession } from "@/lib/auth-client";
import toast from "react-hot-toast";

// Sub-components
import { DashboardLayout } from "./_components/DashboardLayout";
import { Sidebar } from "./_components/Sidebar";
import { OverviewTab } from "./_components/OverviewTab";
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
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSendingCompose, setIsSendingCompose] = useState(false);

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
        0, 0, 0, 0
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
          fetchCalendarEvents();
        }
      }

      if (!isOAuthSuccess) {
        fetchEmails();
        fetchCalendarEvents();
      }
    }
  }, [session, fetchIntegrationStatus, fetchSettings, fetchLocalIntegrations, fetchEmails, fetchCalendarEvents, loadEmailsFromCache, setActiveTab]);

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
        console.log("[EventSource] Sync complete. Fetching updated list from database...");
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
      console.error("[EventSource] Error in event stream, reconnecting:", error);
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
    console.log(`[Sync Timer] Starting periodic hard sync every ${syncInterval} minutes (${intervalMs}ms)`);

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
      console.log(`[Sync Timer] Clearing periodic sync timer for ${user.email}`);
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

  const handleInitiateCompose = (to = "", subject = "", body = "") => {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeBody(body);
    setShowComposeModal(true);
  };

  const handleSendComposeMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim() || isSendingCompose) return;

    setIsSendingCompose(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        })
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
      <div className="min-h-screen bg-[#0b0c10] text-gray-400 flex flex-col items-center justify-center font-sans gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white tracking-tighter shadow-md animate-pulse">
          C
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono animate-pulse">Initializing Console...</p>
      </div>
    );
  }

  // Switch statement rendering the tabs based on activeTab
  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "inbox":
        return <InboxTab onInitiateCompose={handleInitiateCompose} />;
      case "calendar":
        return <CalendarTab onInitiateCompose={handleInitiateCompose} />;
      case "chat":
        return <ChatTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
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
    <DashboardLayout sidebar={<Sidebar onShowShortcuts={() => setShowShortcutsModal(true)} />}>
      {renderTab()}

      {/* Compose Email Modal - Gmail-Style Floating Box */}
      {showComposeModal && (
        <div 
          className={`fixed bottom-4 right-4 z-50 w-full max-w-lg rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col min-h-[420px] max-h-[550px] ${cardBgClass} transition-all duration-300 transform scale-100`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-4 border-b ${borderClass} flex items-center justify-between ${accordionHeaderBgClass}`}>
            <h3 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"} uppercase tracking-normal leading-tight`}>Compose New Message</h3>
            <button 
              onClick={() => setShowComposeModal(false)}
              className="text-slate-500 hover:text-slate-950 dark:hover:text-white font-bold text-lg cursor-pointer"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSendComposeMail} className="flex-1 flex flex-col p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">To:</label>
              <input 
                type="email" 
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="recipient@example.com"
                required
                className={`w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">Subject:</label>
              <input 
                type="text" 
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Enter email subject"
                required
                className={`w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
              />
            </div>
            <div className="flex-1 flex flex-col space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">Message:</label>
              <textarea 
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message here..."
                rows={8}
                required
                className={`flex-1 text-xs p-3 outline-none rounded-xl border transition-all duration-300 ${inputBgClass} resize-none`}
              />
            </div>
            <div className={`pt-3 border-t border-slate-900/10 dark:border-white/10 flex justify-end gap-2 shrink-0`}>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="px-3.5 py-2 text-slate-500 hover:text-slate-950 dark:hover:text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors"
              >
                {isSendingCompose ? "Sending..." : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowShortcutsModal(false)}>
          <div 
            className={`w-full max-w-2xl border ${
              isDark 
                ? "bg-slate-955/90 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)] text-white" 
                : "bg-white/95 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)] text-slate-900"
            } rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5 transition-transform duration-300 transform scale-100`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/20 dark:border-white/5 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">⌨️</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Ciel Workspace Mind Console
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Keyboard & NLP Commands Directory</p>
                </div>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)} 
                className="px-2.5 py-1 text-[9px] bg-slate-200/50 dark:bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent rounded-lg text-slate-500 uppercase font-bold transition-all cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Direct System Hotkeys */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-200/20 dark:border-white/5 pb-1">
                  ⌨️ Active Hotkeys
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">Global Command Palette</span>
                      <span className="text-[10px] text-slate-500">Search and navigate through Ciel</span>
                    </div>
                    <kbd className="px-2 py-1 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 font-mono font-bold shrink-0">⌘ K / Ctrl K</kbd>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">AI Quick Reply badges</span>
                      <span className="text-[10px] text-slate-500">Insert AI reply 1, 2, or 3 from expanded mail</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <kbd className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 font-mono font-bold">1</kbd>
                      <kbd className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 font-mono font-bold">2</kbd>
                      <kbd className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 font-mono font-bold">3</kbd>
                    </div>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">Close Panels / Modals</span>
                      <span className="text-[10px] text-slate-500">Instantly dismiss active popup or palette</span>
                    </div>
                    <kbd className="px-2 py-1 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 font-mono font-bold shrink-0">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Right Column: Command Palette NLP Capabilities */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-wider border-b border-slate-200/20 dark:border-white/5 pb-1">
                  🧠 AI Command Examples
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-[10px] text-cyan-400 font-semibold block uppercase">🌐 Navigation</span>
                    <span className="text-slate-400">"Go to calendar"</span>
                    <span className="text-slate-500 block text-[9px]">Options: overview, inbox, calendar, chat, settings</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-[10px] text-purple-400 font-semibold block uppercase">🔍 Deep Vector Search</span>
                    <span className="text-slate-400">"Search for meeting notes"</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-[10px] text-pink-400 font-semibold block uppercase">✉️ Smart Compose draft</span>
                    <span className="text-slate-400">"Compose to name@domain.com"</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-500/5 border border-slate-200/10 space-y-1">
                    <span className="text-[10px] text-amber-400 font-semibold block uppercase">⏳ Smart Operations</span>
                    <span className="text-slate-400">"Snooze this email until tomorrow"</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/20 dark:border-white/5 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] text-slate-500 gap-2">
              <span className="font-mono">
                💡 Tip: Type command queries in natural English; Ciel parses your intent.
              </span>
              <span className="italic font-sans">
                * Hotkeys are disabled when writing inside form inputs.
              </span>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
