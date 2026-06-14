"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCielStore } from "@/store/useCielStore";
import { useSession, signOut } from "@/lib/auth-client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

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
  const bgClass = isDark ? "text-gray-300 selection:bg-purple-500 selection:text-white" : "text-slate-700 selection:bg-cyan-500 selection:text-black";
  const headerBgClass = isDark ? "border-b border-white/5" : "border-b border-slate-900/5";
  const borderClass = isDark ? "border-white/5" : "border-slate-900/5";
  const border900Class = isDark ? "border-white/10" : "border-slate-900/10";
  
  // Frosted glass cards:
  const cardBgClass = isDark 
    ? "bg-slate-950/45 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.2)]"
    : "bg-white/45 backdrop-blur-xl border border-slate-900/10 shadow-[0_4px_30px_rgba(0,0,0,0.02)]";
  
  const innerCardBgClass = isDark ? "bg-black/20" : "bg-slate-900/5";
  
  // Pill tabs:
  const activeTabClass = isDark 
    ? "bg-purple-500/20 text-purple-350 border-purple-500/40" 
    : "bg-cyan-500/10 text-cyan-700 border-cyan-500/20";
  
  const inactiveTabClass = isDark 
    ? "text-gray-400 hover:text-white border-transparent" 
    : "text-slate-500 hover:text-slate-900 border-transparent";
    
  const tabContainerBgClass = isDark ? "bg-black/10" : "bg-slate-900/5";
  const actionContainerBgClass = isDark ? "bg-black/10" : "bg-slate-900/5";
  
  // Inputs:
  const inputBgClass = isDark 
    ? "bg-black/25 focus:bg-black/40 border-white/10 focus:border-purple-500/50 text-white" 
    : "bg-slate-900/5 focus:bg-slate-900/10 border-slate-900/10 focus:border-cyan-500/50 text-slate-900";
    
  const buttonBgClass = isDark 
    ? "bg-white/5 hover:bg-white/10 text-white border border-white/5" 
    : "bg-slate-900/5 hover:bg-slate-900/10 text-slate-800 border border-slate-900/5";
    
  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const accordionHeaderBgClass = isDark ? "bg-black/15" : "bg-slate-900/5";

  const ambientBg = isDark
    ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E"), linear-gradient(135deg, #0b0c10 0%, #12131a 30%, #1a1528 70%, #0b0c10 100%)`
    : `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E"), linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 16%, #ddd6fe 32%, #fbcfe8 48%, #fecdd3 64%, #fed7aa 80%, #bbf7d0 100%)`;

  // Tab State
  const [activeView, setActiveView] = useState<"chat" | "store" | "settings">("chat");
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Compose Mail & AI Smart Reply States
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSendingCompose, setIsSendingCompose] = useState(false);

  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ label: string; body: string }[]>([]);
  const [selectedReplyIndex, setSelectedReplyIndex] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [activeReplyEmailId, setActiveReplyEmailId] = useState<string | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tokensConsumed, setTokensConsumed] = useState(0);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversationsList(data.conversations || []);
      }
    } catch (e) {
      console.error("Failed to fetch conversations", e);
    }
  };

  const saveConversation = async (convId: string, messages: any[], tokens?: number) => {
    try {
      await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: convId, 
          messages, 
          tokens_used: tokens !== undefined ? tokens : tokensConsumed 
        }),
      });
      fetchConversations();
    } catch (e) {
      console.error("Failed to save conversation", e);
    }
  };

  // Auth Redirect Guard
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchConversations();
    if (!activeConversationId) {
      setActiveConversationId(Math.random().toString(36).substring(2, 15));
      setTokensConsumed(0);
    }
  }, [activeConversationId]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      fetchIntegrationStatus();
      fetchSettings();
      fetchLocalIntegrations();
      fetchEmails().then(() => {
        fetchEmails(true);
      });
      fetchCalendarEvents();
    }
  }, [session, fetchIntegrationStatus, fetchSettings, fetchLocalIntegrations, fetchEmails, fetchCalendarEvents]);

  // Real-time Event Stream Listener (SSE)
  useEffect(() => {
    if (!session || !user?.email) return;

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
  }, [session, user?.email, fetchEmails, fetchCalendarEvents]);

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
  const handleChatSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    
    const newUserMessage = {
      id: Math.random().toString(),
      role: "user" as const,
      content: userMsg,
      timestamp: new Date()
    };
    const updatedMessagesWithUser = [...chatMessages, newUserMessage];
    useCielStore.setState({ chatMessages: updatedMessagesWithUser });
    setIsSendingChat(true);

    const currentConvId = activeConversationId || Math.random().toString(36).substring(2, 15);
    if (!activeConversationId) {
      setActiveConversationId(currentConvId);
      setTokensConsumed(0);
    }
    await saveConversation(currentConvId, updatedMessagesWithUser, tokensConsumed);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessagesWithUser.map(m => ({ role: m.role, content: m.content })),
          conversationId: currentConvId
        }),
      });

      let finalMessages = updatedMessagesWithUser;
      let addedTokens = 0;
      if (res.ok) {
        const data = await res.json();
        addedTokens = data.tokens || 0;
        const assistantMsg = {
          id: Math.random().toString(),
          role: "assistant" as const,
          content: data.text,
          timestamp: new Date()
        };
        finalMessages = [...updatedMessagesWithUser, assistantMsg];
      } else {
        const errorMsg = {
          id: Math.random().toString(),
          role: "assistant" as const,
          content: "Error communicating with the backend chatbot API.",
          timestamp: new Date()
        };
        finalMessages = [...updatedMessagesWithUser, errorMsg];
      }
      
      const newTotalTokens = tokensConsumed + addedTokens;
      setTokensConsumed(newTotalTokens);
      useCielStore.setState({ chatMessages: finalMessages });
      await saveConversation(currentConvId, finalMessages, newTotalTokens);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: Math.random().toString(),
        role: "assistant" as const,
        content: "An unexpected error occurred during chat transmission.",
        timestamp: new Date()
      };
      const finalMessages = [...updatedMessagesWithUser, errorMsg];
      useCielStore.setState({ chatMessages: finalMessages });
      await saveConversation(currentConvId, finalMessages, tokensConsumed);
    } finally {
      setIsSendingChat(false);
      fetchEmails();
      fetchCalendarEvents();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit(e);
    }
  };

  const handleStartFreshChat = () => {
    const newId = Math.random().toString(36).substring(2, 15);
    setActiveConversationId(newId);
    setTokensConsumed(0);
    useCielStore.setState({ chatMessages: [] });
  };

  const handleInitiateCompose = (to = "", subject = "") => {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeBody("");
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

  const handleInitiateSmartReply = async (email: any) => {
    setActiveReplyEmailId(email.id);
    setIsGeneratingReplies(true);
    setAiSuggestions([]);
    setSelectedReplyIndex(null);
    setReplyBody("");

    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_replies",
          subject: email.subject,
          body: email.body,
          fromName: email.from
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions || []);
      } else {
        alert("Failed to load smart replies.");
      }
    } catch (err) {
      console.error("Smart replies error", err);
    } finally {
      setIsGeneratingReplies(false);
    }
  };

  const handleSendSmartReply = async (toEmail: string, originalSubject: string) => {
    if (!replyBody.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const replySubject = originalSubject.toLowerCase().startsWith("re:") 
        ? originalSubject 
        : `Re: ${originalSubject}`;

      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          to: toEmail,
          subject: replySubject,
          body: replyBody
        })
      });

      if (res.ok) {
        setActiveReplyEmailId(null);
        setReplyBody("");
        setAiSuggestions([]);
        setSelectedReplyIndex(null);
        fetchEmails(true, 1);
      } else {
        const data = await res.json();
        alert("Failed to send reply: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to send smart reply", err);
      alert("Error sending reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSignOutClick = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          logout();
          router.push("/");
        }
      }
    });
  };

  const lastAssistantMsg = [...chatMessages].reverse().find(m => m.role === "assistant");
  const isDailyLimitReached = lastAssistantMsg?.content?.includes("Daily Limit Reached") || false;
  const isConvLimitReached = tokensConsumed >= 100000 || (lastAssistantMsg?.content?.includes("Conversation Limit Reached") || false);
  const isInputDisabled = isSendingChat || isDailyLimitReached || isConvLimitReached;

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

  return (
    <div className={`h-screen overflow-hidden relative bg-transparent ${bgClass} p-6 font-sans flex flex-col transition-all duration-300`}>
      {/* Ambient Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none overflow-hidden"
        style={{
          background: ambientBg,
        }}
      >
        <div className={`absolute top-[10%] left-[5%] w-[45vw] h-[45vw] max-w-[600px] rounded-full blur-[120px] transition-all duration-500 ${
          isDark ? "bg-indigo-500/5 animate-float-slow-1" : "bg-sky-300/25 animate-float-slow-1"
        }`} />
        <div className={`absolute bottom-[10%] right-[5%] w-[50vw] h-[50vw] max-w-[700px] rounded-full blur-[140px] transition-all duration-500 ${
          isDark ? "bg-fuchsia-500/5 animate-float-slow-2" : "bg-pink-300/25 animate-float-slow-2"
        }`} />
        <div className={`absolute top-[40%] left-[35%] w-[40vw] h-[40vw] max-w-[500px] rounded-full blur-[120px] transition-all duration-500 ${
          isDark ? "bg-violet-500/5 animate-float-slow-3" : "bg-violet-300/15 animate-float-slow-3"
        }`} />
      </div>

      {/* Floating Header */}
      <header className={`w-full backdrop-blur-xl border border-slate-200/20 dark:border-white/5 rounded-2xl px-6 py-3 mb-6 flex items-center justify-between shadow-sm transition-all duration-300 ${
        isDark ? "bg-slate-950/45" : "bg-white/45"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white tracking-tighter shadow-sm">
            C
          </div>
          <div>
            <span className={`font-bold tracking-widest text-xs uppercase ${textWhiteClass}`}>Ceil.</span>
            <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-mono ml-2 uppercase tracking-wider font-bold">Workspace Console</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass} hidden sm:inline mr-2`}>
            Node: <span className={`font-mono ${textWhiteClass}`}>{session.user.email}</span>
          </span>
          <button
            onClick={() => setActiveView(activeView === "settings" ? "chat" : "settings")}
            className={`px-3 py-1.5 border rounded-xl text-[9px] uppercase font-bold cursor-pointer transition-all ${
              activeView === "settings" ? activeTabClass : `border-slate-200/20 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ${isDark ? "bg-white/5" : "bg-slate-900/5"}`
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveView(activeView === "store" ? "chat" : "store")}
            className={`px-3 py-1.5 border rounded-xl text-[9px] uppercase font-bold cursor-pointer transition-all ${
              activeView === "store" ? activeTabClass : `border-slate-200/20 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ${isDark ? "bg-white/5" : "bg-slate-900/5"}`
            }`}
          >
            Store
          </button>
          <button
            onClick={handleSignOutClick}
            className={`px-3 py-1.5 border border-slate-200/20 dark:border-white/5 rounded-xl text-[9px] uppercase text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer ${isDark ? "bg-white/5" : "bg-slate-900/5"}`}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Integration Panels - Expanded with content when connected */}
      <section className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 min-h-0 overflow-hidden">
        {/* Gmail Panel */}
        <div className={`rounded-2xl flex flex-col ${cardBgClass} overflow-hidden transition-all duration-300 min-h-0`}>
          {/* Gmail Header */}
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Gmail Integration</h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${gmailConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-[10px] font-semibold uppercase ${gmailConnected ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{gmailConnected ? "CONNECTED" : "DISCONNECTED"}</span>
              </div>
            </div>
            <p className={`text-[11px] ${textMutedClass}`}>Corsair synchronization status for user emails.</p>
          </div>

          {gmailConnected ? (
            <div className="flex-1 flex flex-col">
              {/* Email Action Bar */}
              <div className={`px-5 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2`}>
                <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`flex-1 ${inputBgClass} border ${borderClass} text-xs px-3 py-2 outline-none rounded-xl font-mono`}
                  />
                  <button type="submit" className={`text-xs px-3 py-2 font-bold uppercase border border-slate-900/10 dark:border-white/5 rounded-xl cursor-pointer ${buttonBgClass}`}>Search</button>
                </form>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      setIsRefreshing(true);
                      try { await fetchEmails(true); } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
                    }}
                    disabled={isRefreshing}
                    className={`text-xs px-3 py-2 font-bold uppercase border border-slate-900/10 dark:border-white/5 rounded-xl cursor-pointer disabled:opacity-50 ${buttonBgClass}`}
                  >
                    {isRefreshing ? "..." : "Refresh"}
                  </button>
                  <button
                    onClick={() => handleInitiateCompose()}
                    className="px-3 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-purple-500/25 transition-colors uppercase shrink-0"
                  >
                    + Compose
                  </button>
                </div>
              </div>

              {/* Email List */}
              <div className={`flex-1 border-t ${borderClass} overflow-y-auto`}>
                {/* Pagination Header */}
                <div className={`px-5 py-2.5 flex justify-between items-center border-b ${borderClass} ${accordionHeaderBgClass}`}>
                  <span className={`text-[10px] uppercase tracking-wider ${textMutedClass}`}>
                    Inbox ({startRange}-{endRange} of {emailsTotal})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (emailsPage > 1) fetchEmails(false, emailsPage - 1); }}
                      disabled={emailsPage <= 1}
                      className={`px-2.5 py-1 border border-slate-900/10 dark:border-white/5 rounded-lg text-[9px] font-bold cursor-pointer disabled:opacity-30 uppercase ${buttonBgClass}`}
                    >
                      Prev
                    </button>
                    <span className="text-[10px] text-slate-500 font-bold px-1">{emailsPage}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextPage = emailsPage + 1;
                        if (nextPage * emailsPerPage <= emailsTotal) { fetchEmails(false, nextPage); } else { fetchEmails(true, nextPage); }
                      }}
                      disabled={!emailsHasMore && emailsPage >= Math.ceil(emailsTotal / emailsPerPage)}
                      className={`px-2.5 py-1 border border-slate-900/10 dark:border-white/5 rounded-lg text-[9px] font-bold cursor-pointer disabled:opacity-30 uppercase ${buttonBgClass}`}
                    >
                      Next
                    </button>
                  </div>
                </div>

                {emails.length === 0 ? (
                  <p className={`text-xs ${textMutedClass} p-5`}>No emails cached in database. Click Refresh or check your credentials.</p>
                ) : (
                  <div>
                    {emails.map((email) => {
                      const isExpanded = expandedEmailId === email.id;
                      const displayDate = (() => {
                        if (!mounted) return "";
                        try { return new Date(email.date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
                        catch { return email.date; }
                      })();
                      const emailBgClass = email.read
                        ? (isDark ? "bg-black/15 text-slate-400 opacity-80" : "bg-slate-900/5 text-slate-500 opacity-80")
                        : (isDark ? "bg-white/5 border-l-2 border-l-purple-500" : "bg-white/70 border-l-2 border-l-cyan-500 shadow-sm");
                      const senderTextClass = email.read ? "text-slate-500 font-normal" : (isDark ? "text-white font-bold" : "text-slate-950 font-bold");
                      const subjectTextClass = email.read ? (isDark ? "text-slate-400 font-normal" : "text-slate-500 font-normal") : (isDark ? "text-white font-bold" : "text-slate-950 font-bold");
                      const dateTextClass = email.read ? "text-slate-500 font-normal" : (isDark ? "text-purple-400 font-bold" : "text-cyan-600 font-bold");

                      return (
                        <div
                          key={email.id}
                          onClick={() => { setExpandedEmailId(isExpanded ? null : email.id); if (!email.read) markAsRead(email.id); }}
                          className={`border-b ${borderClass} ${emailBgClass} text-xs cursor-pointer hover:bg-slate-500/10 transition-all duration-200 overflow-hidden`}
                        >
                          {isExpanded ? (
                            <div className={`p-4 space-y-3 ${accordionHeaderBgClass}`}>
                              <div className={`flex flex-col sm:flex-row justify-between pb-2 border-b ${border900Class}`}>
                                <div>
                                  <span className={`font-bold ${textWhiteClass}`}>FROM: {email.from}</span>
                                  <span className="text-slate-500 ml-2">&lt;{email.fromEmail}&gt;</span>
                                </div>
                                <span className="text-slate-500 text-[10px] font-mono">{displayDate}</span>
                              </div>
                              <div><h3 className={`text-sm font-bold ${textWhiteClass} tracking-normal leading-tight`}>{email.subject}</h3></div>
                              <p className={`${isDark ? "text-slate-300" : "text-slate-700"} font-sans font-normal leading-relaxed whitespace-pre-wrap ${innerCardBgClass} p-4 border border-slate-900/5 dark:border-white/5 rounded-xl select-text`}>{email.body}</p>
                              <div className="flex gap-4 text-[10px] text-slate-500 uppercase font-semibold pt-1">
                                <span>Category: <span className={isDark ? "text-slate-400" : "text-slate-650"}>{email.category}</span></span>
                                <span>Priority: <span className={isDark ? "text-slate-400" : "text-slate-650"}>{email.priority}</span></span>
                                <span>Read: <span className={isDark ? "text-slate-400" : "text-slate-650"}>{email.read ? "yes" : "no"}</span></span>
                              </div>
                              {/* AI Reply & Compose Controls */}
                              <div className="mt-4 pt-3 border-t border-slate-900/10 dark:border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                                {activeReplyEmailId !== email.id ? (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => handleInitiateSmartReply(email)} className="px-3.5 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1.5 transition-colors">
                                      <span>✨</span> Reply with AI
                                    </button>
                                    <button onClick={() => handleInitiateCompose(email.fromEmail, `Re: ${email.subject}`)} className="px-3.5 py-1.5 border border-slate-900/10 dark:border-white/5 bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-900/10 dark:hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors">
                                      Manual Reply
                                    </button>
                                  </div>
                                ) : (
                                  <div className={`space-y-3 p-4 border border-slate-900/5 dark:border-white/5 rounded-xl ${innerCardBgClass}`}>
                                    {isGeneratingReplies && (
                                      <div className="py-4 text-center text-xs text-slate-500 font-mono animate-pulse flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                                        <span>Ciel AI is analyzing context and drafting smart replies...</span>
                                      </div>
                                    )}
                                    {!isGeneratingReplies && aiSuggestions.length > 0 && (
                                      <div className="space-y-2">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Select a reply template:</span>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          {aiSuggestions.map((sug, idx) => (
                                            <button
                                              key={idx}
                                              onClick={() => { setSelectedReplyIndex(idx); setReplyBody(sug.body); }}
                                              className={`p-3 text-left border rounded-xl transition-all duration-200 select-none cursor-pointer ${
                                                selectedReplyIndex === idx
                                                  ? (isDark ? "bg-purple-950/40 border-purple-500 text-purple-200" : "bg-purple-50 border-purple-300 text-purple-900")
                                                  : (isDark ? "bg-black/20 border-white/5 hover:border-white/10 text-slate-400" : "bg-white border-slate-200 hover:border-slate-300 text-slate-600")
                                              }`}
                                            >
                                              <div className="font-bold text-[10px] mb-1 uppercase tracking-wider">{sug.label}</div>
                                              <div className="text-[9px] line-clamp-2 leading-relaxed opacity-80">{sug.body}</div>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {(!isGeneratingReplies || replyBody) && (
                                      <div className="space-y-2">
                                        <textarea
                                          value={replyBody}
                                          onChange={(e) => setReplyBody(e.target.value)}
                                          placeholder="Select a suggestion above or type your reply manually here..."
                                          rows={4}
                                          className={`w-full text-xs p-3 outline-none rounded-xl border transition-all duration-300 ${inputBgClass} resize-none`}
                                        />
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] text-slate-500">Subject: Re: {email.subject}</span>
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => { setActiveReplyEmailId(null); setReplyBody(""); setAiSuggestions([]); setSelectedReplyIndex(null); }} className="px-3 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold uppercase text-[9px] cursor-pointer">Cancel</button>
                                            <button onClick={() => handleSendSmartReply(email.fromEmail, email.subject)} disabled={isSendingReply || !replyBody.trim()} className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold uppercase text-[9px] cursor-pointer transition-colors">
                                              {isSendingReply ? "Sending..." : "Send Reply"}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="px-4 py-3 flex items-center justify-between gap-4 whitespace-nowrap overflow-hidden transition-colors">
                              <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden">
                                <span className={`text-[10px] shrink-0 w-24 whitespace-nowrap ${dateTextClass} font-mono`}>{displayDate.split(",")[0]}</span>
                                <span className={`shrink-0 w-44 truncate whitespace-nowrap ${senderTextClass}`}>{email.from}</span>
                                <span className="truncate flex-1 block whitespace-nowrap overflow-hidden text-ellipsis">
                                  <span className={subjectTextClass}>{email.subject}</span>
                                  <span className={`${isDark ? "text-slate-550" : "text-slate-400"} font-normal ml-3 whitespace-nowrap`}>— {email.body ? email.body.substring(0, 150).replace(/\r?\n/g, " ") : ""}</span>
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 uppercase shrink-0 font-bold whitespace-nowrap">{email.category}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-5 pb-5 pt-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/auth/corsair/connect?plugin=gmail");
                    const data = await res.json();
                    if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                  } catch (e) { console.error("Failed to connect gmail:", e); }
                }}
                className={`text-center w-full py-2.5 ${buttonBgClass} border border-slate-900/10 dark:border-white/5 rounded-xl text-xs uppercase font-bold cursor-pointer`}
              >
                Connect Gmail
              </button>
            </div>
          )}
        </div>

        {/* Calendar Panel */}
        <div className={`rounded-2xl flex flex-col ${cardBgClass} overflow-hidden transition-all duration-300 min-h-0`}>
          {/* Calendar Header */}
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Google Calendar</h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${calendarConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-[10px] font-semibold uppercase ${calendarConnected ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{calendarConnected ? "CONNECTED" : "DISCONNECTED"}</span>
              </div>
            </div>
            <p className={`text-[11px] ${textMutedClass}`}>Corsair synchronization status for user schedules.</p>
          </div>

          {calendarConnected ? (
            <div className="flex-1 flex flex-col">
              {/* Calendar Action Bar */}
              <div className={`px-5 pb-3 flex items-center gap-2`}>
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try { await fetchCalendarEvents(); } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
                  }}
                  disabled={isRefreshing}
                  className={`text-xs px-3 py-2 font-bold uppercase border border-slate-900/10 dark:border-white/5 rounded-xl cursor-pointer disabled:opacity-50 ${buttonBgClass}`}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Events"}
                </button>
                <span className={`text-[10px] ${textMutedClass} font-bold uppercase`}>{calendarEvents.length} events</span>
              </div>

              {/* Calendar Event List */}
              <div className={`flex-1 border-t ${borderClass} overflow-y-auto p-4 space-y-3`}>
                {calendarEvents.length === 0 ? (
                  <p className={`text-xs ${textMutedClass}`}>No calendar events cached in database. Click Refresh or check your credentials.</p>
                ) : (
                  calendarEvents.map((evt) => (
                    <div key={evt.id} className={`border ${borderClass} p-4 ${innerCardBgClass} rounded-xl text-xs shadow-sm`}>
                      <div className={`flex flex-col sm:flex-row justify-between mb-2 pb-1.5 border-b ${borderClass}/50`}>
                        <span className={`font-bold ${textWhiteClass} tracking-tight`}>{evt.title}</span>
                        <span className="text-slate-500 font-mono">
                          {mounted ? `${new Date(evt.start).toLocaleString()} - ${new Date(evt.end).toLocaleString()}` : ""}
                        </span>
                      </div>
                      {evt.location && <p className={`mb-1 ${isDark ? "text-slate-350" : "text-slate-650"} font-sans font-normal leading-relaxed`}>Location: {evt.location}</p>}
                      {evt.attendees && evt.attendees.length > 0 && (
                        <p className={`mb-1 ${isDark ? "text-slate-350" : "text-slate-650"} font-sans font-normal leading-relaxed`}>Attendees: {evt.attendees.join(", ")}</p>
                      )}
                      {evt.description && (
                        <p className={`${isDark ? "text-slate-350" : "text-slate-700"} font-sans font-normal leading-relaxed whitespace-pre-wrap bg-slate-900/5 dark:bg-black/20 p-3 border border-slate-900/5 dark:border-white/5 rounded-xl mt-2`}>{evt.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="px-5 pb-5 pt-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/auth/corsair/connect?plugin=googlecalendar");
                    const data = await res.json();
                    if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                  } catch (e) { console.error("Failed to connect calendar:", e); }
                }}
                className={`text-center w-full py-2.5 ${buttonBgClass} border border-slate-900/10 dark:border-white/5 rounded-xl text-xs uppercase font-bold cursor-pointer`}
              >
                Connect Calendar
              </button>
            </div>
          )}
        </div>
      </section>
      {/* AI Chat — Compact Bar (Collapsed) */}
      {!chatExpanded && (
        <div className={`rounded-2xl overflow-hidden ${cardBgClass} transition-all duration-300 mt-auto shrink-0`}>
          {/* Chat Header Bar */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
              <h3 className={`font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>AI Chat</h3>
              <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-350 border border-purple-500/20 px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
                Tokens: {tokensConsumed.toLocaleString()} / 100,000
              </span>
              <span className="text-[9px] bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-900/10 dark:border-white/10 px-2 py-0.5 rounded-lg font-mono shrink-0">
                Daily Quota: 1M max
              </span>
            </div>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) fetchConversations();
              }}
              className={`text-[10px] px-3.5 py-1.5 border border-slate-900/10 dark:border-white/10 rounded-xl font-bold uppercase cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${buttonBgClass}`}
            >
              <span>History</span>
              <span className="bg-slate-900/10 dark:bg-black/20 px-1.5 py-0.2 rounded text-[9px] text-slate-500">
                {conversationsList.length}
              </span>
            </button>
          </div>

          {/* Clickable Chat Input — expands on click */}
          <div className={`px-4 pb-4`}>
            <div
              onClick={() => setChatExpanded(true)}
              className={`border ${borderClass} ${inputBgClass} rounded-2xl px-4 py-3.5 cursor-text flex items-center gap-3 hover:ring-2 hover:ring-purple-500/30 transition-all duration-200`}
            >
              <span className={`text-sm flex-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Ask Ciel to send emails, list messages, or schedule meetings...
              </span>
              <span className="text-[9px] bg-purple-600 text-white px-3 py-1.5 rounded-xl font-bold uppercase shrink-0">
                Open Chat
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat — Full Screen (Expanded) */}
      <div
        className={`fixed inset-0 z-30 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          chatExpanded
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{ background: isDark ? "rgba(11,12,16,0.97)" : "rgba(255,255,255,0.97)" }}
      >
        {/* Expanded Chat Header */}
        <div className={`shrink-0 px-6 py-4 flex items-center justify-between border-b ${borderClass} backdrop-blur-xl`}>
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
            <h3 className={`font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>AI Chat Console</h3>
            {activeConversationId && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">({activeConversationId})</span>
            )}
            <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-350 border border-purple-500/20 px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
              Tokens: {tokensConsumed.toLocaleString()} / 100,000
            </span>
            <span className="text-[9px] bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-900/10 dark:border-white/10 px-2 py-0.5 rounded-lg font-mono shrink-0">
              Daily Quota: 1M max
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartFreshChat}
              className="text-[10px] px-3.5 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-350 border border-purple-500/20 rounded-xl font-bold uppercase cursor-pointer hover:bg-purple-500/20 transition-all duration-200"
            >
              + New Chat
            </button>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) fetchConversations();
              }}
              className={`text-[10px] px-3.5 py-1.5 border border-slate-900/10 dark:border-white/10 rounded-xl font-bold uppercase cursor-pointer transition-colors flex items-center gap-1.5 ${buttonBgClass}`}
            >
              <span>History</span>
              <span className="bg-slate-900/10 dark:bg-black/20 px-1.5 py-0.2 rounded text-[9px] text-slate-500">
                {conversationsList.length}
              </span>
            </button>
            <button
              onClick={() => setChatExpanded(false)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border border-slate-900/10 dark:border-white/10 text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer text-lg font-bold ${isDark ? "bg-white/5" : "bg-slate-900/5"}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Expanded Chat Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Messages + Input */}
          <div className="flex-1 flex flex-col min-h-0 p-6">
            {/* Messages Area */}
            <div className={`flex-1 space-y-4 p-4 border border-slate-900/5 dark:border-white/5 bg-slate-900/5 dark:bg-black/10 rounded-2xl overflow-y-auto min-h-0`}>
              {chatMessages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-b from-purple-400 to-purple-700 flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-white text-xl font-bold">C</span>
                  </div>
                  <h4 className={`text-sm font-bold ${textWhiteClass} mb-1`}>Welcome to Ciel AI</h4>
                  <p className={`text-xs ${textMutedClass} max-w-sm`}>Ask me to send emails, check your calendar, schedule meetings, or answer any question.</p>
                </div>
              )}
              {chatMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)] border ${
                      isUser
                        ? (isDark ? "bg-cyan-950/40 border-cyan-800/50 text-cyan-200 rounded-tr-none" : "bg-cyan-50 border-cyan-200 text-cyan-950 rounded-tr-none")
                        : (isDark ? "bg-black/35 border-white/5 text-slate-300 font-mono rounded-tl-none" : "bg-white/80 border-slate-200 text-slate-800 rounded-tl-none")
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[9px] uppercase tracking-wider font-bold">
                        <span>{msg.role}</span>
                        <span>•</span>
                        <span>{mounted && msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                      <div className={isUser ? "font-sans leading-relaxed" : "font-mono leading-relaxed"}>
                        <MarkdownRenderer content={msg.content} isDark={isDark} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {isSendingChat && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl rounded-tl-none px-4 py-2.5 text-xs border bg-slate-100/30 dark:bg-white/5 border-slate-900/5 dark:border-white/5 text-slate-400 dark:text-slate-500 animate-pulse`}>
                    <span>Thinking and generating tool responses...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Limit Banner */}
            {(isDailyLimitReached || isConvLimitReached) && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-4">
                <span className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5">
                  <span>🚨</span>
                  {isDailyLimitReached ? (
                    <span>Daily Limit Reached: You have consumed 1M tokens today. Please upgrade to the Pro Plan.</span>
                  ) : (
                    <span>Conversation Limit Reached: Session used 100k tokens. Start a new chat or upgrade.</span>
                  )}
                </span>
                <div className="flex gap-2 shrink-0">
                  {isConvLimitReached && !isDailyLimitReached && (
                    <button
                      type="button"
                      onClick={handleStartFreshChat}
                      className="px-3.5 py-1.5 bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 rounded-xl font-bold uppercase hover:bg-red-500/20 transition-colors cursor-pointer text-[10px]"
                    >
                      New Chat
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => alert("Pro Plan upgrade portal is not available in hackathon demo mode.")}
                    className="px-3.5 py-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 rounded-xl font-bold uppercase hover:bg-purple-500/20 transition-colors cursor-pointer text-[10px]"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className={`relative border ${borderClass} ${inputBgClass} rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-600/50 transition-all mt-4`}>
              <textarea
                placeholder={
                  isDailyLimitReached 
                    ? "Daily token quota reached. Please upgrade to the Pro Plan." 
                    : isConvLimitReached 
                    ? "Conversation limit reached. Start a new chat or upgrade to Pro."
                    : "Ask Ciel to send emails, list messages, or schedule meetings..."
                }
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
                rows={3}
                className="w-full bg-transparent text-sm p-4 pb-12 outline-none resize-none disabled:opacity-50 text-slate-900 dark:text-white"
                autoFocus
              />
              <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearChat}
                  disabled={isInputDisabled}
                  className={`text-xs px-3 py-1.5 font-bold uppercase rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
                    isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-950"
                  }`}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isInputDisabled || !chatInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-650 text-white text-xs px-4 py-1.5 font-bold uppercase rounded-xl transition-colors cursor-pointer"
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          {/* Collapsible History Panel */}
          {showHistory && (
            <div className={`w-72 border-l ${borderClass} p-4 flex flex-col min-h-0 shrink-0 overflow-hidden`}>
              <div className={`flex items-center justify-between border-b ${borderClass} pb-3 mb-3`}>
                <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>
                  History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                {conversationsList.length === 0 ? (
                  <div className="text-[10px] text-slate-500 text-center py-8">
                    No saved chats.
                  </div>
                ) : (
                  conversationsList.map((conv) => {
                    const isSelected = activeConversationId === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setActiveConversationId(conv.id);
                          setTokensConsumed(conv.tokens_used || 0);
                          useCielStore.setState({ chatMessages: conv.messages || [] });
                        }}
                        className={`w-full text-left p-3 border rounded-xl transition-all duration-200 flex flex-col gap-1 cursor-pointer text-xs ${
                          isSelected
                            ? (isDark ? "bg-purple-950/30 border-purple-800 text-white" : "bg-purple-50 border-purple-300 text-purple-950")
                            : (isDark ? "bg-black/20 border-white/5 text-slate-400 hover:bg-black/35 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-black")
                        }`}
                      >
                        <span className="font-bold truncate text-[11px] block">{conv.title || "Untitled Chat"}</span>
                        <span className="text-[9px] text-slate-500 font-mono truncate">ID: {conv.id}</span>
                        {conv.tokens_used > 0 && (
                          <span className="text-[9px] text-slate-400 font-mono">Tokens: {conv.tokens_used}</span>
                        )}
                        <span className="text-[8px] text-slate-500 self-end mt-1">
                          <span className="font-mono">{new Date(conv.updated_at).toLocaleString()}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Overlay */}
      {activeView === "settings" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setActiveView("chat")}>
          <div
            className={`w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-6 ${cardBgClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center pb-4 mb-4 border-b ${border900Class}`}>
              <span className={`text-xs uppercase tracking-wider font-bold ${textWhiteClass}`}>System Preferences & Database Logs</span>
              <button onClick={() => setActiveView("chat")} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-lg cursor-pointer">×</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-5 rounded-2xl border border-slate-900/5 dark:border-white/5 space-y-4 ${innerCardBgClass}`}>
                <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Preferences</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">UI Color Theme</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSettings({ theme: "dark" })}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border uppercase cursor-pointer transition-all ${
                        theme === "dark" 
                          ? "bg-purple-500/20 text-purple-350 border-purple-500/40" 
                          : buttonBgClass
                      }`}
                    >
                      Dark (Void)
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: "light" })}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border uppercase cursor-pointer transition-all ${
                        theme === "light" 
                          ? "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" 
                          : buttonBgClass
                      }`}
                    >
                      Light (Alabaster)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Sync Interval</label>
                  <select
                    value={syncInterval}
                    onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value, 10) })}
                    className={`w-full text-xs px-3 py-2 border border-slate-900/10 dark:border-white/10 rounded-xl outline-none transition-all duration-300 ${inputBgClass}`}
                  >
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour (Default)</option>
                    <option value={720}>Every 12 hours</option>
                    <option value={1440}>Every 24 hours</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900/5 dark:border-white/5">
                  <div>
                    <label className="text-[10px] text-slate-550 uppercase font-bold block">AI Auto-Priority</label>
                    <span className="text-[9px] text-slate-500">Classify incoming emails using gpt-4o-mini</span>
                  </div>
                  <button
                    onClick={() => updateSettings({ aiAutoPriority: !aiAutoPriority })}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl uppercase cursor-pointer transition-colors ${
                      aiAutoPriority 
                        ? "bg-green-600/20 text-green-700 dark:text-green-300 border border-green-500/20" 
                        : "bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20"
                    }`}
                  >
                    {aiAutoPriority ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border border-slate-900/5 dark:border-white/5 space-y-4 ${innerCardBgClass}`}>
                <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Synced Integrations (Neon DB Cache)</h3>
                <p className="text-[10px] text-slate-500">Local records of connection status synced from Corsair:</p>
                
                {localIntegrations.length === 0 ? (
                  <p className={`text-xs ${textMutedClass} italic`}>No integration sync records found in database. Check connections above.</p>
                ) : (
                  <div className="space-y-2">
                    {localIntegrations.map((integration) => (
                      <div key={integration.id} className={`p-2.5 border rounded-xl text-xs flex justify-between items-center ${innerCardBgClass} ${borderClass}`}>
                        <div>
                          <span className={`font-bold ${textWhiteClass} uppercase`}>{integration.provider === "googlecalendar" ? "google calendar" : integration.provider}</span>
                          <span className="text-slate-500 ml-2">({integration.connected_email})</span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase ${
                          integration.status === "connected" 
                            ? "bg-green-500/10 text-green-700 dark:text-green-350" 
                            : "bg-red-500/10 text-red-700 dark:text-red-350"
                        }`}>
                          {integration.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Overlay */}
      {activeView === "store" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setActiveView("chat")}>
          <div
            className={`w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-6 ${cardBgClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center pb-4 mb-4 border-b ${border900Class}`}>
              <span className={`text-xs uppercase tracking-wider font-bold ${textWhiteClass}`}>Live Zustand Store State</span>
              <button onClick={() => setActiveView("chat")} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-lg cursor-pointer">×</button>
            </div>
            <pre className={`p-4 border ${border900Class} ${innerCardBgClass} rounded-2xl text-[10px] text-green-600 dark:text-green-400 overflow-x-auto whitespace-pre-wrap font-mono`}>
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
        </div>
      )}

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowComposeModal(false)}>
          <div 
            className={`w-full max-w-xl border border-slate-200/20 dark:border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[400px] ${cardBgClass} transition-transform duration-300 transform scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${borderClass} flex items-center justify-between ${accordionHeaderBgClass}`}>
              <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Compose New Message</h3>
              <button 
                onClick={() => setShowComposeModal(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-lg cursor-pointer"
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
                  className="px-3.5 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-605 text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors"
                >
                  {isSendingCompose ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
