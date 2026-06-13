"use client";

import { useState, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function Home() {
  const { data: session, isPending } = useSession();
  const status = isPending ? "loading" : session ? "authenticated" : "unauthenticated";
  
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

  // Better Auth Form States
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

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

  useEffect(() => {
    if (activeView === "chat") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchConversations();
      if (!activeConversationId) {
        setActiveConversationId(Math.random().toString(36).substring(2, 15));
        setTokensConsumed(0);
      }
    }
  }, [activeView, activeConversationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Sync Better Auth session state with Zustand store
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
      // Automatically refresh data in case tool execution made changes
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
        // Refresh emails list to show the sent mail
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

  const lastAssistantMsg = [...chatMessages].reverse().find(m => m.role === "assistant");
  const isDailyLimitReached = lastAssistantMsg?.content?.includes("Daily Limit Reached") || false;
  const isConvLimitReached = tokensConsumed >= 100000 || (lastAssistantMsg?.content?.includes("Conversation Limit Reached") || false);
  const isInputDisabled = isSendingChat || isDailyLimitReached || isConvLimitReached;

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
        <div className="max-w-md w-full border border-gray-800 bg-[#0d0e12] p-8 rounded shadow-md relative overflow-hidden">
          {/* Subtle glow accents */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00F0FF]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#FF007F]/10 rounded-full blur-2xl pointer-events-none" />

          <h1 className="text-xl font-bold text-white mb-2 tracking-widest text-center">CIEL WORKSPACE</h1>
          <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider text-center">Sentient Analytical Interface</p>
          
          {isVerificationSent ? (
            <div className="space-y-4">
              <div className="border border-green-800 bg-green-950/20 p-4 rounded text-xs text-green-300 leading-relaxed">
                <span className="font-bold block uppercase mb-1">VERIFICATION LINK DISPATCHED</span>
                A secure verification link has been sent to <span className="underline font-bold text-white">{authEmail}</span>. 
                Please check your inbox (or your developer console logs if local key is bypassed) and click the link to activate your node.
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVerificationSent(false);
                  setIsSignUp(false);
                  setAuthSuccess("");
                  setAuthError("");
                }}
                className="w-full py-2 border border-gray-700 text-gray-400 font-bold text-xs rounded hover:bg-gray-800 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[10px] leading-relaxed text-gray-400 uppercase tracking-widest text-center">
                {isSignUp ? "INITIALIZE_NEW_IDENTITY_NODE" : "AUTHORIZE_SECURE_SESSION"}
              </p>

              {authError && (
                <div className="border border-red-900 bg-red-950/20 p-3 rounded text-[11px] text-red-400 whitespace-pre-wrap">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="border border-green-900 bg-green-950/20 p-3 rounded text-[11px] text-green-400">
                  {authSuccess}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError("");
                  setAuthSuccess("");
                  setAuthLoading(true);

                  if (isSignUp) {
                    if (!authName.trim() || !authEmail.trim() || !authPassword) {
                      setAuthError("All credentials fields are required.");
                      setAuthLoading(false);
                      return;
                    }
                    await signUp.email(
                      {
                        email: authEmail.trim(),
                        password: authPassword,
                        name: authName.trim(),
                      },
                      {
                        onError: (ctx) => {
                          setAuthError(ctx.error.message || "Registration failed.");
                          setAuthLoading(false);
                        },
                        onSuccess: () => {
                          setIsVerificationSent(true);
                          setAuthLoading(false);
                        },
                      }
                    );
                  } else {
                    if (!authEmail.trim() || !authPassword) {
                      setAuthError("Email and password are required.");
                      setAuthLoading(false);
                      return;
                    }
                    await signIn.email(
                      {
                        email: authEmail.trim(),
                        password: authPassword,
                        callbackURL: "/",
                      },
                      {
                        onError: (ctx) => {
                          if (ctx.error.status === 403) {
                            setAuthError("Node is unverified. Please verify your email before logging in.");
                          } else {
                            setAuthError(ctx.error.message || "Authorization failed.");
                          }
                          setAuthLoading(false);
                        },
                        onSuccess: () => {
                          setAuthLoading(false);
                        },
                      }
                    );
                  }
                }}
                className="space-y-3"
              >
                {isSignUp && (
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">NODE_NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-[#12151e] border border-gray-800 text-xs px-3 py-2 outline-none rounded text-white focus:border-[#FF007F]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">EMAIL_ADDRESS</label>
                  <input
                    type="email"
                    placeholder="e.g. guest@ciel.app"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#12151e] border border-gray-800 text-xs px-3 py-2 outline-none rounded text-white focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">PASSWORD_SECRET</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#12151e] border border-gray-800 text-xs px-3 py-2 outline-none rounded text-white focus:border-[#00F0FF]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-200 transition-colors uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                >
                  {authLoading ? "Authorizing..." : isSignUp ? "Create Node Account" : "Access Console"}
                </button>
              </form>

              <div className="relative flex items-center justify-center my-4">
                <hr className="w-full border-gray-800" />
                <span className="absolute bg-[#0d0e12] px-2 text-[9px] text-gray-600 uppercase tracking-widest">OR</span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await signIn.social({
                      provider: "google",
                      callbackURL: "/",
                    });
                  } catch (err) {
                    console.error("Google login error", err);
                  }
                }}
                className="w-full py-2 bg-[#12151e] text-white border border-gray-800 hover:border-gray-600 font-bold text-xs rounded transition-colors uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign In with Google
              </button>

              <div className="text-center mt-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors underline uppercase tracking-wider cursor-pointer"
                >
                  {isSignUp ? "Already registered? Sign In" : "Need an account? Register Node"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard / Authenticated View
  return (
    <div className={`${activeView === "chat" ? "h-screen overflow-hidden" : "min-h-screen"} ${bgClass} p-6 font-mono flex flex-col transition-colors duration-300`}>
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
      {activeView !== "chat" && (
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
      )}

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
        {activeView !== "chat" && (
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
        )}

        {/* Tab Contents */}
        <div className={`flex-1 p-6 flex flex-col min-h-0 ${activeView === "chat" ? "" : "overflow-y-auto max-h-[50vh]"}`}>
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
                  <button
                    onClick={() => handleInitiateCompose()}
                    className="px-3 py-1 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-800/80 rounded text-[10px] font-bold cursor-pointer uppercase shrink-0"
                  >
                    + Compose Mail
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
                      } catch {
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

                            {/* AI Reply & Compose Controls */}
                            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3" onClick={(e) => e.stopPropagation()}>
                              {activeReplyEmailId !== email.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleInitiateSmartReply(email)}
                                    className="px-3 py-1.5 bg-purple-900/40 text-purple-200 hover:bg-purple-800/60 border border-purple-800/80 rounded font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1.5 transition-colors"
                                  >
                                    <span>✨</span> Reply with AI
                                  </button>
                                  <button
                                    onClick={() => handleInitiateCompose(email.fromEmail, `Re: ${email.subject}`)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold uppercase text-[10px] cursor-pointer transition-colors"
                                  >
                                    Manual Reply
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3 bg-slate-900/40 border border-slate-800/80 rounded-lg">
                                  {isGeneratingReplies && (
                                    <div className="py-4 text-center text-xs text-zinc-500 font-mono animate-pulse flex items-center justify-center gap-2">
                                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                                      <span>Ciel AI is analyzing context and drafting smart replies...</span>
                                    </div>
                                  )}

                                  {!isGeneratingReplies && aiSuggestions.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Select a reply template:</span>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {aiSuggestions.map((sug, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => {
                                              setSelectedReplyIndex(idx);
                                              setReplyBody(sug.body);
                                            }}
                                            className={`p-2.5 text-left border rounded transition-all select-none cursor-pointer ${
                                              selectedReplyIndex === idx
                                                ? "bg-purple-950/40 border-purple-500 text-purple-200"
                                                : "bg-[#141724] border-slate-800 hover:border-slate-600 text-zinc-400"
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
                                        className="w-full text-xs p-3 bg-[#141724] border border-slate-800 rounded outline-none focus:ring-1 focus:ring-purple-600 text-white resize-none"
                                      />
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500">Subject: Re: {email.subject}</span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              setActiveReplyEmailId(null);
                                              setReplyBody("");
                                              setAiSuggestions([]);
                                              setSelectedReplyIndex(null);
                                            }}
                                            className="px-2.5 py-1.5 text-zinc-500 hover:text-zinc-300 rounded font-bold uppercase text-[9px] cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSendSmartReply(email.fromEmail, email.subject)}
                                            disabled={isSendingReply || !replyBody.trim()}
                                            className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-zinc-600 text-white rounded font-bold uppercase text-[9px] cursor-pointer transition-colors"
                                          >
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
            <div className="flex flex-1 min-h-0 gap-4">
              {/* Main Chat Box */}
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Chat Header Controls */}
                <div className={`flex items-center justify-between border-b ${borderClass} pb-3`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                    <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-wider`}>Active Session</h3>
                    {activeConversationId && (
                      <span className="text-[10px] text-zinc-500 font-mono">({activeConversationId})</span>
                    )}
                    <span className="text-[9px] bg-purple-900/30 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                      Tokens: {tokensConsumed.toLocaleString()} / 100,000
                    </span>
                    <span className="text-[9px] bg-zinc-800/40 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded font-mono shrink-0">
                      Daily Quota: 1M max
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleStartFreshChat}
                      className="text-[10px] px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-800 rounded font-bold uppercase cursor-pointer transition-colors"
                    >
                      + New Chat (Fresh Context)
                    </button>
                    <button
                      onClick={() => {
                        setShowHistory(!showHistory);
                        if (!showHistory) {
                          fetchConversations();
                        }
                      }}
                      className="text-[10px] px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded font-bold uppercase cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <span>History</span>
                      <span className="bg-gray-900 px-1 py-0.2 rounded text-[9px] text-zinc-400">
                        {conversationsList.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className={`flex-1 space-y-3 ${innerCardBgClass} p-4 border ${border900Class} rounded overflow-y-auto min-h-0`}>
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="text-xs leading-relaxed flex items-start gap-1">
                      <span className={`font-bold ${msg.role === "user" ? "text-cyan-400" : "text-purple-400"} uppercase shrink-0 mt-[2px]`}>
                        [{msg.role}]:
                      </span>
                      <div className="flex-1">
                        <MarkdownRenderer content={msg.content} isDark={isDark} />
                      </div>
                    </div>
                  ))}
                  {isSendingChat && (
                    <div className="text-xs text-gray-500 animate-pulse">
                      <span>[assistant]: Thinking and generating tool responses...</span>
                    </div>
                  )}
                </div>

                {/* Limit Banner */}
                {(isDailyLimitReached || isConvLimitReached) && (
                  <div className="p-3 bg-red-950/20 border border-red-950/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-red-200 font-medium flex items-center gap-1.5">
                      <span>🚨</span>
                      {isDailyLimitReached ? (
                        <span><strong>Daily Limit Reached:</strong> You have consumed 1M tokens today. Please upgrade to the Pro Plan to continue.</span>
                      ) : (
                        <span><strong>Conversation Limit Reached:</strong> Conversation used 100k tokens. Upgrade to Pro or start a new chat.</span>
                      )}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      {isConvLimitReached && !isDailyLimitReached && (
                        <button
                          type="button"
                          onClick={handleStartFreshChat}
                          className="px-3 py-1.5 bg-red-900/40 text-red-200 border border-red-800 rounded font-bold uppercase hover:bg-red-800/60 transition-colors cursor-pointer text-[10px]"
                        >
                          New Chat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => alert("Pro Plan upgrade portal is not available in hackathon demo mode.")}
                        className="px-3 py-1.5 bg-purple-900/40 text-purple-200 border border-purple-800 rounded font-bold uppercase hover:bg-purple-800/60 transition-colors cursor-pointer text-[10px]"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                )}

                {/* Textarea Input Form */}
                <form onSubmit={handleChatSubmit} className={`relative border ${borderClass} ${inputBgClass} rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-600 transition-all`}>
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
                    className="w-full bg-transparent text-sm p-4 pb-12 outline-none resize-none disabled:opacity-50"
                  />
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearChat}
                      disabled={isInputDisabled}
                      className={`text-xs px-3 py-1.5 font-bold uppercase rounded transition-colors disabled:opacity-50 ${
                        isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
                      }`}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={isInputDisabled || !chatInput.trim()}
                      className="bg-purple-800 hover:bg-purple-700 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-600 text-white text-xs px-4 py-1.5 font-bold uppercase rounded transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>

              {/* Collapsible History Panel */}
              {showHistory && (
                <div className={`w-72 border-l ${borderClass} pl-4 flex flex-col min-h-0 shrink-0`}>
                  <div className={`flex items-center justify-between border-b ${borderClass} pb-3 mb-3`}>
                    <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-wider`}>
                      Conversation History
                    </h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 font-bold"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                    {conversationsList.length === 0 ? (
                      <div className="text-[10px] text-zinc-500 text-center py-8">
                        No saved conversations found.
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
                            className={`w-full text-left p-3 border rounded transition-all flex flex-col gap-1 cursor-pointer text-xs ${
                              isSelected
                                ? (isDark ? "bg-purple-950/30 border-purple-800 text-white" : "bg-purple-50 border-purple-300 text-purple-950")
                                : (isDark ? "bg-[#141724]/40 border-slate-800/80 text-gray-400 hover:bg-[#141724]/80 hover:text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black")
                            }`}
                          >
                            <span className="font-bold truncate text-[11px] block">{conv.title || "Untitled Chat"}</span>
                            <span className="text-[9px] text-zinc-500 font-mono truncate">ID: {conv.id}</span>
                            {conv.tokens_used > 0 && (
                              <span className="text-[9px] text-zinc-400 font-mono">Tokens: {conv.tokens_used}</span>
                            )}
                            <span className="text-[8px] text-zinc-600 self-end mt-1">
                              {new Date(conv.updated_at).toLocaleString()}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowComposeModal(false)}>
          <div 
            className={`w-full max-w-xl border rounded-lg shadow-2xl overflow-hidden flex flex-col min-h-[400px] ${cardBgClass} transition-transform duration-300 transform scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${borderClass} flex items-center justify-between`}>
              <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-wider`}>Compose New Message</h3>
              <button 
                onClick={() => setShowComposeModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-bold text-lg"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSendComposeMail} className="flex-1 flex flex-col p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">To:</label>
                <input 
                  type="email" 
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                  className="w-full text-xs p-2.5 bg-[#141724] border border-slate-800 rounded outline-none focus:ring-1 focus:ring-purple-600 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Subject:</label>
                <input 
                  type="text" 
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter email subject"
                  required
                  className="w-full text-xs p-2.5 bg-[#141724] border border-slate-800 rounded outline-none focus:ring-1 focus:ring-purple-600 text-white"
                />
              </div>
              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Message:</label>
                <textarea 
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  required
                  className="flex-1 text-xs p-3 bg-[#141724] border border-slate-800 rounded outline-none focus:ring-1 focus:ring-purple-600 text-white resize-none"
                />
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-3.5 py-2 text-zinc-500 hover:text-zinc-300 rounded font-bold uppercase text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                  className="px-4 py-2 bg-purple-800 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-zinc-600 text-white rounded font-bold uppercase text-[10px] cursor-pointer transition-colors"
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
