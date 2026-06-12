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
  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const calendarEvents = useCielStore((s) => s.calendarEvents);
  const fetchCalendarEvents = useCielStore((s) => s.fetchCalendarEvents);
  
  const searchQuery = useCielStore((s) => s.searchQuery);
  const setSearchQuery = useCielStore((s) => s.setSearchQuery);
  const performSearch = useCielStore((s) => s.performSearch);
  
  const chatMessages = useCielStore((s) => s.chatMessages);
  const addChatMessage = useCielStore((s) => s.addChatMessage);
  const clearChat = useCielStore((s) => s.clearChat);

  // Tab State
  const [activeView, setActiveView] = useState<"emails" | "calendar" | "chat" | "store">("emails");
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

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
      fetchEmails();
      fetchCalendarEvents();
    }
  }, [status, fetchIntegrationStatus, fetchEmails, fetchCalendarEvents]);

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
    <div className="min-h-screen bg-[#0a0b0d] text-gray-300 p-6 font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 pb-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white uppercase tracking-widest">CIEL // DEV CONSOLE</h1>
          <p className="text-xs text-gray-500 uppercase">Backend Integration Testing Dashboard</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-gray-500">
            USER: <span className="text-white">{session?.user?.email}</span>
          </span>
          <button
            onClick={() => signOut()}
            className="border border-gray-800 px-3 py-1.5 hover:bg-gray-900 rounded text-gray-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Integration Connections Panel */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Gmail status */}
        <div className="border border-gray-800 bg-[#0d0e12] p-4 rounded flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Gmail Integration</h2>
            <p className="text-xs text-gray-500 mb-3">Corsair synchronization status for user emails.</p>
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
              className="text-center w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs uppercase font-bold cursor-pointer"
            >
              Connect Gmail
            </button>
          )}
        </div>

        {/* Calendar status */}
        <div className="border border-gray-800 bg-[#0d0e12] p-4 rounded flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Google Calendar</h2>
            <p className="text-xs text-gray-500 mb-3">Corsair synchronization status for user schedules.</p>
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
              className="text-center w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs uppercase font-bold cursor-pointer"
            >
              Connect Calendar
            </button>
          )}
        </div>
      </section>

      {/* Main Workspace Console */}
      <div className="flex-1 flex flex-col border border-gray-800 bg-[#0d0e12] rounded overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-800 flex bg-[#0e1014] text-xs">
          <button
            onClick={() => setActiveView("emails")}
            className={`px-4 py-3 border-r border-gray-800 font-bold uppercase tracking-wider ${activeView === "emails" ? "bg-[#0a0b0d] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Emails ({emails.length})
          </button>
          <button
            onClick={() => setActiveView("calendar")}
            className={`px-4 py-3 border-r border-gray-800 font-bold uppercase tracking-wider ${activeView === "calendar" ? "bg-[#0a0b0d] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Calendar ({calendarEvents.length})
          </button>
          <button
            onClick={() => setActiveView("chat")}
            className={`px-4 py-3 border-r border-gray-800 font-bold uppercase tracking-wider ${activeView === "chat" ? "bg-[#0a0b0d] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            AI Chat Console ({chatMessages.length})
          </button>
          <button
            onClick={() => setActiveView("store")}
            className={`px-4 py-3 font-bold uppercase tracking-wider ${activeView === "store" ? "bg-[#0a0b0d] text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Zustand Store Dump
          </button>
        </div>

        {/* Console Action Bar */}
        <div className="bg-[#0b0c10] border-b border-gray-800 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search Emails & Calendar events (triggers vector search DB lookup)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#0a0b0d] border border-gray-800 text-xs px-3 py-2 text-white outline-none rounded"
            />
            <button
              type="submit"
              className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 font-bold uppercase rounded"
            >
              Search
            </button>
          </form>
          
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                fetchIntegrationStatus();
                fetchEmails();
                fetchCalendarEvents();
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 font-bold uppercase rounded"
            >
              Refresh All Data
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[50vh]">
          {/* EMAILS VIEW */}
          {activeView === "emails" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-900">
                <span className="text-xs uppercase tracking-wider text-gray-500">Inbox Sync Log ({emails.length} entries)</span>
              </div>
              {emails.length === 0 ? (
                <p className="text-xs text-gray-500">No emails cached in database. Click Connect Gmail or check your credentials.</p>
              ) : (
                <div className="space-y-3">
                  {emails.map((email) => (
                    <div key={email.id} className="border border-gray-900 p-3 bg-[#0a0b0d] rounded text-xs">
                      <div className="flex flex-col sm:flex-row justify-between mb-2 pb-1.5 border-b border-gray-900/50">
                        <span className="font-bold text-gray-400">FROM: {email.from} &lt;{email.fromEmail}&gt;</span>
                        <span className="text-gray-500">{email.date}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-white font-semibold">{email.subject}</span>
                      </div>
                      <p className="text-gray-400 whitespace-pre-wrap leading-relaxed bg-[#0b0c10]/50 p-2 border border-gray-900 rounded">{email.body}</p>
                      <div className="mt-2 flex gap-3 text-[10px] text-gray-500 uppercase font-semibold">
                        <span>Category: {email.category}</span>
                        <span>Priority: {email.priority}</span>
                        <span>Read: {email.read ? "yes" : "no"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALENDAR VIEW */}
          {activeView === "calendar" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-900">
                <span className="text-xs uppercase tracking-wider text-gray-500">Calendar Coordinates ({calendarEvents.length} entries)</span>
              </div>
              {calendarEvents.length === 0 ? (
                <p className="text-xs text-gray-500">No calendar events cached in database. Click Connect Calendar or check your credentials.</p>
              ) : (
                <div className="space-y-3">
                  {calendarEvents.map((evt) => (
                    <div key={evt.id} className="border border-gray-900 p-3 bg-[#0a0b0d] rounded text-xs">
                      <div className="flex flex-col sm:flex-row justify-between mb-2 pb-1.5 border-b border-gray-900/50">
                        <span className="font-bold text-white">{evt.title}</span>
                        <span className="text-gray-500">
                          {new Date(evt.start).toLocaleString()} - {new Date(evt.end).toLocaleString()}
                        </span>
                      </div>
                      {evt.location && <p className="mb-1 text-gray-400">Location: {evt.location}</p>}
                      {evt.attendees && evt.attendees.length > 0 && (
                        <p className="mb-1 text-gray-400">Attendees: {evt.attendees.join(", ")}</p>
                      )}
                      {evt.description && (
                        <p className="text-gray-400 whitespace-pre-wrap leading-relaxed bg-[#0b0c10]/50 p-2 border border-gray-900 rounded mt-2">{evt.description}</p>
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
              <div className="flex-1 space-y-3 bg-[#0a0b0d] p-4 border border-gray-900 rounded overflow-y-auto max-h-[350px]">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-xs leading-relaxed">
                    <span className={`font-bold ${msg.role === "user" ? "text-cyan-400" : "text-purple-400"} uppercase mr-2`}>
                      [{msg.role}]:
                    </span>
                    <span className="text-gray-300">{msg.content}</span>
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
                  className="flex-1 bg-[#0a0b0d] border border-gray-800 text-xs px-3 py-2 text-white outline-none rounded disabled:opacity-50"
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
                  className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 font-bold uppercase rounded shrink-0"
                >
                  Clear
                </button>
              </form>
            </div>
          )}

          {/* STORE DUMP */}
          {activeView === "store" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-900">
                <span className="text-xs uppercase tracking-wider text-gray-500">Live Zustand Store State</span>
              </div>
              <pre className="bg-[#0a0b0d] p-4 border border-gray-900 rounded text-[10px] text-green-400 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify({
                  user,
                  gmailConnected,
                  calendarConnected,
                  emailsCount: emails.length,
                  calendarEventsCount: calendarEvents.length,
                  chatMessagesCount: chatMessages.length,
                  searchQuery,
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
