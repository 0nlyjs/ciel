"use client";

import { useState, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  
  // Zustand State & Actions
  const user = useCielStore((s) => s.user);
  const login = useCielStore((s) => s.login);
  const logout = useCielStore((s) => s.logout);
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const fetchIntegrationStatus = useCielStore((s) => s.fetchIntegrationStatus);
  
  const emails = useCielStore((s) => s.emails);
  const emailsTotal = useCielStore((s) => s.emailsTotal);
  const emailsPage = useCielStore((s) => s.emailsPage);
  const emailsPerPage = useCielStore((s) => s.emailsPerPage);
  const emailsHasMore = useCielStore((s) => s.emailsHasMore);
  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const calendarEvents = useCielStore((s) => s.calendarEvents);
  const fetchCalendarEvents = useCielStore((s) => s.fetchCalendarEvents);
  const markAsRead = useCielStore((s) => s.markAsRead);

  const startRange = emailsTotal > 0 ? (emailsPage - 1) * emailsPerPage + 1 : 0;
  const endRange = Math.min(emailsPage * emailsPerPage, emailsTotal);
  
  const searchQuery = useCielStore((s) => s.searchQuery);
  const setSearchQuery = useCielStore((s) => s.setSearchQuery);
  const performSearch = useCielStore((s) => s.performSearch);
  
  const chatMessages = useCielStore((s) => s.chatMessages);
  const addChatMessage = useCielStore((s) => s.addChatMessage);
  const clearChat = useCielStore((s) => s.clearChat);

  // Settings & Integrations state
  const theme = useCielStore((s) => s.theme);
  const syncInterval = useCielStore((s) => s.syncInterval);
  const aiAutoPriority = useCielStore((s) => s.aiAutoPriority);
  const localIntegrations = useCielStore((s) => s.localIntegrations);
  const fetchSettings = useCielStore((s) => s.fetchSettings);
  const updateSettings = useCielStore((s) => s.updateSettings);
  const fetchLocalIntegrations = useCielStore((s) => s.fetchLocalIntegrations);

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-[#303854] text-gray-200" : "bg-[#f3f4f6] text-gray-700";
  const headerBgClass = isDark ? "border-b border-slate-700/60" : "border-b border-gray-200";
  const borderClass = isDark ? "border-slate-700/60" : "border-gray-200";
  const border900Class = isDark ? "border-slate-800/80" : "border-gray-200";
  const cardBgClass = isDark ? "bg-[#1a1e30] border-slate-700/60" : "bg-white border-gray-200 shadow-sm";
  const innerCardBgClass = isDark ? "bg-[#141724]" : "bg-gray-55";
  const activeTabClass = isDark ? "bg-[#141724] text-white" : "bg-white text-gray-900";
  const inactiveTabClass = isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600";
  const tabContainerBgClass = isDark ? "bg-[#181c2c]" : "bg-gray-100";
  const actionContainerBgClass = isDark ? "bg-[#1b1f30]" : "bg-gray-50";
  const inputBgClass = isDark ? "bg-[#141724] border-slate-700/60 text-white" : "bg-white border-gray-300 text-gray-900";
  const buttonBgClass = isDark ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800";
  const textWhiteClass = isDark ? "text-white" : "text-gray-900";
  const textMutedClass = isDark ? "text-slate-400/80" : "text-gray-400";
  const accordionHeaderBgClass = isDark ? "bg-[#171b29]" : "bg-gray-50";

  // Tab State
  const [activeView, setActiveView] = useState<"emails" | "calendar" | "chat" | "store" | "settings">("emails");
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync NextAuth session state with Zustand store
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const name = session.user.name || "User";
      const email = session.user.email || "";
      if (!user || user.email !== email || user.name !== name) {
        login(name, email);
      }
    } else if (status === "unauthenticated" && user) {
      logout();
    }
  }, [status, session, user, login, logout]);

  // Load initial data on dashboard mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchIntegrationStatus();
      fetchSettings();
      fetchLocalIntegrations();
      // Fetch cached emails instantly from database
      fetchEmails().then(() => {
        // Trigger background sync to pull new and remaining emails
        fetchEmails(true);
      });
      fetchCalendarEvents();
    }
  }, [status, fetchIntegrationStatus, fetchSettings, fetchLocalIntegrations, fetchEmails, fetchCalendarEvents]);

  // Real-time Event Stream Listener (SSE)
  useEffect(() => {
    if (status !== "authenticated" || !user?.email) return;

    console.log("[EventSource] Connecting to Server-Sent Events stream...");
    const eventSource = new EventSource("/api/sync/stream");

    eventSource.onmessage = async (event) => {
      console.log("[EventSource] Event received:", event.data);
      if (event.data === "new_email") {
        console.log("[EventSource] Syncing new email...");
        setIsRefreshing(true);
        try {
          await fetchEmails(true);
        } catch (e) {
          console.error("SSE fetchEmails error:", e);
        } finally {
          setIsRefreshing(false);
        }
      } else if (event.data === "sync_complete") {
        console.log("[EventSource] Sync complete. Fetching updated list from database...");
        try {
          await fetchEmails(false);
        } catch (e) {
          console.error("SSE sync_complete fetchEmails error:", e);
        }
      } else if (event.data === "new_calendar") {
        console.log("[EventSource] Syncing calendar events...");
        setIsRefreshing(true);
        try {
          await fetchCalendarEvents();
        } catch (e) {
          console.error("SSE fetchCalendarEvents error:", e);
        } finally {
          setIsRefreshing(false);
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
  }, [status, user?.email, fetchEmails, fetchCalendarEvents]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      fetchEmails();
      fetchCalendarEvents();
    }
  };

  // Handle Chat message submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    addChatMessage({ role: "user", content: userMsg });
    setIsSendingChat(true);

    try {
      // Re-fetch all messages to build list including the new one
      const updatedMessages = [...chatMessages, { role: "user", content: userMsg }];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addChatMessage({ role: "assistant", content: data.text });
      } else {
        addChatMessage({ role: "assistant", content: "Error communicating with the backend chatbot API." });
      }
    } catch (err) {
      console.error("Chat error:", err);
      addChatMessage({ role: "assistant", content: "An unexpected error occurred during chat transmission." });
    } finally {
      setIsSendingChat(false);
      // Automatically refresh data in case tool execution made changes
      fetchEmails();
      fetchCalendarEvents();
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0b0d] text-gray-400 flex items-center justify-center font-mono">
        <p>Loading session status...</p>
      </div>
    );
  }

  // Unauthenticated / Landing View
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0a0b0d] text-gray-300 p-8 flex flex-col items-center justify-center font-mono">
        <div className="max-w-md w-full border border-gray-800 bg-[#0d0e12] p-8 rounded shadow-md">
          <h1 className="text-xl font-bold text-white mb-2">CIEL WORKSPACE</h1>
          <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">Sentient Analytical Interface</p>
          
          <p className="text-sm leading-relaxed mb-8">
            Developer Console. Sign in using your NextAuth credentials to test backend email parsing, calendar synchronization, database indexing, and AI agent flows.
          </p>

          <button
            onClick={() => signIn()}
            className="w-full py-3 bg-white text-black font-bold text-sm rounded hover:bg-gray-200 transition-colors uppercase tracking-wider"
          >
            Authorize / Sign In
          </button>
        </div>
      </div>
    );
  }

  // Dashboard / Authenticated View
  return (
    <div className={`min-h-screen ${bgClass} p-6 font-mono flex flex-col transition-colors duration-300`}>
      {/* Header */}
      <header className={`${headerBgClass} pb-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div>
          <h1 className={`text-lg font-bold ${textWhiteClass} uppercase tracking-widest`}>CIEL // DEV CONSOLE</h1>
          <p className={`text-xs ${textMutedClass} uppercase`}>Backend Integration Testing Dashboard</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className={textMutedClass}>
            USER: <span className={textWhiteClass}>{session?.user?.email}</span>
          </span>
          <button
            onClick={() => signOut()}
            className={`border ${borderClass} px-3 py-1.5 hover:bg-gray-500/10 rounded ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Integration Connections Panel */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Gmail status */}
        <div className={`border ${borderClass} ${cardBgClass} p-4 rounded flex flex-col justify-between`}>
          <div>
            <h2 className={`text-xs font-bold ${textWhiteClass} mb-1 uppercase tracking-wider`}>Gmail Integration</h2>
            <p className={`text-xs ${textMutedClass} mb-3`}>Corsair synchronization status for user emails.</p>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${gmailConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs">{gmailConnected ? "CONNECTED" : "DISCONNECTED"}</span>
            </div>
          </div>
          {gmailConnected ? (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/corsair/disconnect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plugin: "gmail" }),
                  });
                  if (res.ok) {
                    fetchIntegrationStatus();
                    fetchLocalIntegrations();
                  }
                } catch (e) {
                  console.error("Disconnect gmail failed:", e);
                }
              }}
              className="text-center w-full py-2 bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-900 rounded text-xs uppercase font-bold cursor-pointer"
            >
              Disconnect Gmail
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/corsair/connect?plugin=gmail");
                  const data = await res.json();
                  if (data.authorizeUrl) {
                    window.location.href = data.authorizeUrl;
                  }
                } catch (e) {
                  console.error("Failed to connect gmail:", e);
                }
              }}
              className={`text-center w-full py-2 ${buttonBgClass} rounded text-xs uppercase font-bold cursor-pointer`}
            >
              Connect Gmail
            </button>
          )}
        </div>

        {/* Calendar status */}
        <div className={`border ${borderClass} ${cardBgClass} p-4 rounded flex flex-col justify-between`}>
          <div>
            <h2 className={`text-xs font-bold ${textWhiteClass} mb-1 uppercase tracking-wider`}>Google Calendar</h2>
            <p className={`text-xs ${textMutedClass} mb-3`}>Corsair synchronization status for user schedules.</p>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${calendarConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs">{calendarConnected ? "CONNECTED" : "DISCONNECTED"}</span>
            </div>
          </div>
          {calendarConnected ? (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/corsair/disconnect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plugin: "googlecalendar" }),
                  });
                  if (res.ok) {
                    fetchIntegrationStatus();
                    fetchLocalIntegrations();
                  }
                } catch (e) {
                  console.error("Disconnect calendar failed:", e);
                }
              }}
              className="text-center w-full py-2 bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-900 rounded text-xs uppercase font-bold cursor-pointer"
            >
              Disconnect Calendar
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/corsair/connect?plugin=googlecalendar");
                  const data = await res.json();
                  if (data.authorizeUrl) {
                    window.location.href = data.authorizeUrl;
                  }
                } catch (e) {
                  console.error("Failed to connect calendar:", e);
                }
              }}
              className={`text-center w-full py-2 ${buttonBgClass} rounded text-xs uppercase font-bold cursor-pointer`}
            >
              Connect Calendar
            </button>
          )}
        </div>
      </section>

      {/* Main Workspace Console */}
      <div className={`flex-1 flex flex-col border ${borderClass} ${cardBgClass} rounded overflow-hidden`}>
        {/* Navigation Tabs */}
        <div className={`border-b ${borderClass} flex ${tabContainerBgClass} text-xs`}>
          <button
            onClick={() => setActiveView("emails")}
            className={`px-4 py-3 border-r ${borderClass} font-bold uppercase tracking-wider ${activeView === "emails" ? activeTabClass : inactiveTabClass}`}
          >
            Emails ({emailsTotal})
          </button>
          <button
            onClick={() => setActiveView("calendar")}
            className={`px-4 py-3 border-r ${borderClass} font-bold uppercase tracking-wider ${activeView === "calendar" ? activeTabClass : inactiveTabClass}`}
          >
            Calendar ({calendarEvents.length})
          </button>
          <button
            onClick={() => setActiveView("chat")}
            className={`px-4 py-3 border-r ${borderClass} font-bold uppercase tracking-wider ${activeView === "chat" ? activeTabClass : inactiveTabClass}`}
          >
            AI Chat Console ({chatMessages.length})
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={`px-4 py-3 border-r ${borderClass} font-bold uppercase tracking-wider ${activeView === "settings" ? activeTabClass : inactiveTabClass}`}
          >
            Settings & Integrations
          </button>
          <button
            onClick={() => setActiveView("store")}
            className={`px-4 py-3 font-bold uppercase tracking-wider ${activeView === "store" ? activeTabClass : inactiveTabClass}`}
          >
            Zustand Store Dump
          </button>
        </div>

        {/* Console Action Bar */}
        <div className={`${actionContainerBgClass} border-b ${borderClass} p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4`}>
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search Emails & Calendar events (triggers vector search DB lookup)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 ${inputBgClass} border ${borderClass} text-xs px-3 py-2 outline-none rounded`}
            />
            <button
              type="submit"
              className={`${buttonBgClass} text-xs px-4 py-2 font-bold uppercase rounded`}
            >
              Search
            </button>
          </form>
          
          <div className="flex gap-2 shrink-0">
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await Promise.all([
                    fetchIntegrationStatus(),
                    fetchLocalIntegrations(),
                    fetchEmails(true),
                    fetchCalendarEvents()
                  ]);
                } catch (e) {
                  console.error("Refresh failed:", e);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className={`${buttonBgClass} text-xs px-4 py-2 font-bold uppercase rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isRefreshing ? (
                <>
                  <span className="w-3 h-3 border-2 border-t-transparent border-current rounded-full animate-spin shrink-0" />
                  Refreshing...
                </>
              ) : (
                "Refresh All Data"
              )}
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[50vh]">
          {/* EMAILS VIEW */}
          {activeView === "emails" && (
            <div className="space-y-4">
              <div className={`flex justify-between items-center pb-2 border-b ${border900Class}`}>
                <span className={`text-xs uppercase tracking-wider ${textMutedClass}`}>
                  Inbox Sync Log (Showing {startRange}-{endRange} of {emailsTotal} entries)
                </span>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (emailsPage > 1) {
                        fetchEmails(false, emailsPage - 1);
                      }
                    }}
                    disabled={emailsPage <= 1}
                    className={`px-2 py-1 ${buttonBgClass} disabled:opacity-30 disabled:bg-gray-950 disabled:text-gray-700 rounded text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed uppercase`}
                  >
                    &lt; Prev
                  </button>
                  <span className="text-xs text-gray-400 font-bold">
                    {startRange}-{endRange}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextPage = emailsPage + 1;
                      if (nextPage * emailsPerPage <= emailsTotal) {
                        fetchEmails(false, nextPage);
                      } else {
                        fetchEmails(true, nextPage);
                      }
                    }}
                    disabled={!emailsHasMore && emailsPage >= Math.ceil(emailsTotal / emailsPerPage)}
                    className={`px-2 py-1 ${buttonBgClass} disabled:opacity-30 disabled:bg-gray-950 disabled:text-gray-700 rounded text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed uppercase`}
                  >
                    Next &gt;
                  </button>
                </div>
              </div>

              {emails.length === 0 ? (
                <p className={`text-xs ${textMutedClass}`}>No emails cached in database. Click Connect Gmail or check your credentials.</p>
              ) : (
                <div className="space-y-2">
                  {emails.map((email) => {
                    const isExpanded = expandedEmailId === email.id;
                    const displayDate = (() => {
                      if (!mounted) return "";
                      try {
                        return new Date(email.date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                      } catch (e) {
                        return email.date;
                      }
                    })();

                    // Gmail-like unread vs read highlighting
                    const emailBgClass = email.read
                      ? (isDark ? "bg-[#121520] opacity-90" : "bg-gray-100/50 text-gray-500")
                      : (isDark ? "bg-[#252a3f] border-l-2 border-l-[#FF007F]" : "bg-white border-l-2 border-l-[#00F0FF] shadow-sm");
                    
                    const senderTextClass = email.read
                      ? "text-gray-500 font-normal"
                      : (isDark ? "text-white font-bold" : "text-gray-900 font-bold");
                      
                    const subjectTextClass = email.read
                      ? (isDark ? "text-gray-400 font-normal" : "text-gray-500 font-normal")
                      : (isDark ? "text-white font-bold" : "text-gray-900 font-bold");

                    const dateTextClass = email.read
                      ? "text-gray-500 font-normal"
                      : (isDark ? "text-[#00F0FF] font-bold" : "text-cyan-600 font-bold");

                    return (
                      <div
                        key={email.id}
                        onClick={() => {
                          setExpandedEmailId(isExpanded ? null : email.id);
                          if (!email.read) {
                            markAsRead(email.id);
                          }
                        }}
                        className={`border ${border900Class} ${emailBgClass} rounded text-xs cursor-pointer hover:border-gray-500 transition-all duration-200 overflow-hidden`}
                      >
                        {isExpanded ? (
                          /* Expanded Accordion View */
                          <div className={`p-4 space-y-3 ${accordionHeaderBgClass}`}>
                            <div className={`flex flex-col sm:flex-row justify-between pb-2 border-b ${border900Class}`}>
                              <div>
                                <span className={`font-bold ${textWhiteClass}`}>FROM: {email.from}</span>
                                <span className="text-gray-500 ml-2">&lt;{email.fromEmail}&gt;</span>
                              </div>
                              <span className="text-gray-500 text-[10px]">{displayDate}</span>
                            </div>
                            <div>
                              <h3 className={`text-sm font-bold ${textWhiteClass}`}>{email.subject}</h3>
                            </div>
                            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} whitespace-pre-wrap leading-relaxed ${actionContainerBgClass}/50 p-3 border ${border900Class} rounded select-text`}>
                              {email.body}
                            </p>
                            <div className="flex gap-4 text-[10px] text-gray-500 uppercase font-semibold pt-1">
                              <span>Category: <span className={isDark ? "text-gray-400" : "text-gray-600"}>{email.category}</span></span>
                              <span>Priority: <span className={isDark ? "text-gray-400" : "text-gray-600"}>{email.priority}</span></span>
                              <span>Read: <span className={isDark ? "text-gray-400" : "text-gray-600"}>{email.read ? "yes" : "no"}</span></span>
                            </div>
                          </div>
                        ) : (
                          /* Collapsed Single Line View */
                          <div className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-500/10 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
                              <span className={`text-[10px] shrink-0 w-24 whitespace-nowrap ${dateTextClass}`}>
                                {displayDate.split(",")[0]}
                              </span>
                              <span className={`shrink-0 w-44 truncate whitespace-nowrap ${senderTextClass}`}>
                                {email.from}
                              </span>
                              <span className="truncate flex-1 block whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className={subjectTextClass}>{email.subject}</span>
                                <span className={`${isDark ? "text-gray-600" : "text-gray-400"} font-normal ml-3 whitespace-nowrap`}>
                                  — {email.body ? email.body.substring(0, 150).replace(/\r?\n/g, " ") : ""}
                                </span>
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-600 uppercase shrink-0 font-bold whitespace-nowrap">
                              {email.category}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CALENDAR VIEW */}
          {activeView === "calendar" && (
            <div className="space-y-4">
              <div className={`flex justify-between items-center pb-2 border-b ${border900Class}`}>
                <span className={`text-xs uppercase tracking-wider ${textMutedClass}`}>Calendar Coordinates ({calendarEvents.length} entries)</span>
              </div>
              {calendarEvents.length === 0 ? (
                <p className={`text-xs ${textMutedClass}`}>No calendar events cached in database. Click Connect Calendar or check your credentials.</p>
              ) : (
                <div className="space-y-3">
                  {calendarEvents.map((evt) => (
                    <div key={evt.id} className={`border ${border900Class} p-3 ${innerCardBgClass} rounded text-xs`}>
                      <div className={`flex flex-col sm:flex-row justify-between mb-2 pb-1.5 border-b ${border900Class}/50`}>
                        <span className={`font-bold ${textWhiteClass}`}>{evt.title}</span>
                        <span className="text-gray-500">
                          {mounted ? `${new Date(evt.start).toLocaleString()} - ${new Date(evt.end).toLocaleString()}` : ""}
                        </span>
                      </div>
                      {evt.location && <p className={`mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Location: {evt.location}</p>}
                      {evt.attendees && evt.attendees.length > 0 && (
                        <p className={`mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Attendees: {evt.attendees.join(", ")}</p>
                      )}
                      {evt.description && (
                        <p className={`${isDark ? "text-gray-400" : "text-gray-600"} whitespace-pre-wrap leading-relaxed ${actionContainerBgClass}/50 p-2 border ${border900Class} rounded mt-2`}>{evt.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI CHAT CONSOLE */}
          {activeView === "chat" && (
            <div className="flex flex-col h-full space-y-4 min-h-[300px]">
              <div className={`flex-1 space-y-3 ${innerCardBgClass} p-4 border ${border900Class} rounded overflow-y-auto max-h-[350px]`}>
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-xs leading-relaxed">
                    <span className={`font-bold ${msg.role === "user" ? "text-cyan-400" : "text-purple-400"} uppercase mr-2`}>
                      [{msg.role}]:
                    </span>
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>{msg.content}</span>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="text-xs text-gray-500 animate-pulse">
                    <span>[assistant]: Thinking and generating tool responses...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Ciel to send emails, list messages, or schedule meetings..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isSendingChat}
                  className={`flex-1 ${inputBgClass} border ${borderClass} text-xs px-3 py-2 outline-none rounded disabled:opacity-50`}
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="bg-purple-800 hover:bg-purple-700 disabled:bg-gray-800 text-white text-xs px-4 py-2 font-bold uppercase rounded shrink-0"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  className={`${buttonBgClass} text-xs px-3 py-2 font-bold uppercase rounded shrink-0`}
                >
                  Clear
                </button>
              </form>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeView === "settings" && (
            <div className="space-y-6">
              <div className={`pb-2 border-b ${border900Class} flex justify-between items-center`}>
                <span className={`text-xs uppercase tracking-wider ${textMutedClass}`}>System Preferences & Database Logs</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preferences Form */}
                <div className={`border p-4 rounded ${cardBgClass} space-y-4`}>
                  <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-wider`}>Preferences</h3>
                  
                  {/* Theme Select */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold block">UI Color Theme</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSettings({ theme: "dark" })}
                        className={`flex-1 py-2 text-xs font-bold rounded border uppercase ${theme === "dark" ? "bg-[#FF007F] text-white border-[#FF007F]" : buttonBgClass + " " + borderClass}`}
                      >
                        Dark (Void)
                      </button>
                      <button
                        onClick={() => updateSettings({ theme: "light" })}
                        className={`flex-1 py-2 text-xs font-bold rounded border uppercase ${theme === "light" ? "bg-[#00F0FF] text-black border-[#00F0FF]" : buttonBgClass + " " + borderClass}`}
                      >
                        Light (Alabaster)
                      </button>
                    </div>
                  </div>

                  {/* Sync Interval Select */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold block">Sync Interval</label>
                    <select
                      value={syncInterval}
                      onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value, 10) })}
                      className={`w-full text-xs px-2 py-2 border rounded outline-none ${inputBgClass} ${borderClass}`}
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every 1 hour (Default)</option>
                      <option value={720}>Every 12 hours</option>
                      <option value={1440}>Every 24 hours</option>
                    </select>
                  </div>

                  {/* AI Auto-priority Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold block">AI Auto-Priority</label>
                      <span className="text-[10px] text-gray-400">Classify incoming emails using gpt-4o-mini</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ aiAutoPriority: !aiAutoPriority })}
                      className={`px-3 py-1.5 text-xs font-bold rounded uppercase ${aiAutoPriority ? "bg-green-800 text-white" : "bg-red-800 text-white"}`}
                    >
                      {aiAutoPriority ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                {/* Local Integrations Database Cache */}
                <div className={`border p-4 rounded ${cardBgClass} space-y-4`}>
                  <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-wider`}>Synced Integrations (Neon DB Cache)</h3>
                  <p className="text-[10px] text-gray-500">Local records of connection status synced from Corsair:</p>
                  
                  {localIntegrations.length === 0 ? (
                    <p className={`text-xs ${textMutedClass} italic`}>No integration sync records found in database. Check connections above.</p>
                  ) : (
                    <div className="space-y-2">
                      {localIntegrations.map((integration) => (
                        <div key={integration.id} className={`p-2 border rounded text-xs flex justify-between items-center ${innerCardBgClass} ${borderClass}`}>
                          <div>
                            <span className={`font-bold ${textWhiteClass} uppercase`}>{integration.provider === "googlecalendar" ? "google calendar" : integration.provider}</span>
                            <span className="text-gray-500 ml-2">({integration.connected_email})</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${integration.status === "connected" ? "bg-green-950/60 text-green-300" : "bg-red-950/60 text-red-300"}`}>
                            {integration.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STORE DUMP */}
          {activeView === "store" && (
            <div className="space-y-4">
              <div className={`pb-2 border-b ${border900Class}`}>
                <span className={`text-xs uppercase tracking-wider ${textMutedClass}`}>Live Zustand Store State</span>
              </div>
              <pre className={`p-4 border ${border900Class} ${innerCardBgClass} rounded text-[10px] text-green-400 overflow-x-auto whitespace-pre-wrap`}>
                {JSON.stringify({
                  user,
                  gmailConnected,
                  calendarConnected,
                  emailsCount: emails.length,
                  calendarEventsCount: calendarEvents.length,
                  chatMessagesCount: chatMessages.length,
                  searchQuery,
                  settings: { theme, syncInterval, aiAutoPriority },
                  localIntegrations,
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
