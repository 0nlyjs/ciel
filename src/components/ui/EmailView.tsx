"use client";

import { useState } from "react";
import { useCielStore } from "@/store/useCielStore";
import { CorsairClient } from "@/lib/corsair";
import { Mail, Send, Archive, Reply, X, Sparkles } from "lucide-react";

interface EmailViewProps {
  isComposing: boolean;
  setIsComposing: (val: boolean) => void;
}

export default function EmailView({ isComposing, setIsComposing }: EmailViewProps) {
  const emails = useCielStore((s) => s.emails);
  const selectedIndex = useCielStore((s) => s.selectedEmailIndex);
  const archiveEmail = useCielStore((s) => s.archiveEmail);

  // compute active email dynamically
  const activeEmail = selectedIndex !== null && selectedIndex < emails.length ? emails[selectedIndex] : null;

  // reply box state
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  // compose modal state
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleArchive = () => {
    if (activeEmail) {
      archiveEmail(activeEmail.id);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || !activeEmail) return;

    setIsSending(true);
    const success = await CorsairClient.sendEmail(
      activeEmail.fromEmail,
      `Re: ${activeEmail.subject}`,
      replyBody
    );

    if (success) {
      setReplyBody("");
      setIsReplying(false);
    }
    setIsSending(false);
  };

  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !body.trim()) return;

    setIsSending(true);
    const success = await CorsairClient.sendEmail(to, subject, body);

    if (success) {
      setTo("");
      setSubject("");
      setBody("");
      setIsComposing(false);
    }
    setIsSending(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 font-sans relative overflow-y-auto">
      
      {/* toolbar */}
      {activeEmail && (
        <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/40 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReplying(true)}
              className="h-8 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
            <button
              onClick={handleArchive}
              className="h-8 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            E: Archive | R: Reply
          </span>
        </div>
      )}

      {/* content area */}
      {!activeEmail ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-zinc-600 bg-zinc-950/20">
          <Mail className="w-10 h-10 text-zinc-800 mb-3 animate-pulse" />
          <p className="text-sm font-medium text-zinc-500">No Conversation Selected</p>
          <p className="text-xs text-zinc-600 mt-1">Select an email to view details or press <kbd className="bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 text-[10px]">C</kbd> to compose.</p>
        </div>
      ) : (
        <div className="p-8 flex flex-col gap-6 max-w-3xl">
          
          {/* details */}
          <div className="space-y-4">
            <h1 className="text-xl font-bold tracking-tight text-white leading-normal">
              {activeEmail.subject}
            </h1>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                  {activeEmail.from.substring(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {activeEmail.from}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    From: {activeEmail.fromEmail}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-900 px-2 py-1 rounded">
                {activeEmail.date}
              </span>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* body */}
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line font-sans min-h-[150px]">
            {activeEmail.body}
          </div>

          <hr className="border-zinc-900" />

          {/* reply block */}
          {isReplying ? (
            <form onSubmit={handleSendReply} className="space-y-3 bg-zinc-900/30 border border-zinc-900 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5 text-cyan-400" />
                  Replying to {activeEmail.from}
                </span>
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                placeholder="Write your response..."
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-cyan-500/40 text-sm text-white placeholder-zinc-600 rounded-lg p-3 outline-none resize-none transition-all"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="h-8 px-4 rounded text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !replyBody.trim()}
                  className="h-8 px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-cyan-800 disabled:text-zinc-500"
                >
                  <Send className="w-3 h-3" />
                  Send Reply
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsReplying(true)}
              className="w-full py-3.5 border border-dashed border-zinc-800 hover:border-cyan-500/40 rounded-xl text-xs font-medium text-zinc-500 hover:text-cyan-400 flex items-center justify-center gap-2 transition-all cursor-pointer bg-zinc-950/20"
            >
              <Reply className="w-3.5 h-3.5" />
              Click here to reply to this conversation...
            </button>
          )}
        </div>
      )}

      {/* compose modal */}
      {isComposing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* modal header */}
            <div className="h-12 border-b border-zinc-900 px-5 flex items-center justify-between bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                New Message (Ciel Draft)
              </span>
              <button
                onClick={() => setIsComposing(false)}
                className="w-6 h-6 rounded hover:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* form */}
            <form onSubmit={handleSendCompose} className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-5 space-y-4">
                <div className="flex items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs font-medium text-zinc-500 w-16 uppercase">To:</span>
                  <input
                    type="email"
                    placeholder="receiver@example.com"
                    required
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="flex-grow bg-transparent text-sm text-white placeholder-zinc-650 outline-none"
                  />
                </div>
                <div className="flex items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs font-medium text-zinc-500 w-16 uppercase">Subject:</span>
                  <input
                    type="text"
                    placeholder="Enter message subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex-grow bg-transparent text-sm text-white placeholder-zinc-650 outline-none"
                  />
                </div>
                <textarea
                  placeholder="Draft your message content here..."
                  required
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-650 outline-none resize-none pt-2"
                />
              </div>

              {/* footer */}
              <div className="h-14 border-t border-zinc-900 px-5 flex items-center justify-end gap-3 bg-zinc-950/40 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="h-9 px-4 rounded text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSending || !to.trim() || !body.trim()}
                  className="h-9 px-5 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer disabled:bg-cyan-800 disabled:text-zinc-500"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Message
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
