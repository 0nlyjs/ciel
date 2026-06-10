"use client";

import { useCielStore } from "@/store/useCielStore";
import { Star, Eye, ShieldAlert } from "lucide-react";

export default function EmailList() {
  const emails = useCielStore((s) => s.emails);
  const selectedIndex = useCielStore((s) => s.selectedEmailIndex);
  const setSelectedIndex = useCielStore((s) => s.setSelectedEmailIndex);
  const searchQuery = useCielStore((s) => s.searchQuery);
  const markAsRead = useCielStore((s) => s.markAsRead);

  // filter by search term
  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(term) ||
      email.body.toLowerCase().includes(term) ||
      email.from.toLowerCase().includes(term) ||
      email.fromEmail.toLowerCase().includes(term)
    );
  });

  const handleSelect = (index: number, emailId: string) => {
    setSelectedIndex(index);
    markAsRead(emailId);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 border-r border-zinc-900 select-none overflow-y-auto">
      
      {/* list header */}
      <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/40 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-sm font-semibold tracking-wider uppercase text-zinc-400">
          All Messages {filteredEmails.length > 0 && `(${filteredEmails.length})`}
        </h1>
        
        {/* hotkey hint */}
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          J/K to Navigate
        </span>
      </div>

      {/* empty state */}
      {filteredEmails.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40">
          <Eye className="w-8 h-8 text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-500">Inbox Zero</p>
          <p className="text-xs text-zinc-600 mt-1">No emails match your current search.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900/60">
          {filteredEmails.map((email, index) => {
            const isSelected = selectedIndex === index;
            return (
              <div
                key={email.id}
                onClick={() => handleSelect(index, email.id)}
                className={`px-6 py-4 flex flex-col gap-1.5 transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-zinc-900/80 border-l-2 border-cyan-400 pl-[22px]"
                    : "hover:bg-zinc-900/30 pl-6 border-l-2 border-transparent"
                }`}
              >
                {/* sender & date details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* unread dot */}
                    {!email.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                    <span className={`text-sm ${!email.read ? "font-semibold text-white" : "text-zinc-300"}`}>
                      {email.from}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {email.date}
                  </span>
                </div>

                {/* subject */}
                <h3 className={`text-xs truncate ${!email.read ? "font-medium text-white" : "text-zinc-400"}`}>
                  {email.subject}
                </h3>

                {/* snippet */}
                <p className="text-xs text-zinc-500 line-clamp-1 truncate font-sans">
                  {email.body}
                </p>

                {/* category/priority tags */}
                <div className="flex items-center gap-2 mt-1">
                  {/* priority badge */}
                  {email.priority === "high" && (
                    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 inline-flex items-center gap-1">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Priority
                    </span>
                  )}
                  {email.priority === "medium" && (
                    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 inline-flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" />
                      Normal
                    </span>
                  )}

                  {/* category label */}
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                    {email.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
