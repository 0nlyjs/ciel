"use client";

import { useState, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import toast from "react-hot-toast";
import { useHotkeys } from "react-hotkeys-hook";

interface InboxTabProps {
  onInitiateCompose: (to?: string, subject?: string, body?: string) => void;
}

export function InboxTab({ onInitiateCompose }: InboxTabProps) {
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const emails = useCielStore((s) => s.emails);
  const emailsTotal = useCielStore((s) => s.emailsTotal);
  const emailsPage = useCielStore((s) => s.emailsPage);
  const emailsPerPage = useCielStore((s) => s.emailsPerPage);
  const emailsHasMore = useCielStore((s) => s.emailsHasMore);
  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const isSyncing = useCielStore((s) => s.isSyncing);
  const loadEmailsFromCache = useCielStore((s) => s.loadEmailsFromCache);
  const activeFolder = useCielStore((s) => s.activeFolder);
  const setActiveFolder = useCielStore((s) => s.setActiveFolder);
  const markAsRead = useCielStore((s) => s.markAsRead);
  const searchQuery = useCielStore((s) => s.searchQuery);
  const setSearchQuery = useCielStore((s) => s.setSearchQuery);
  const performSearch = useCielStore((s) => s.performSearch);

  const theme = useCielStore((s) => s.theme);
  const isDark = theme === "dark";

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedContextTag, setSelectedContextTag] = useState<string | null>(null);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ label: string; body: string }[]>([]);
  const [selectedReplyIndex, setSelectedReplyIndex] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [activeReplyEmailId, setActiveReplyEmailId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFolderSwitch = (folder: "all" | "sent") => {
    setIsTabLoading(true);
    setActiveFolder(folder);
    setExpandedEmailId(null);
    setTimeout(() => {
      loadEmailsFromCache();
      setIsTabLoading(false);
      fetchEmails(false, 1);
    }, 120);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      fetchEmails();
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

  const startRange = emailsTotal > 0 ? (emailsPage === 1 ? 1 : (emailsPage - 1) * emailsPerPage) : 0;
  const endRange = Math.min(emailsPage * emailsPerPage, emailsTotal);

  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const borderClass = isDark ? "border-white/5" : "border-white/20";
  const border900Class = isDark ? "border-white/10" : "border-white/30";
  const cardBgClass = isDark 
    ? "bg-transparent backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
    : "bg-transparent backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]";
  const innerCardBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const accordionHeaderBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const buttonBgClass = isDark 
    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" 
    : "bg-white/40 hover:bg-white/60 text-slate-800 border border-white/50";
  const inputBgClass = isDark 
    ? "bg-black/20 focus:bg-black/35 border-white/10 focus:border-purple-500/50 text-white" 
    : "bg-white/35 focus:bg-white/55 border-white/40 focus:border-cyan-500/50 text-slate-900";

  const expandedEmail = emails.find((e) => e.id === expandedEmailId);

  useHotkeys("1", () => {
    if (expandedEmail && expandedEmail.quickReplies?.[0]) {
      onInitiateCompose(expandedEmail.fromEmail || "", `Re: ${expandedEmail.subject || ""}`, expandedEmail.quickReplies[0]);
    }
  }, { enableOnFormTags: false }, [expandedEmail]);

  useHotkeys("2", () => {
    if (expandedEmail && expandedEmail.quickReplies?.[1]) {
      onInitiateCompose(expandedEmail.fromEmail || "", `Re: ${expandedEmail.subject || ""}`, expandedEmail.quickReplies[1]);
    }
  }, { enableOnFormTags: false }, [expandedEmail]);

  useHotkeys("3", () => {
    if (expandedEmail && expandedEmail.quickReplies?.[2]) {
      onInitiateCompose(expandedEmail.fromEmail || "", `Re: ${expandedEmail.subject || ""}`, expandedEmail.quickReplies[2]);
    }
  }, { enableOnFormTags: false }, [expandedEmail]);

  return (
    <div className={`rounded-2xl flex flex-col ${cardBgClass} overflow-hidden h-full min-h-0 w-full`}>
      <div className="h-[72px] px-5 flex items-center justify-between shrink-0 border-b border-white/5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Gmail Integration</h2>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${gmailConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className={`text-[10px] font-semibold uppercase ${gmailConnected ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{gmailConnected ? "CONNECTED" : "DISCONNECTED"}</span>
            </div>
          </div>
          <p className={`text-[11px] ${textMutedClass} truncate`}>Corsair synchronization status for user emails.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 mt-3">
        {gmailConnected ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Email Action Bar */}
            <div className="px-5 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                  onClick={() => onInitiateCompose()}
                  className="px-3 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-purple-500/25 transition-colors uppercase shrink-0"
                >
                  + Compose
                </button>
              </div>
            </div>

            {/* Pagination Header */}
            <div className={`px-5 py-2.5 flex justify-between items-center border-t border-b ${borderClass} shrink-0`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleFolderSwitch("all")}
                  className={`relative py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${
                    activeFolder === "all"
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-slate-400 hover:text-slate-655 dark:text-slate-500"
                  }`}
                >
                  Received Mails
                  {activeFolder === "all" && (
                    <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-purple-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => handleFolderSwitch("sent")}
                  className={`relative py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${
                    activeFolder === "sent"
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-slate-400 hover:text-slate-655 dark:text-slate-500"
                  }`}
                >
                  Sent Mails
                  {activeFolder === "sent" && (
                    <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-purple-500 rounded-full" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); if (emailsPage > 1) fetchEmails(false, emailsPage - 1); }}
                  disabled={emailsPage <= 1}
                  className={`px-2.5 py-1 border border-slate-900/10 dark:border-white/5 rounded-lg text-[9px] font-bold cursor-pointer disabled:opacity-30 uppercase ${buttonBgClass}`}
                >
                  Prev
                </button>
                <span className="text-[10px] text-slate-500 font-mono font-bold px-1.5">{startRange}-{endRange}</span>
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

            {/* Context Streams Filter Bar */}
            <div className={`px-5 py-2 flex items-center gap-1.5 overflow-x-auto border-b ${borderClass} shrink-0 bg-slate-500/5`}>
              <span className={`text-[9px] uppercase font-bold ${textMutedClass} mr-1 shrink-0`}>Streams:</span>
              <button
                onClick={() => setSelectedContextTag(null)}
                className={`text-[9px] px-2.5 py-1 rounded-xl font-bold uppercase cursor-pointer transition-all ${
                  selectedContextTag === null
                    ? "bg-purple-500 text-white"
                    : `${isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-900/5 text-slate-600"}`
                }`}
              >
                All
              </button>
              {(Array.from(new Set(emails.map(e => e.contextTag).filter(Boolean))) as string[]).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedContextTag(tag)}
                  className={`text-[9px] px-2.5 py-1 rounded-xl font-bold uppercase cursor-pointer transition-all ${
                    selectedContextTag === tag
                      ? "bg-purple-500 text-white"
                      : `${isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-900/5 text-slate-600"}`
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isTabLoading ? (
                <div className="divide-y divide-slate-100 dark:divide-white/5 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 space-y-3 border-b border-slate-900/5 dark:border-white/5 opacity-65">
                      <div className="flex justify-between items-center">
                        <div className="h-3.5 bg-slate-350 dark:bg-white/10 rounded w-1/4"></div>
                        <div className="h-2.5 bg-slate-350 dark:bg-white/10 rounded w-16"></div>
                      </div>
                      <div className="h-3.5 bg-slate-350 dark:bg-white/10 rounded w-2/3"></div>
                      <div className="h-2.5 bg-slate-350 dark:bg-white/10 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : emails.length === 0 ? (
                isSyncing ? (
                  <div className="p-12 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <svg className="w-5 h-5 text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider animate-pulse">Syncing Ciel Inbox...</p>
                      <p className={`text-[10px] ${textMutedClass} mt-1 max-w-[240px]`}>Securely retrieving and classifying your messages with local AI.</p>
                    </div>
                  </div>
                ) : (
                  <p className={`text-xs ${textMutedClass} p-5`}>No emails cached in database. Click Refresh or check your credentials.</p>
                )
              ) : (
                <div>
                  {(() => {
                    const filteredEmails = selectedContextTag
                      ? emails.filter(email => email.contextTag === selectedContextTag)
                      : emails;

                    if (filteredEmails.length === 0) {
                      return <p className={`text-xs ${textMutedClass} p-5`}>No emails in this stream. Try checking other streams.</p>;
                    }

                    return filteredEmails.map((email) => {
                      const isExpanded = expandedEmailId === email.id;
                      const displayDate = (() => {
                        if (!mounted) return "";
                        try { return new Date(email.date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
                        catch { return email.date; }
                      })();
                      const emailBgClass = email.read
                        ? (isDark ? "bg-black/15 text-slate-400 opacity-80" : "bg-slate-900/5 text-slate-500 opacity-80")
                        : (isDark ? "bg-white/5 border-l-2 border-l-purple-500" : "bg-white/70 border-l-2 border-l-cyan-500 shadow-sm");
                      const senderTextClass = email.read ? "text-slate-500 font-normal" : (isDark ? "text-white font-bold" : "text-slate-900 font-bold");
                      const subjectTextClass = email.read ? (isDark ? "text-slate-400 font-normal" : "text-slate-500 font-normal") : (isDark ? "text-white font-bold" : "text-slate-900 font-bold");
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
                                <span>Category: <span className={isDark ? "text-slate-400" : "text-slate-600"}>{email.category}</span></span>
                                <span>Priority: <span className={isDark ? "text-slate-400" : "text-slate-600"}>{email.priority}</span></span>
                                <span>Read: <span className={isDark ? "text-slate-400" : "text-slate-600"}>{email.read ? "yes" : "no"}</span></span>
                                {email.contextTag && (
                                  <span>Stream: <span className="text-purple-500 dark:text-purple-400 font-bold">{email.contextTag}</span></span>
                                )}
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-900/10 dark:border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                                {activeReplyEmailId !== email.id ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => handleInitiateSmartReply(email)} className="px-3.5 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1.5 transition-colors">
                                        <span>✨</span> Reply with AI
                                      </button>
                                      <button onClick={() => onInitiateCompose(email.fromEmail, `Re: ${email.subject}`)} className="px-3.5 py-1.5 border border-slate-900/10 dark:border-white/5 bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-900/10 dark:hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors">
                                        Reply
                                      </button>
                                    </div>
                                    {email.quickReplies && email.quickReplies.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Quick Replies:</span>
                                        <div className="flex flex-wrap gap-2">
                                          {email.quickReplies.map((replyText: string, idx: number) => (
                                            <button
                                              key={idx}
                                              onClick={() => onInitiateCompose(email.fromEmail, `Re: ${email.subject}`, replyText)}
                                              className="text-[9px] px-3 py-1.5 border rounded-xl font-medium cursor-pointer transition-all border-slate-900/10 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-900/5 dark:bg-white/5 hover:bg-purple-500/10 dark:hover:bg-purple-500/10"
                                            >
                                              <span className="text-purple-500 font-bold mr-1">[{idx + 1}]</span> {replyText}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold text-slate-505">Draft reply using AI:</span>
                                      <button onClick={() => setActiveReplyEmailId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase">Cancel</button>
                                    </div>
                                    {isGeneratingReplies ? (
                                      <div className="text-[11px] text-slate-505 animate-pulse">Drafting alternative replies...</div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {aiSuggestions.map((sug, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => { setSelectedReplyIndex(idx); setReplyBody(sug.body); }}
                                            className={`text-[9px] px-3 py-1.5 border rounded-xl font-bold uppercase cursor-pointer transition-all ${
                                              selectedReplyIndex === idx
                                                ? "bg-purple-600 border-purple-600 text-white"
                                                : `border-slate-900/10 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ${isDark ? "bg-white/5" : "bg-slate-900/5"}`
                                            }`}
                                          >
                                            {sug.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {(!isGeneratingReplies || replyBody) && (
                                      <div className="space-y-2">
                                        <textarea
                                          value={replyBody}
                                          onChange={(e) => setReplyBody(e.target.value)}
                                          rows={5}
                                          className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 bg-white/5 outline-none rounded-xl resize-none text-slate-900 dark:text-white"
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            onClick={() => handleSendSmartReply(email.fromEmail, email.subject)}
                                            disabled={isSendingReply || !replyBody.trim()}
                                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                                          >
                                            {isSendingReply ? "Sending..." : "Send Reply"}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-500/5 transition-colors">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-baseline justify-between mb-0.5">
                                  <span className={`${senderTextClass} truncate mr-2`}>{email.from}</span>
                                  <span className={`${dateTextClass} text-[10px] font-mono shrink-0`}>{displayDate}</span>
                                </div>
                                <p className={`${subjectTextClass} truncate text-[11px]`}>{email.subject}</p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-lg border font-mono font-bold uppercase shrink-0 ${
                                  email.priority === "high"
                                    ? (isDark ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-red-50 border-red-200 text-red-700")
                                    : (isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-650")
                                }`}>{email.priority}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
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
    </div>
  );
}
