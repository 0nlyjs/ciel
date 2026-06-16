"use client";

import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { useCielStore, Email } from "@/store/useCielStore";
import toast from "react-hot-toast";
import { useHotkeys } from "react-hotkeys-hook";
import { 
  Inbox, 
  Star, 
  Send, 
  FileText, 
  Users, 
  Tag, 
  Bell, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Trash2, 
  MailOpen, 
  Mail, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  CheckSquare,
  Square
} from "lucide-react";

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
  const isSearching = useCielStore((s) => s.isSearching);
  const loadEmailsFromCache = useCielStore((s) => s.loadEmailsFromCache);
  const activeFolder = useCielStore((s) => s.activeFolder);
  const setActiveFolder = useCielStore((s) => s.setActiveFolder);
  const markAsRead = useCielStore((s) => s.markAsRead);
  const updateEmail = useCielStore((s) => s.updateEmail);
  const deleteEmail = useCielStore((s) => s.deleteEmail);
  const toggleStarEmail = useCielStore((s) => s.toggleStarEmail);
  const searchQuery = useCielStore((s) => s.searchQuery);
  const setSearchQuery = useCielStore((s) => s.setSearchQuery);
  const performSearch = useCielStore((s) => s.performSearch);

  // UI state
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPageSyncing, setIsPageSyncing] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncedFolders, setSyncedFolders] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // AI Smart Replies state
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    { label: string; body: string }[]
  >([]);
  const [selectedReplyIndex, setSelectedReplyIndex] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [activeReplyEmailId, setActiveReplyEmailId] = useState<string | null>(null);

  // Trigger mounted flag on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatic hybrid sync check when folder is empty
  useEffect(() => {
    if (gmailConnected) {
      // If the emails list is empty and we haven't sync-checked this folder yet, trigger a sync
      if (emails.length === 0 && !syncedFolders[activeFolder] && !isSyncing && !isRefreshing) {
        setSyncedFolders((prev) => ({ ...prev, [activeFolder]: true }));
        fetchEmails(true, 1);
      }
    }
  }, [gmailConnected, emails.length, activeFolder, syncedFolders, isSyncing, isRefreshing]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEmails(true, 1);
      toast.success("Syncing folder cache from Gmail...");
    } catch (error) {
      console.error("[InboxTab] Refresh failed:", error);
      toast.error("Sync failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle sidebar folder switches
  const handleFolderSwitch = async (folder: any) => {
    setIsTabLoading(true);
    setActiveEmailId(null);
    setSelectedIds(new Set());
    try {
      setActiveFolder(folder);
      loadEmailsFromCache();
      await fetchEmails(false, 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTabLoading(false);
    }
  };

  // Handle Search Queries
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveEmailId(null);
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      fetchEmails(false, 1);
    }
  };

  // Handle smart reply suggestions from AI
  const handleInitiateSmartReply = async (email: Email) => {
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
          fromName: email.from,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions || []);
      } else {
        toast.error("Failed to load smart replies.");
      }
    } catch (err) {
      console.error("Smart replies error", err);
    } finally {
      setIsGeneratingReplies(false);
    }
  };

  // Send the AI smart reply
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
          body: replyBody,
        }),
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
        toast.error("Failed to send reply: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to send smart reply", err);
      toast.error("Error sending reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Pagination Next / Prev
  const handleNextPage = async () => {
    if (isPageSyncing) return;
    const nextPage = emailsPage + 1;
    setIsPageSyncing(true);
    try {
      await fetchEmails(true, nextPage);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load next page");
    } finally {
      setIsPageSyncing(false);
    }
  };

  const handlePrevPage = async () => {
    if (emailsPage > 1) {
      fetchEmails(false, emailsPage - 1);
    }
  };

  // Helper selectors
  const isEmailStarred = (email: Email) => {
    return (email.labelIds || "").split(",").includes("STARRED");
  };

  const isEmailUnread = (email: Email) => {
    return !email.read;
  };

  // Action Triggers
  const handleToggleStar = async (email: Email, e: MouseEvent) => {
    e.stopPropagation();
    const starred = isEmailStarred(email);
    try {
      await toggleStarEmail(email.id, !starred);
      toast.success(!starred ? "Starred email" : "Removed star");
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleToggleRead = async (email: Email, e: MouseEvent) => {
    e.stopPropagation();
    try {
      await updateEmail(email.id, { read: !email.read });
      toast.success(email.read ? "Marked as unread" : "Marked as read");
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleDelete = async (email: Email, e: MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this email?")) {
      try {
        await deleteEmail(email.id);
        toast.success("Email deleted");
        if (activeEmailId === email.id) {
          setActiveEmailId(null);
        }
      } catch (err) {
        toast.error("Deletion failed");
      }
    }
  };

  const handleCheckboxToggle = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  // Generate a distinct visual gradient for sender initials avatar
  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-indigo-600",
      "from-purple-500 to-pink-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-red-600",
      "from-cyan-500 to-blue-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get unread count in current cached list for badges
  const getFolderUnreadCount = (folder: string) => {
    return emails.filter((e) => {
      if (e.read) return false;
      const labels = (e.labelIds || "").split(",").filter(Boolean);
      if (folder === "inbox") return labels.includes("INBOX") || (!labels.includes("SENT") && labels.length === 0);
      if (folder === "starred") return labels.includes("STARRED");
      if (folder === "sent") return labels.includes("SENT");
      if (folder === "drafts") return labels.includes("DRAFT");
      if (folder === "social") return labels.includes("CATEGORY_SOCIAL");
      if (folder === "promotions") return labels.includes("CATEGORY_PROMOTIONS");
      if (folder === "updates") return labels.includes("CATEGORY_UPDATES");
      return false;
    }).length;
  };

  const activeEmail = emails.find((e) => e.id === activeEmailId);

  // Hotkeys setup
  useHotkeys("1", () => {
    if (activeEmail?.quickReplies?.[0]) {
      onInitiateCompose(
        activeEmail.fromEmail || "",
        `Re: ${activeEmail.subject || ""}`,
        activeEmail.quickReplies[0]
      );
    }
  }, { enableOnFormTags: false }, [activeEmail]);

  useHotkeys("2", () => {
    if (activeEmail?.quickReplies?.[1]) {
      onInitiateCompose(
        activeEmail.fromEmail || "",
        `Re: ${activeEmail.subject || ""}`,
        activeEmail.quickReplies[1]
      );
    }
  }, { enableOnFormTags: false }, [activeEmail]);

  useHotkeys("3", () => {
    if (activeEmail?.quickReplies?.[2]) {
      onInitiateCompose(
        activeEmail.fromEmail || "",
        `Re: ${activeEmail.subject || ""}`,
        activeEmail.quickReplies[2]
      );
    }
  }, { enableOnFormTags: false }, [activeEmail]);

  const startRange = emailsTotal > 0 ? (emailsPage - 1) * emailsPerPage + 1 : 0;
  const endRange = Math.min(emailsPage * emailsPerPage, emailsTotal);

  // Glass design tokens
  const glassPanelClass = "bg-white/5 dark:bg-black/25 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl";
  const glassHeaderClass = "bg-white/5 border-b border-white/10";

  // Check if we should render skeleton loaders
  const showSkeleton = isTabLoading || isPageSyncing || (isSyncing && emails.length === 0);

  return (
    <div className="flex h-full w-full gap-5 overflow-hidden p-2 text-slate-100 font-sans">
      {/* 1st STAGE GUARD: Gmail OAuth connection status check */}
      {!gmailConnected ? (
        <div className={`flex-1 flex flex-col justify-center items-center p-8 text-center relative overflow-hidden ${glassPanelClass}`}>
          {/* Animated pulsing background rings */}
          <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/5 border border-purple-500/10 animate-ping duration-[3000ms] pointer-events-none" />
          <div className="absolute w-[200px] h-[200px] rounded-full bg-purple-500/5 border border-purple-500/10 animate-pulse pointer-events-none" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] animate-pulse">
            ✉️
          </div>
          
          <h2 className="text-2xl font-black mb-3 tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Establish Gmail Synchronization
          </h2>
          
          <p className="text-slate-400 text-xs max-w-md mb-8 leading-relaxed">
            Connect your Gmail account to cache emails into your secure Neon database. Enable local vector search, automatic AI importance classification, and smart quick replies.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-sm w-full mb-8 text-left text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>OAuth 2.0 Secure</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Neon Cache (100+)</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>AI Classifier</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Corsair Pub/Sub</span>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/auth/corsair/connect?plugin=gmail");
                const data = await res.json();
                if (data.authorizeUrl) {
                  window.location.href = data.authorizeUrl;
                }
              } catch (e) {
                console.error("Gmail OAuth Link Failure:", e);
                toast.error("Authentication setup failed");
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs uppercase font-extrabold tracking-widest shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_35px_rgba(147,51,234,0.5)] transition-all duration-300 transform hover:scale-[1.03] cursor-pointer"
          >
            Connect Gmail Account
          </button>
        </div>
      ) : (
        <div className="flex-1 flex h-full gap-5 min-w-0 overflow-hidden">
          
          {/* GMAIL SIDE NAVIGATION PANEL */}
          <div className={`w-[220px] flex flex-col shrink-0 p-4 ${glassPanelClass}`}>
            {/* Pill-shaped Compose Button (Gmail desktop style) */}
            <button
              onClick={() => onInitiateCompose()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] transform hover:-translate-y-[1px] mb-6 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              Compose
            </button>

            {/* Folder Navigation */}
            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              <span className="text-[9px] text-slate-500 font-black uppercase px-3 tracking-widest block mb-2 font-mono">Mailboxes</span>
              
              <button
                onClick={() => handleFolderSwitch("inbox")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                  activeFolder === "inbox"
                    ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Inbox className="w-4 h-4 shrink-0 text-purple-400" />
                  <span>Inbox</span>
                </div>
                {getFolderUnreadCount("inbox") > 0 && (
                  <span className="bg-purple-500/30 text-purple-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {getFolderUnreadCount("inbox")}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleFolderSwitch("starred")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                  activeFolder === "starred"
                    ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 shrink-0 text-yellow-400" />
                  <span>Starred</span>
                </div>
                {getFolderUnreadCount("starred") > 0 && (
                  <span className="bg-yellow-500/30 text-yellow-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {getFolderUnreadCount("starred")}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleFolderSwitch("sent")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                  activeFolder === "sent"
                    ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>Sent</span>
                </div>
              </button>

              <button
                onClick={() => handleFolderSwitch("drafts")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                  activeFolder === "drafts"
                    ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>Drafts</span>
                </div>
                {getFolderUnreadCount("drafts") > 0 && (
                  <span className="bg-cyan-500/30 text-cyan-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {getFolderUnreadCount("drafts")}
                  </span>
                )}
              </button>

              {/* Categories Navigation Group */}
              <div className="pt-6">
                <span className="text-[9px] text-slate-500 font-black uppercase px-3 tracking-widest block mb-2 font-mono">Categories</span>
                
                <button
                  onClick={() => handleFolderSwitch("social")}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                    activeFolder === "social"
                      ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Social</span>
                  </div>
                  {getFolderUnreadCount("social") > 0 && (
                    <span className="bg-emerald-500/30 text-emerald-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                      {getFolderUnreadCount("social")}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleFolderSwitch("promotions")}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                    activeFolder === "promotions"
                      ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Promotions</span>
                  </div>
                  {getFolderUnreadCount("promotions") > 0 && (
                    <span className="bg-amber-500/30 text-amber-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                      {getFolderUnreadCount("promotions")}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleFolderSwitch("updates")}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200 border border-transparent ${
                    activeFolder === "updates"
                      ? "bg-white/10 text-white border-l-2 border-purple-500 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Updates</span>
                  </div>
                  {getFolderUnreadCount("updates") > 0 && (
                    <span className="bg-rose-500/30 text-rose-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                      {getFolderUnreadCount("updates")}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Ingestion status footer */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-slate-500 font-mono">
              <span>DB INGESTION</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-400 font-extrabold">NEON ACTIVE</span>
              </div>
            </div>
          </div>

          {/* EMAIL MAIN WORKSPACE */}
          <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${glassPanelClass}`}>
            
            {!activeEmail ? (
              // ==========================================
              // EMAIL LIST WORKSPACE
              // ==========================================
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search Bar / Action Toolbar */}
                <div className={`h-[72px] px-6 flex items-center justify-between gap-4 shrink-0 ${glassHeaderClass}`}>
                  <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search inbox by subject, body, or sender..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black/20 focus:bg-black/35 border border-white/10 focus:border-purple-500/50 text-xs text-white pl-10 pr-4 py-2 outline-none rounded-xl font-mono transition-all duration-300 placeholder:text-slate-500"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-2.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      </div>
                    )}
                  </form>

                  {/* Sync status & Refresh buttons */}
                  <div className="flex items-center gap-4">
                    {/* Live syncing status badge */}
                    {isSyncing && (
                      <div className="flex items-center gap-2 text-[10px] text-purple-400 font-mono animate-pulse bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing Gmail...</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isSyncing}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                        title="Sync emails from Gmail"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      </button>

                      {/* Select all checkmark control */}
                      {emails.length > 0 && (
                        <button
                          onClick={handleSelectAll}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
                          title="Select all"
                        >
                          {selectedIds.size === emails.length ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-1 border border-white/10 rounded-xl bg-white/5 p-1">
                      <button
                        onClick={handlePrevPage}
                        disabled={emailsPage <= 1}
                        className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-35 cursor-pointer text-slate-400 hover:text-white transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <span className="text-[10px] text-slate-400 font-black font-mono px-2">
                        {startRange}-{endRange} <span className="text-slate-500">of</span> {emailsTotal}
                      </span>
                      
                      <button
                        onClick={handleNextPage}
                        disabled={isPageSyncing || (!emailsHasMore && emailsPage >= Math.ceil(emailsTotal / emailsPerPage))}
                        className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-35 cursor-pointer text-slate-400 hover:text-white transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* GMAIL TAB NAVIGATION (Only shown when active folder is inbox / categories) */}
                {(activeFolder === "inbox" || ["social", "promotions", "updates"].includes(activeFolder)) && (
                  <div className="flex border-b border-white/10 shrink-0 bg-black/10">
                    <button
                      onClick={() => handleFolderSwitch("inbox")}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider cursor-pointer border-b-2 flex items-center justify-center gap-2.5 transition-all duration-300 ${
                        activeFolder === "inbox"
                          ? "border-blue-500/80 text-blue-400 bg-blue-500/5"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Inbox className="w-4.5 h-4.5" />
                      Primary
                    </button>
                    <button
                      onClick={() => handleFolderSwitch("social")}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider cursor-pointer border-b-2 flex items-center justify-center gap-2.5 transition-all duration-300 ${
                        activeFolder === "social"
                          ? "border-emerald-500/80 text-emerald-400 bg-emerald-500/5"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Users className="w-4.5 h-4.5" />
                      Social
                    </button>
                    <button
                      onClick={() => handleFolderSwitch("promotions")}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider cursor-pointer border-b-2 flex items-center justify-center gap-2.5 transition-all duration-300 ${
                        activeFolder === "promotions"
                          ? "border-amber-500/80 text-amber-400 bg-amber-500/5"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Tag className="w-4.5 h-4.5" />
                      Promotions
                    </button>
                    <button
                      onClick={() => handleFolderSwitch("updates")}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider cursor-pointer border-b-2 flex items-center justify-center gap-2.5 transition-all duration-300 ${
                        activeFolder === "updates"
                          ? "border-purple-500/80 text-purple-400 bg-purple-500/5"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Bell className="w-4.5 h-4.5" />
                      Updates
                    </button>
                  </div>
                )}

                {/* EMAILS LIST STREAM VIEW */}
                <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/5">
                  {showSkeleton ? (
                    /* Beautiful Shimmering Skeleton Loader */
                    <div className="divide-y divide-white/5 animate-pulse">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="px-6 py-4.5 flex items-center gap-6 opacity-60">
                          <div className="w-4 h-4 bg-white/10 rounded shrink-0" />
                          <div className="w-4 h-4 bg-white/10 rounded shrink-0" />
                          <div className="w-36 h-3.5 bg-white/10 rounded shrink-0" />
                          <div className="flex-1 h-3.5 bg-white/10 rounded" />
                          <div className="w-16 h-3 bg-white/10 rounded shrink-0" />
                        </div>
                      ))}
                      <div className="p-6 text-center text-xs text-slate-500 italic font-mono">
                        Querying Neon DB / Gmail sync cache ...
                      </div>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-32 text-slate-500">
                      <span className="text-4xl mb-4 animate-bounce">📬</span>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">Mailbox folder cache is empty</p>
                      <p className="text-[10px] text-slate-600 mt-2 font-mono">Click the refresh icon above to trigger a live Gmail fetch.</p>
                    </div>
                  ) : (
                    emails.map((email) => {
                      const starred = isEmailStarred(email);
                      const unread = isEmailUnread(email);
                      const isSelected = selectedIds.has(email.id);
                      
                      const displayDate = (() => {
                        if (!mounted) return "";
                        try {
                          const dateObj = new Date(email.date);
                          const today = new Date();
                          if (dateObj.toDateString() === today.toDateString()) {
                            return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          }
                          return dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
                        } catch {
                          return email.date;
                        }
                      })();

                      return (
                        <div
                          key={email.id}
                          onClick={() => {
                            setActiveEmailId(email.id);
                            if (unread) markAsRead(email.id);
                          }}
                          className={`group px-6 py-3.5 flex items-center justify-between gap-4 cursor-pointer relative border-l-2 transition-all duration-150 ${
                            isSelected 
                              ? "bg-purple-950/20 border-l-purple-500 text-white" 
                              : unread
                                ? "bg-white/5 border-l-cyan-500 font-bold text-white shadow-sm"
                                : "border-l-transparent text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox selector */}
                            <button
                              onClick={(e) => {
                                handleCheckboxToggle(email.id, e);
                              }}
                              className="p-1 rounded-md text-slate-600 hover:text-purple-400 hover:bg-white/5 shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Star Toggle */}
                            <button
                              onClick={(e) => handleToggleStar(email, e)}
                              className={`p-1 rounded-md hover:bg-white/10 hover:text-yellow-400 shrink-0 cursor-pointer ${
                                starred ? "text-yellow-500 animate-pulse" : "text-slate-600"
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${starred ? "fill-yellow-500 text-yellow-500 border-none" : ""}`} />
                            </button>

                            {/* Sender Info */}
                            <span className={`text-xs truncate w-[160px] shrink-0 ${unread ? "text-white font-extrabold" : "text-slate-350"}`}>
                              {email.from}
                            </span>

                            {/* Subject + Snippet text */}
                            <div className="flex-1 truncate text-xs flex gap-2">
                              <span className={unread ? "text-white font-bold shrink-0" : "text-slate-200 shrink-0"}>
                                {email.subject}
                              </span>
                              <span className="text-slate-500 font-normal shrink-0">-</span>
                              <span className="text-slate-500 font-normal truncate">
                                {email.body ? email.body.replace(/<[^>]*>/g, '').substring(0, 120) : ""}
                              </span>
                            </div>

                            {/* Priority badge indicators */}
                            {email.priority === "high" && (
                              <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[8px] font-bold px-2 py-0.5 rounded-md font-mono shrink-0">
                                URGENT
                              </span>
                            )}
                          </div>

                          {/* Hover Action Triggers or Date */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Actions on hover (desktop style actions inline) */}
                            <div className="hidden group-hover:flex items-center gap-1.5">
                              <button
                                onClick={(e) => handleToggleRead(email, e)}
                                className="p-1.5 rounded-lg border border-white/10 bg-black/30 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                                title={unread ? "Mark as read" : "Mark as unread"}
                              >
                                {unread ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                              </button>
                              
                              <button
                                onClick={(e) => handleDelete(email, e)}
                                className="p-1.5 rounded-lg border border-white/10 bg-black/30 hover:bg-red-500/10 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete email"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Default display: Date */}
                            <span className="group-hover:hidden text-[10px] font-mono text-slate-500 font-bold">
                              {displayDate}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              // ==========================================
              // EMAIL DETAIL VIEW WORKSPACE
              // ==========================================
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 space-y-5">
                {/* Detail view toolbar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                  <button
                    onClick={() => setActiveEmailId(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-350 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-purple-400" />
                    Back to list
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleStar(activeEmail, e)}
                      className={`p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer ${
                        isEmailStarred(activeEmail) ? "text-yellow-500 hover:text-yellow-400 shadow-sm" : "text-slate-400 hover:text-slate-200"
                      }`}
                      title={isEmailStarred(activeEmail) ? "Starred" : "Star message"}
                    >
                      <Star className={`w-4 h-4 ${isEmailStarred(activeEmail) ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    </button>
                    
                    <button
                      onClick={(e) => handleToggleRead(activeEmail, e)}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                      title={isEmailUnread(activeEmail) ? "Mark as read" : "Mark as unread"}
                    >
                      {isEmailUnread(activeEmail) ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={(e) => handleDelete(activeEmail, e)}
                      className="p-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      title="Delete email"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email Subject Heading */}
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                    {activeEmail.subject}
                  </h2>
                  <div className="flex gap-4 text-[9px] text-slate-500 uppercase font-black font-mono tracking-wider">
                    <span>
                      Folder: <span className="text-purple-400">{activeFolder}</span>
                    </span>
                    <span>
                      Priority: <span className={activeEmail.priority === "high" ? "text-red-400 font-bold" : "text-slate-400"}>{activeEmail.priority}</span>
                    </span>
                    {activeEmail.category && (
                      <span>
                        Category: <span className="text-emerald-400">{activeEmail.category}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Sender Header info */}
                <div className="flex items-center justify-between border border-white/5 bg-white/5 p-4 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circle Avatar with Colored Initials Gradient */}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarColor(activeEmail.from)} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md`}>
                      {activeEmail.from ? activeEmail.from.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-white text-xs block truncate">{activeEmail.from}</span>
                      <span className="text-slate-500 text-[10px] font-mono block truncate">{activeEmail.fromEmail}</span>
                    </div>
                  </div>
                  
                  <span className="text-slate-500 text-xs font-bold font-mono">
                    {mounted && new Date(activeEmail.date).toLocaleString()}
                  </span>
                </div>

                {/* Render Mail content body inside sandboxed iframe container */}
                {(() => {
                  const isHtml =
                    activeEmail.body.includes("<html") ||
                    activeEmail.body.includes("<div") ||
                    activeEmail.body.includes("<p>") ||
                    activeEmail.body.includes("<br") ||
                    activeEmail.body.includes("<table") ||
                    activeEmail.body.includes("<style");
                  
                  const iframeSrcDoc = isHtml
                    ? activeEmail.body
                    : `<html><head><style>body { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13.5px; line-height: 1.6; color: #1f2937; background: #ffffff; white-space: pre-wrap; word-break: break-word; padding: 24px; margin: 0; }</style></head><body>${activeEmail.body}</body></html>`;

                  return (
                    <div className="w-full min-h-[400px] border border-white/10 rounded-2xl overflow-hidden bg-white shadow-2xl relative">
                      <iframe
                        title="Email Body Content"
                        srcDoc={iframeSrcDoc}
                        className="w-full h-full border-none min-h-[400px] bg-white"
                        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                      />
                    </div>
                  );
                })()}

                {/* Smart AI Quick replies section */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  {activeReplyEmailId !== activeEmail.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleInitiateSmartReply(activeEmail)}
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl font-bold uppercase text-[10px] tracking-wider cursor-pointer flex items-center gap-2 transition-all duration-300 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                          Reply with AI suggestion
                        </button>
                        
                        <button
                          onClick={() =>
                            onInitiateCompose(
                              activeEmail.fromEmail,
                              `Re: ${activeEmail.subject}`,
                            )
                          }
                          className="px-5 py-2.5 border border-white/5 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] tracking-wider cursor-pointer transition-all duration-300 shadow-sm"
                        >
                          Manual Composition
                        </button>
                      </div>

                      {activeEmail.quickReplies && activeEmail.quickReplies.length > 0 && (
                        <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/5">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest font-mono block">Context Suggestions:</span>
                          <div className="flex flex-wrap gap-2">
                            {activeEmail.quickReplies.map((replyText: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  onInitiateCompose(
                                    activeEmail.fromEmail,
                                    `Re: ${activeEmail.subject}`,
                                    replyText,
                                  )
                                }
                                className="text-[10px] px-3.5 py-2 border border-white/5 text-slate-300 hover:text-white bg-white/5 hover:bg-purple-500/20 rounded-xl font-medium cursor-pointer transition-all duration-200"
                              >
                                <span className="text-purple-400 font-bold mr-1.5 font-mono">[{idx + 1}]</span>
                                {replyText}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ==========================================
                    // AI DRAFT REPLY WORKSPACE
                    // ==========================================
                    <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                          Draft reply using AI:
                        </span>
                        
                        <button
                          onClick={() => setActiveReplyEmailId(null)}
                          className="text-[10px] font-black text-slate-500 hover:text-white uppercase cursor-pointer tracking-wider font-mono"
                        >
                          Cancel
                        </button>
                      </div>

                      {isGeneratingReplies ? (
                        <div className="text-[11px] text-slate-500 font-medium animate-pulse flex items-center gap-2 font-mono py-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Drafting context replies...</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {aiSuggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedReplyIndex(idx);
                                setReplyBody(sug.body);
                              }}
                              className={`text-[10px] px-3.5 py-1.5 border rounded-xl font-bold uppercase cursor-pointer transition-all duration-200 ${
                                selectedReplyIndex === idx
                                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/20"
                                  : "border-white/5 text-slate-400 hover:text-white bg-white/5"
                              }`}
                            >
                              {sug.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {(!isGeneratingReplies || replyBody) && (
                        <div className="space-y-3">
                          <textarea
                             value={replyBody}
                             onChange={(e) => setReplyBody(e.target.value)}
                             rows={6}
                             className="w-full text-xs p-3.5 border border-white/10 bg-black/30 focus:bg-black/50 outline-none rounded-xl resize-none text-white transition-all font-mono"
                          />
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() =>
                                handleSendSmartReply(
                                  activeEmail.fromEmail,
                                  activeEmail.subject,
                                )
                              }
                              disabled={isSendingReply || !replyBody.trim()}
                              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-750 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-extrabold uppercase rounded-xl transition-all duration-200 cursor-pointer shadow-md shadow-purple-500/10"
                            >
                              {isSendingReply ? "Sending reply..." : "Send AI Reply"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
