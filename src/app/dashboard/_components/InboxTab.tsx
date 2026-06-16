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
  const loadEmailsFromCache = useCielStore((s) => s.loadEmailsFromCache);
  const activeFolder = useCielStore((s) => s.activeFolder);
  const setActiveFolder = useCielStore((s) => s.setActiveFolder);
  const markAsRead = useCielStore((s) => s.markAsRead);
  const searchQuery = useCielStore((s) => s.searchQuery);
  const setSearchQuery = useCielStore((s) => s.setSearchQuery);
  const performSearch = useCielStore((s) => s.performSearch);
  
  // Selected email state (Zustand coordinates)
  const selectedEmailIndex = useCielStore((s) => s.selectedEmailIndex);
  const setSelectedEmailIndex = useCielStore((s) => s.setSelectedEmailIndex);

  const isDark = true;

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPageSyncing, setIsPageSyncing] = useState(false);
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
    setSelectedEmailIndex(null);
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
        toast.success("AI smart reply sent!");
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

  const handleNextPage = async () => {
    if (isPageSyncing) return;
    const nextPage = emailsPage + 1;
    
    // Move immediately in the UI to range 51-100 (etc) and show sync skeleton
    setIsPageSyncing(true);
    
    try {
      // Trigger sync for the next batch
      await fetchEmails(true, nextPage);
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync next page of emails");
    } finally {
      setIsPageSyncing(false);
    }
  };

  const handlePrevPage = async () => {
    if (emailsPage > 1) {
      // Allow going back immediately loading from cached DB entries without blocking sync
      fetchEmails(false, emailsPage - 1);
    }
  };

  const startRange = emailsTotal > 0 ? (emailsPage === 1 ? 1 : (emailsPage - 1) * emailsPerPage + 1) : 0;
  const endRange = Math.min(emailsPage * emailsPerPage, emailsTotal);

  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const borderClass = isDark ? "border-white/5" : "border-white/20";
  const border900Class = isDark ? "border-white/10" : "border-white/30";
  
  // Custom Glass classes for Split-Pane panels
  const panelBgClass = "bg-white/5 dark:bg-black/10 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl rounded-2xl";
  const innerCardBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const accordionHeaderBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const buttonBgClass = isDark 
    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" 
    : "bg-white/40 hover:bg-white/60 text-slate-800 border border-white/50";
  const inputBgClass = isDark 
    ? "bg-black/20 focus:bg-black/35 border-white/10 focus:border-purple-500/50 text-white" 
    : "bg-white/35 focus:bg-white/55 border-white/40 focus:border-cyan-500/50 text-slate-900";

  // Filtered emails list
  const filteredEmails = selectedContextTag
    ? emails.filter(email => email.contextTag === selectedContextTag)
    : emails;

  // Selected Email matching
  const activeEmail = selectedEmailIndex !== null && filteredEmails[selectedEmailIndex] 
    ? filteredEmails[selectedEmailIndex] 
    : null;

  useHotkeys("1", () => {
    if (activeEmail && activeEmail.quickReplies?.[0]) {
      onInitiateCompose(activeEmail.fromEmail || "", `Re: ${activeEmail.subject || ""}`, activeEmail.quickReplies[0]);
    }
  }, { enableOnFormTags: false }, [activeEmail]);

  useHotkeys("2", () => {
    if (activeEmail && activeEmail.quickReplies?.[1]) {
      onInitiateCompose(activeEmail.fromEmail || "", `Re: ${activeEmail.subject || ""}`, activeEmail.quickReplies[1]);
    }
  }, { enableOnFormTags: false }, [activeEmail]);

  useHotkeys("3", () => {
    if (activeEmail && activeEmail.quickReplies?.[2]) {
      onInitiateCompose(activeEmail.fromEmail || "", `Re: ${activeEmail.subject || ""}`, activeEmail.quickReplies[2]);
    }
  }, { enableOnFormTags: false }, [activeEmail]);

  return (
    <div className="flex gap-6 h-full min-h-0 w-full">
      
      {/* LEFT PANE: Email List */}
      <div className={`flex-1 flex flex-col min-h-0 ${panelBgClass} overflow-hidden`}>
        {/* Header with connection indicators */}
        <div className="h-[72px] px-5 flex items-center justify-between shrink-0 border-b border-white/5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal`}>Gmail Inbox</h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${gmailConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-[10px] font-semibold uppercase ${gmailConnected ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{gmailConnected ? "CONNECTED" : "DISCONNECTED"}</span>
              </div>
            </div>
            <p className={`text-[11px] ${textMutedClass} truncate`}>Syncing and classifying messages with local AI.</p>
          </div>
        </div>

        {gmailConnected ? (
          <div className="flex-1 flex flex-col min-h-0 mt-3">
            {/* Search and Compose bar */}
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
                  className="px-3 py-2 bg-purple-500/10 text-purple-650 dark:text-purple-300 border border-purple-500/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-purple-500/25 transition-colors uppercase shrink-0"
                >
                  + Compose
                </button>
              </div>
            </div>

            {/* Folder Switching / Pagination */}
            <div className={`px-5 py-2.5 flex justify-between items-center border-t border-b ${borderClass} shrink-0`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleFolderSwitch("all")}
                  className={`relative py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${
                    activeFolder === "all" ? "text-purple-600 dark:text-purple-400" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Inbox
                  {activeFolder === "all" && (
                    <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-purple-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => handleFolderSwitch("sent")}
                  className={`relative py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${
                    activeFolder === "sent" ? "text-purple-600 dark:text-purple-400" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  Sent Mails
                  {activeFolder === "sent" && (
                    <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-purple-500 rounded-full" />
                  )}
                </button>
              </div>
              
              {/* Pagination controls with the requested syncing rules */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevPage}
                  disabled={emailsPage <= 1}
                  className={`px-2.5 py-1 border border-slate-900/10 dark:border-white/5 rounded-lg text-[9px] font-bold cursor-pointer disabled:opacity-30 uppercase ${buttonBgClass}`}
                >
                  Prev
                </button>
                <span className="text-[10px] text-slate-500 font-mono font-bold px-1.5">{startRange}-{endRange}</span>
                <button
                  onClick={handleNextPage}
                  disabled={isPageSyncing || (!emailsHasMore && emailsPage >= Math.ceil(emailsTotal / emailsPerPage))}
                  className={`px-2.5 py-1 border border-slate-900/10 dark:border-white/5 rounded-lg text-[9px] font-bold cursor-pointer disabled:opacity-30 uppercase ${buttonBgClass}`}
                >
                  Next
                </button>
              </div>
            </div>

            {/* Context streams */}
            <div className={`px-5 py-2 flex items-center gap-1.5 overflow-x-auto border-b ${borderClass} shrink-0 bg-slate-500/5`}>
              <span className={`text-[9px] uppercase font-bold ${textMutedClass} mr-1 shrink-0`}>Streams:</span>
              <button
                onClick={() => setSelectedContextTag(null)}
                className={`text-[9px] px-2.5 py-1 rounded-xl font-bold uppercase cursor-pointer transition-all ${
                  selectedContextTag === null ? "bg-purple-500 text-white" : `${isDark ? "bg-white/5 text-slate-400" : "bg-slate-900/5 text-slate-600"}`
                }`}
              >
                All
              </button>
              {(Array.from(new Set(emails.map(e => e.contextTag).filter(Boolean))) as string[]).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedContextTag(tag)}
                  className={`text-[9px] px-2.5 py-1 rounded-xl font-bold uppercase cursor-pointer transition-all ${
                    selectedContextTag === tag ? "bg-purple-500 text-white" : `${isDark ? "bg-white/5 text-slate-400" : "bg-slate-900/5 text-slate-655"}`
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* List Panel Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isTabLoading || isPageSyncing ? (
                /* Loading Skeleton or Syncing Animation */
                <div className="divide-y divide-slate-100 dark:divide-white/5 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 space-y-3 border-b border-slate-900/5 dark:border-white/5 opacity-65">
                      <div className="flex justify-between items-center">
                        <div className="h-3.5 bg-slate-350 dark:bg-white/10 rounded w-1/4"></div>
                        <div className="h-2.5 bg-slate-350 dark:bg-white/10 rounded w-16"></div>
                      </div>
                      <div className="h-3.5 bg-slate-350 dark:bg-white/10 rounded w-2/3"></div>
                    </div>
                  ))}
                  <div className="p-4 text-center text-xs text-slate-500 italic animate-pulse">
                    Synchronizing Next Batch ({startRange}-{endRange})...
                  </div>
                </div>
              ) : filteredEmails.length === 0 ? (
                <p className={`text-xs ${textMutedClass} p-5`}>No emails found in this cache view.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredEmails.map((email, idx) => {
                    const isSelected = selectedEmailIndex === idx;
                    const displayDate = (() => {
                      if (!mounted) return "";
                      try { return new Date(email.date).toLocaleDateString([], { month: "short", day: "numeric" }); }
                      catch { return email.date; }
                    })();
                    
                    return (
                      <div
                        key={email.id}
                        onClick={() => {
                          setSelectedEmailIndex(idx);
                          if (!email.read) markAsRead(email.id);
                        }}
                        className={`px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors duration-200 border-l-2 ${
                          isSelected
                            ? "bg-white/10 dark:bg-white/5 border-l-purple-500" 
                            : email.read 
                              ? "border-l-transparent text-slate-400 opacity-70 hover:bg-white/5" 
                              : "border-l-cyan-500 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className={`text-xs truncate mr-2 ${email.read ? "font-normal" : "font-bold text-slate-900 dark:text-white"}`}>{email.from}</span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">{displayDate}</span>
                          </div>
                          <p className={`text-[11px] truncate ${email.read ? "text-slate-500" : "font-bold text-slate-800 dark:text-slate-205"}`}>{email.subject}</p>
                        </div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-lg border font-mono font-bold uppercase shrink-0 ${
                          email.priority === "high"
                            ? "bg-red-500/10 border-red-500/30 text-red-500"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}>{email.priority}</span>
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

      {/* RIGHT PANE: Email Detail View */}
      <div className={`flex-[1.5] flex flex-col min-h-0 ${panelBgClass} overflow-hidden p-6`}>
        {activeEmail ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4">
            
            {/* Header info */}
            <div className={`pb-4 border-b ${border900Class} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
              <div>
                <span className={`font-bold ${textWhiteClass}`}>FROM: {activeEmail.from}</span>
                <span className="text-slate-500 text-xs ml-2">&lt;{activeEmail.fromEmail}&gt;</span>
              </div>
              <span className="text-slate-500 text-xs font-mono">
                {mounted && new Date(activeEmail.date).toLocaleString()}
              </span>
            </div>

            {/* Subject */}
            <div>
              <h2 className={`text-base font-bold tracking-tight ${textWhiteClass}`}>{activeEmail.subject}</h2>
              <div className="flex gap-4 text-[10px] text-slate-500 uppercase font-semibold mt-2">
                <span>Category: <span className="text-cyan-500">{activeEmail.category}</span></span>
                <span>Priority: <span className={activeEmail.priority === "high" ? "text-red-400" : "text-slate-400"}>{activeEmail.priority}</span></span>
                {activeEmail.contextTag && (
                  <span>Stream: <span className="text-purple-450 font-bold">{activeEmail.contextTag}</span></span>
                )}
              </div>
            </div>

            {/* Content Body */}
            {(() => {
              const isHtml = activeEmail.body.includes("<html") || activeEmail.body.includes("<div") || activeEmail.body.includes("<p>") || activeEmail.body.includes("<br") || activeEmail.body.includes("<table") || activeEmail.body.includes("<style");
              const iframeSrcDoc = isHtml
                ? activeEmail.body
                : `<html><head><style>body { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13.5px; line-height: 1.6; color: #1f2937; background: #ffffff; white-space: pre-wrap; word-break: break-word; padding: 16px; margin: 0; }</style></head><body>${activeEmail.body}</body></html>`;
              
              const containerBg = "bg-white";
              
              return (
                <div className={`w-full flex-1 min-h-[350px] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden ${containerBg}`}>
                  <iframe
                    title="Email Body"
                    srcDoc={iframeSrcDoc}
                    className={`w-full h-full border-none ${containerBg}`}
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                  />
                </div>
              );
            })()}

            {/* AI Reply Controls */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              {activeReplyEmailId !== activeEmail.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleInitiateSmartReply(activeEmail)} className="px-3.5 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1.5 transition-colors">
                      <span>✨</span> Reply with AI
                    </button>
                    <button onClick={() => onInitiateCompose(activeEmail.fromEmail, `Re: ${activeEmail.subject}`)} className="px-3.5 py-2 border border-slate-900/10 dark:border-white/5 bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-900/10 dark:hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors">
                      Reply
                    </button>
                  </div>
                  {activeEmail.quickReplies && activeEmail.quickReplies.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Quick Replies:</span>
                      <div className="flex flex-wrap gap-2">
                        {activeEmail.quickReplies.map((replyText: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => onInitiateCompose(activeEmail.fromEmail, `Re: ${activeEmail.subject}`, replyText)}
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
                    <span className="text-[10px] uppercase font-bold text-slate-500">Draft reply using AI:</span>
                    <button onClick={() => setActiveReplyEmailId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase">Cancel</button>
                  </div>
                  {isGeneratingReplies ? (
                    <div className="text-[11px] text-slate-500 animate-pulse">Drafting alternative replies...</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedReplyIndex(idx); setReplyBody(sug.body); }}
                          className={`text-[9px] px-3 py-1.5 border rounded-xl font-bold uppercase cursor-pointer transition-all ${
                            selectedReplyIndex === idx
                              ? "bg-purple-650 border-purple-600 text-white"
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
                          onClick={() => handleSendSmartReply(activeEmail.fromEmail, activeEmail.subject)}
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
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="text-3xl mb-3">📥</span>
            <h3 className={`text-sm font-bold ${textWhiteClass}`}>No Email Selected</h3>
            <p className={`text-xs ${textMutedClass} max-w-[200px] mt-1`}>Select an email from the left inbox stream to load detailed view and AI quick reply controls.</p>
          </div>
        )}
      </div>

    </div>
  );
}
