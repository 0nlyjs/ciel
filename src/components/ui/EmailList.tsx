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
    <div className="flex-1 flex flex-col h-full cyber-glass border-r border-white/10 select-none overflow-y-auto">
      
      {/* list header */}
      <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-abyssal/40 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-sm font-semibold tracking-wider uppercase text-crisp-white">
          All Messages {filteredEmails.length > 0 && `(${filteredEmails.length})`}
        </h1>
        
        {/* hotkey hint */}
        <span className="text-[10px] font-mono text-cyan-glow/80 bg-white/5 px-2 py-0.5 rounded border border-white/10">
          J/K to Navigate
        </span>
      </div>

      {/* empty state */}
      {filteredEmails.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-transparent">
          <Eye className="w-8 h-8 text-silvery-gray/40 mb-3" />
          <p className="text-sm font-medium text-crisp-white">Inbox Zero</p>
          <p className="text-xs text-silvery-gray mt-1">No emails match your current search.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {filteredEmails.map((email, index) => {
            const isSelected = selectedIndex === index;
            return (
              <div
                key={email.id}
                onClick={() => handleSelect(index, email.id)}
                className={`px-6 py-4 flex flex-col gap-1.5 transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-abyssal/80 border-l-2 border-cyan-glow pl-[22px] shadow-[inset_4px_0_15px_-4px_rgba(0,240,255,0.15)]"
                    : "hover:bg-white/5 pl-6 border-l-2 border-transparent"
                }`}
              >
                {/* sender & date details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* unread dot */}
                    {!email.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow animate-pulse shadow-[0_0_8px_#00F0FF]" />
                    )}
                    <span className={`text-sm ${!email.read ? "font-bold text-crisp-white" : "font-medium text-silvery-gray"}`}>
                      {email.from}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-silvery-gray/80">
                    {email.date}
                  </span>
                </div>

                {/* subject */}
                <h3 className={`text-xs truncate ${!email.read ? "font-semibold text-crisp-white" : "text-silvery-gray/70"}`}>
                  {email.subject}
                </h3>

                {/* snippet */}
                <p className="text-xs text-silvery-gray/50 line-clamp-1 truncate font-sans">
                  {email.body}
                </p>

                {/* category/priority tags */}
                <div className="flex items-center gap-2 mt-1">
                  {/* priority badge */}
                  {email.priority === "high" && (
                    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-crimson/10 border border-crimson/20 text-crimson inline-flex items-center gap-1 shadow-[0_0_8px_rgba(255,42,85,0.1)]">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Priority
                    </span>
                  )}
                  {email.priority === "medium" && (
                    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-ice-blue/10 border border-ice-blue/20 text-ice-blue inline-flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" />
                      Normal
                    </span>
                  )}

                  {/* category label */}
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-silvery-gray/60">
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
