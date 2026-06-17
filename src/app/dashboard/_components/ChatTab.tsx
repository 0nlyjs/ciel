"use client";

import { useState, useEffect, useRef } from "react";
import { useCielStore } from "@/store/useCielStore";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useTextToSpeech } from "@/lib/speech";

const getWelcomeMessage = (gmailConnected: boolean, calendarConnected: boolean) => {
  if (gmailConnected && calendarConnected) {
    return "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Gmail and Google Calendar. How may I assist you with your inbox or schedule today?";
  } else if (gmailConnected) {
    return "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Gmail. Please connect your Google Calendar integration if you also want to enable calendar scheduling. How may I assist you with your inbox today?";
  } else if (calendarConnected) {
    return "Hello, I am Ciel, your sentient AI workspace mind. I have established synchronization with your Google Calendar. Please connect your Gmail integration if you also want to enable email automation. How may I assist you with your schedule today?";
  } else {
    return "Hello, I am Ciel, your sentient AI workspace mind. Please connect your Gmail and Google Calendar integrations to enable email automation and calendar scheduling. How may I assist you today?";
  }
};

export function ChatTab() {
  const chatMessages = useCielStore((s) => s.chatMessages);
  const clearChat = useCielStore((s) => s.clearChat);
  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const fetchCalendarEvents = useCielStore((s) => s.fetchCalendarEvents);
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);

  const isDark = true;

  // Local Chat / NLP UI states
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tokensConsumed, setTokensConsumed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Always keep the textarea focused
  useEffect(() => {
    textareaRef.current?.focus();
  }, [isSendingChat, chatMessages]);

  // Dynamically update the initial greeting content when connection status resolves
  useEffect(() => {
    if (chatMessages.length === 1 && chatMessages[0].id.startsWith("init")) {
      const welcomeMsg = getWelcomeMessage(gmailConnected, calendarConnected);
      if (chatMessages[0].content !== welcomeMsg) {
        useCielStore.setState({
          chatMessages: [
            {
              ...chatMessages[0],
              content: welcomeMsg,
            }
          ]
        });
      }
    }
  }, [gmailConnected, calendarConnected, chatMessages]);

  // Global keydown handler to keep textarea active when typing anywhere
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") {
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

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

  const saveConversation = async (
    convId: string,
    messages: any[],
    tokens?: number,
  ) => {
    try {
      await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: convId,
          messages,
          tokens_used: tokens !== undefined ? tokens : tokensConsumed,
        }),
      });
      fetchConversations();
    } catch (e) {
      console.error("Failed to save conversation", e);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchConversations();
    if (!activeConversationId) {
      setActiveConversationId(Math.random().toString(36).substring(2, 15));
      setTokensConsumed(0);
      shouldSpeakRef.current = true;
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingChat]);

  const handleChatSubmit = async (
    e?: React.SyntheticEvent,
    isFreshStart?: boolean,
  ) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    // Stop any ongoing speech when user sends a new message
    stop();

    if (isFreshStart) {
      useCielStore.setState({ chatMessages: [] });
    }

    const userMsg = chatInput.trim();
    setChatInput("");

    const newUserMessage = {
      id: Math.random().toString(),
      role: "user" as const,
      content: userMsg,
      timestamp: new Date(),
    };
    const currentMessages = useCielStore.getState().chatMessages;
    const updatedMessagesWithUser = [...currentMessages, newUserMessage];
    useCielStore.setState({ chatMessages: updatedMessagesWithUser });
    setIsSendingChat(true);
    shouldSpeakRef.current = true;

    const freshConvId = Math.random().toString(36).substring(2, 15);
    const currentConvId = isFreshStart
      ? freshConvId
      : activeConversationId || freshConvId;

    const currentTokens = isFreshStart ? 0 : tokensConsumed;

    if (isFreshStart || !activeConversationId) {
      setActiveConversationId(currentConvId);
      setTokensConsumed(0);
    }
    await saveConversation(
      currentConvId,
      updatedMessagesWithUser,
      currentTokens,
    );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessagesWithUser.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId: currentConvId,
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
          timestamp: new Date(),
        };
        finalMessages = [...updatedMessagesWithUser, assistantMsg];
      } else {
        const errorMsg = {
          id: Math.random().toString(),
          role: "assistant" as const,
          content: "Error communicating with the backend chatbot API.",
          timestamp: new Date(),
        };
        finalMessages = [...updatedMessagesWithUser, errorMsg];
      }

      const newTotalTokens = currentTokens + addedTokens;
      setTokensConsumed(newTotalTokens);
      useCielStore.setState({ chatMessages: finalMessages });
      await saveConversation(currentConvId, finalMessages, newTotalTokens);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        id: Math.random().toString(),
        role: "assistant" as const,
        content: "An unexpected error occurred during chat transmission.",
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessagesWithUser, errorMsg];
      useCielStore.setState({ chatMessages: finalMessages });
      await saveConversation(currentConvId, finalMessages, currentTokens);
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
    stop();
    const newId = Math.random().toString(36).substring(2, 15);
    setActiveConversationId(newId);
    setTokensConsumed(0);
    shouldSpeakRef.current = true;
    useCielStore.setState({
      chatMessages: [
        {
          id: "init-" + Math.random().toString(36).substring(2, 9),
          role: "assistant",
          content: getWelcomeMessage(gmailConnected, calendarConnected),
          timestamp: new Date(),
        },
      ],
    });
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (deletingIds.includes(convId)) return;

    setDeletingIds((prev) => [...prev, convId]);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: convId }),
      });
      if (res.ok) {
        await fetchConversations();
        if (activeConversationId === convId) {
          handleStartFreshChat();
        }
      } else {
        alert("Failed to delete chat history.");
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== convId));
    }
  };

  const lastAssistantMsg = [...chatMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  const isDailyLimitReached =
    lastAssistantMsg?.content?.includes("Daily Limit Reached") || false;
  const isConvLimitReached =
    tokensConsumed >= 100000 ||
    lastAssistantMsg?.content?.includes("Conversation Limit Reached") ||
    false;
  const isInputDisabled =
    isSendingChat || isDailyLimitReached || isConvLimitReached;

  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const borderClass = isDark ? "border-white/5" : "border-white/20";
  const cardBgClass = isDark
    ? "bg-transparent backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
    : "bg-transparent backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]";
  const inputBgClass = isDark
    ? "bg-black/20 focus:bg-black/35 border-white/10 focus:border-purple-500/50 text-white"
    : "bg-white/35 focus:bg-white/55 border-white/40 focus:border-cyan-500/50 text-slate-900";
  const buttonBgClass = isDark
    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
    : "bg-white/40 hover:bg-white/60 text-slate-800 border border-white/50";

  // TTS settings
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsDropdownOpen, setTtsDropdownOpen] = useState(false);
  const [selectedLocalVoice, setSelectedLocalVoice] = useState("");
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Array<{ name: string; lang: string; gender: string }>>([]);

  const { speak, stop, getAvailableVoices, previewVoice } = useTextToSpeech();

  // Auto-select default voice: Google UK English Female once voices are loaded
  useEffect(() => {
    const updateVoices = () => {
      const voices = getAvailableVoices();
      setAvailableVoices(voices);
      if (voices.length > 0) {
        // Prefer "Google" UK female voice, fallback to any female voice, then first available
        const defaultVoice =
          voices.find(
            (v) =>
              v.name.includes("Google") &&
              v.lang === "en-GB" &&
              v.gender === "female",
          ) || 
          voices.find((v) => v.gender === "female") || 
          voices[0];
        if (defaultVoice) {
          setSelectedLocalVoice(defaultVoice.name);
        }
      }
    };

    // Try immediately
    updateVoices();

    // Listen for speech synthesis voices loaded asynchronously by the browser
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      };
    }
  }, []);

  // Track last spoken message ID to auto-speak new assistant messages
  const lastSpokenIdRef = useRef<string | null>(null);
  const shouldSpeakRef = useRef(false);

  // Auto-speak new assistant messages when TTS is enabled
  useEffect(() => {
    if (!ttsEnabled) return;
    if (isSendingChat) return;
    if (!selectedLocalVoice) return; // Wait until local voice selection is resolved
    if (!shouldSpeakRef.current) return;

    const lastMsg = chatMessages[chatMessages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.role !== "assistant") return;
    if (lastSpokenIdRef.current === lastMsg.id) return;

    shouldSpeakRef.current = false;
    lastSpokenIdRef.current = lastMsg.id;
    speak(lastMsg.content, selectedLocalVoice);
  }, [chatMessages, isSendingChat, ttsEnabled, speak, selectedLocalVoice]);

  // Stop TTS when turning it off
  const handleTtsToggle = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    if (!next) {
      stop();
    }
  };

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ttsDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setTtsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ttsDropdownOpen]);

  return (
    <div
      className={`rounded-2xl overflow-hidden ${cardBgClass} flex flex-col h-full min-h-0 w-full`}
    >
      <div className="shrink-0 px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
          <h3
            className={`font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}
          >
            AI Chat
          </h3>
          {activeConversationId && (
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              ({activeConversationId})
            </span>
          )}
          <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
            Tokens: {tokensConsumed.toLocaleString()} / 100,000
          </span>
          <span className="text-[9px] bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-900/10 dark:border-white/10 px-2 py-0.5 rounded-lg font-mono shrink-0">
            Daily Quota: 1M max
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartFreshChat}
            className="text-[10px] px-3.5 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-350 border border-purple-500/20 rounded-xl font-bold uppercase cursor-pointer hover:bg-purple-500/20 transition-all"
          >
            + New Chat
          </button>
          {/* TTS Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setTtsDropdownOpen(!ttsDropdownOpen)}
              className={`text-[10px] px-3.5 py-1.5 rounded-xl font-bold uppercase cursor-pointer transition-all flex items-center gap-1.5 shrink-0 border ${
                ttsEnabled
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                  : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
              }`}
              title={ttsEnabled ? "Voice settings" : "Voice disabled"}
            >
              {ttsEnabled ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
              )}
              <span>{ttsEnabled ? "Voice" : "Muted"}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${ttsDropdownOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {ttsDropdownOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-60 rounded-xl border z-50 overflow-hidden shadow-xl ${
                  isDark
                    ? "bg-zinc-950 border-white/10"
                    : "bg-white border-slate-200"
                }`}
              >
                {/* Enable/Disable Toggle */}
                <div
                  className={`px-4 py-3 flex items-center justify-between border-b ${
                    isDark ? "border-white/5" : "border-slate-100"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${textWhiteClass}`}
                  >
                    Voice
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTtsToggle();
                    }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      ttsEnabled
                        ? "bg-purple-500"
                        : isDark
                          ? "bg-zinc-700"
                          : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                        ttsEnabled ? "left-4.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Local Voice Picker */}
                {ttsEnabled && (
                  <div className="px-4 py-3">
                    <div className="flex flex-col gap-2.5 mt-1">
                      {availableVoices.map((voice) => {
                        const isSelected = selectedLocalVoice === voice.name;
                        return (
                          <div
                            key={voice.name}
                            onClick={() => setSelectedLocalVoice(voice.name)}
                            className="flex items-center gap-1.5 cursor-pointer"
                          >
                            {/* custom radio button styling */}
                            <div
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected
                                  ? "border-purple-500 bg-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                  : isDark
                                    ? "border-white/20 bg-white/5"
                                    : "border-slate-300 bg-slate-50"
                              }`}
                            >
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              )}
                            </div>
                            <span
                              className={`text-[11px] font-bold transition-colors ${
                                isSelected
                                  ? "text-purple-400"
                                  : textMutedClass
                              }`}
                            >
                              {voice.gender === "female" ? "Female" : "Male"}
                            </span>
                            
                            {/* Short preview button icon */}
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                previewVoice(voice.name);
                              }}
                              className={`p-1 rounded transition-colors ${
                                isDark
                                  ? "hover:bg-white/10 text-slate-400 hover:text-white"
                                  : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                              }`}
                              title="Preview voice"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const nextShowHistory = !showHistory;
              setShowHistory(nextShowHistory);
              if (nextShowHistory) {
                fetchConversations();
              }
            }}
            className={`text-[10px] px-3.5 py-1.5 border border-slate-900/10 dark:border-white/10 rounded-xl font-bold uppercase cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${buttonBgClass}`}
          >
            <span>History</span>
            <span className="bg-slate-900/10 dark:bg-black/20 px-1.5 py-0.2 rounded text-[9px] text-slate-500">
              {conversationsList.length}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden mt-3">
        {/* Messages + Input */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <div className="flex-1 space-y-4 p-4 border border-slate-900/5 dark:border-white/5 bg-slate-900/5 dark:bg-black/10 rounded-2xl overflow-y-auto min-h-0">
            {chatMessages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-purple-400 to-purple-700 flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-white text-xl font-bold">C</span>
                </div>
                <h4 className={`text-sm font-bold ${textWhiteClass} mb-1`}>
                  Welcome to Ciel AI
                </h4>
                <p className={`text-xs ${textMutedClass} max-w-sm mb-4`}>
                  Ask me to send emails, check your calendar, schedule meetings,
                  or answer any question.
                </p>
                {(!gmailConnected || !calendarConnected) && (
                  <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-350 rounded-xl text-xs max-w-sm font-semibold flex flex-col gap-1">
                    <span className="font-bold">⚠️ Integration Required</span>
                    <span>
                      Please connect your{" "}
                      {!gmailConnected && !calendarConnected
                        ? "Gmail account and Google Calendar"
                        : !gmailConnected
                          ? "Gmail account"
                          : "Google Calendar"}{" "}
                      to enable full agent automation.
                    </span>
                  </div>
                )}
              </div>
            )}
            {chatMessages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)] border ${
                      isUser
                        ? isDark
                          ? "bg-cyan-950/40 border-cyan-800/50 text-cyan-200 rounded-tr-none"
                          : "bg-cyan-50 border-cyan-200 text-cyan-950 rounded-tr-none"
                        : isDark
                          ? "bg-black/35 border-white/5 text-slate-300 font-mono rounded-tl-none"
                          : "bg-white/80 border-slate-200 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 opacity-60 text-[9px] uppercase tracking-wider font-bold">
                        <span>{msg.role}</span>
                        <span>•</span>
                        <span>
                          {mounted && msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                    <div
                      className={
                        isUser
                          ? "font-sans leading-relaxed"
                          : "font-mono leading-relaxed"
                      }
                    >
                      <MarkdownRenderer content={msg.content} isDark={isDark} />
                    </div>
                  </div>
                </div>
              );
            })}
            {isSendingChat && (
              <div className="flex justify-start">
                <div
                  className={`rounded-2xl rounded-tl-none px-4 py-2.5 text-xs border bg-slate-100/30 dark:bg-white/5 border-slate-900/5 dark:border-white/5 text-slate-400 dark:text-slate-500 animate-pulse`}
                >
                  <span>Thinking and generating tool responses...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Limit Banner */}
          {(isDailyLimitReached || isConvLimitReached) && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-3">
              <span className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5">
                <span>🚨</span>
                {isDailyLimitReached ? (
                  <span>
                    Daily Limit Reached: You have consumed 1M tokens today.
                    Please upgrade to the Pro Plan.
                  </span>
                ) : (
                  <span>
                    Conversation Limit Reached: Session used 100k tokens. Start
                    a new chat or upgrade.
                  </span>
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
                  onClick={() =>
                    alert(
                      "Pro Plan upgrade portal is not available in hackathon demo mode.",
                    )
                  }
                  className="px-3.5 py-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 rounded-xl font-bold uppercase hover:bg-purple-500/20 transition-colors cursor-pointer text-[10px]"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleChatSubmit}
            className={`relative border ${borderClass} ${inputBgClass} rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-600/50 transition-all mt-3 shrink-0`}
          >
            <textarea
              ref={textareaRef}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
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
                onClick={() => setChatInput("")}
                disabled={isInputDisabled || !chatInput.trim()}
                className={`text-xs px-3 py-1.5 font-bold uppercase rounded-xl transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
                  isDark
                    ? "text-slate-500 hover:text-white"
                    : "text-slate-400 hover:text-slate-950"
                }`}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isInputDisabled || !chatInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white text-xs px-4 py-1.5 font-bold uppercase rounded-xl transition-colors cursor-pointer"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Collapsible History Panel */}
        {showHistory && (
          <div
            className={`w-72 border-l ${borderClass} p-4 flex flex-col min-h-0 shrink-0 overflow-hidden`}
          >
            <div
              className={`flex items-center justify-between border-b ${borderClass} pb-3 mb-3`}
            >
              <h3
                className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}
              >
                History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-sm text-slate-500 hover:text-slate-950 dark:hover:text-white font-bold cursor-pointer"
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
                  const isDeleting = deletingIds.includes(conv.id);
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        if (isDeleting) return;
                        setActiveConversationId(conv.id);
                        setTokensConsumed(conv.tokens_used || 0);
                        useCielStore.setState({
                          chatMessages: conv.messages || [],
                        });
                      }}
                      role="button"
                      tabIndex={0}
                      className={`w-full text-left p-3 border rounded-xl transition-all duration-200 flex flex-col gap-1 text-xs group relative ${
                        isDeleting
                          ? "opacity-40 pointer-events-none select-none bg-slate-900/10 dark:bg-black/10 border-white/5 text-slate-500"
                          : "cursor-pointer"
                      } ${
                        isSelected && !isDeleting
                          ? isDark
                            ? "bg-purple-950/30 border-purple-800 text-white"
                            : "bg-purple-55 border-purple-300 text-purple-950"
                          : !isDeleting
                            ? isDark
                              ? "bg-black/20 border-white/5 text-slate-400 hover:bg-black/35 hover:text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-black"
                            : ""
                      }`}
                    >
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        disabled={isDeleting}
                        className={`absolute top-2.5 right-2.5 transition-opacity p-1 bg-red-500/10 text-slate-400 rounded-md border-0 outline-none ${
                          isDeleting
                            ? "opacity-50 cursor-not-allowed text-red-500/55"
                            : "opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 cursor-pointer"
                        }`}
                        title="Delete Chat"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>

                      <span className="font-bold truncate text-[11px] block pr-6">
                        {conv.title || "Untitled Chat"}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono truncate">
                        ID: {conv.id}
                      </span>
                      {conv.tokens_used > 0 && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          Tokens: {conv.tokens_used}
                        </span>
                      )}
                      <span className="text-[8px] text-slate-500 self-end mt-1">
                        <span className="font-mono">
                          {new Date(conv.updated_at).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
