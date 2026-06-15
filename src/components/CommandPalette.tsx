"use client";

import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useCielStore } from "@/store/useCielStore";
import toast from "react-hot-toast";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Toggle palette open/close
  useHotkeys("meta+k, ctrl+k", (e) => {
    e.preventDefault();
    setOpen((prev) => !prev);
  });

  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const performSearch = useCielStore((s) => s.performSearch);
  const markAsRead = useCielStore((s) => s.markAsRead);
  const clearChat = useCielStore((s) => s.clearChat);

  const handleSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      setIsLoading(true);
      try {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: value }),
        });

        if (res.ok) {
          const data = await res.json();
          const { action, params } = data.command;

          if (action === "navigate") {
            if (params.tab) {
              setActiveTab(params.tab);
              toast.success(`Navigating to ${params.tab}`);
            } else {
              toast.error("Invalid navigation tab specified.");
            }
          } else if (action === "search") {
            if (params.query) {
              performSearch(params.query);
              setActiveTab("inbox");
              toast.success(`Searching: "${params.query}"`);
            } else {
              toast.error("No search query specified.");
            }
          } else if (action === "clear_chat") {
            clearChat();
            toast.success("Chat history cleared.");
          } else if (action === "mark_read" && params.emailId) {
            await markAsRead(params.emailId);
            toast.success("Email marked as read.");
          } else if (action === "compose") {
            window.dispatchEvent(new CustomEvent("ciel-compose", { detail: params }));
            toast.success("Drafting compose email.");
          } else {
            toast.error("Command unrecognized by Ciel.");
          }
          setOpen(false);
          setValue("");
        } else {
          toast.error("Failed to parse command.");
        }
      } catch (err) {
        console.error("[Command Palette Error]", err);
        toast.error("An error occurred executing command.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">⌘K Natural Language Command Palette</span>
          <button onClick={() => setOpen(false)} className="text-[10px] text-slate-500 hover:text-white uppercase font-bold">Esc</button>
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleSubmit}
          placeholder="e.g. 'Go to calendar', 'Search for pitch contract', 'Clear chat logs'"
          className="w-full bg-black/30 border border-white/10 text-xs px-3.5 py-3 outline-none rounded-xl text-white font-sans placeholder-slate-500 focus:border-purple-500 transition-colors"
          disabled={isLoading}
          autoFocus
        />
        {isLoading && <div className="text-[10px] text-purple-400 font-mono animate-pulse">Ciel is interpreting command...</div>}
      </div>
    </div>
  );
}
