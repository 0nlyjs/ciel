"use client";

import { useState, useRef, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import { useSpeechToText, useTextToSpeech } from "@/lib/speech";
import { Mic, MicOff, Send, Sparkles, Terminal, Trash2 } from "lucide-react";

export default function ChatPanel() {
  const messages = useCielStore((s) => s.chatMessages);
  const addMessage = useCielStore((s) => s.addChatMessage);
  const clearChat = useCielStore((s) => s.clearChat);
  const setCielStatus = useCielStore((s) => s.setCielStatus);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // setup speech integrations
  const { speak, stop: stopSpeech } = useTextToSpeech();
  
  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    setInput("");
    addMessage({ role: "user", content: text });
    setLoading(true);
    setCielStatus("thinking");

    try {
      // get reply from API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      const reply = data.text || "I was unable to process that request.";

      addMessage({ role: "assistant", content: reply });
      
      // vocalize response
      speak(reply);

    } catch (err) {
      console.error(err);
      addMessage({
        role: "assistant",
        content: "Error: I lost synchronization with the core logic. Please verify your API key.",
      });
      setCielStatus("error");
      setTimeout(() => setCielStatus("idle"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim()) {
      handleSend(transcript);
    }
  };

  const { isListening, startListening, stopListening, supported: speechSupported } =
    useSpeechToText(handleVoiceInput);

  // auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeech(); // stop speaking if active
      startListening();
    }
  };

  return (
    <div className="flex-grow flex flex-col h-full bg-zinc-950 font-sans border-l border-zinc-900 overflow-hidden select-none">
      
      {/* header */}
      <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <h1 className="text-sm font-semibold tracking-wider uppercase text-zinc-400 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Ciel AI Terminal
        </h1>
        <button
          onClick={clearChat}
          title="Clear Chat Log"
          className="w-8 h-8 rounded hover:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer border border-transparent hover:border-zinc-800"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* message history */}
      <div
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-4 flex flex-col justify-start"
      >
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${
                isUser ? "self-end items-end" : "self-start items-start"
              }`}
            >
              {/* sender label */}
              <span className="text-[9px] font-mono text-zinc-500 mb-1 flex items-center gap-1">
                {!isUser && <Sparkles className="w-2.5 h-2.5 text-cyan-400" />}
                {isUser ? "You" : "Ciel"}
              </span>

              {/* bubble */}
              <div
                className={`text-xs px-4 py-3 rounded-xl leading-relaxed whitespace-pre-line ${
                  isUser
                    ? "bg-cyan-600 text-white rounded-tr-none shadow-[0_2px_4px_rgba(0,240,255,0.05)] border border-cyan-500/10"
                    : "bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-tl-none shadow-sm font-sans"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {/* loading indicator */}
        {loading && (
          <div className="self-start flex flex-col items-start max-w-[80%]">
            <span className="text-[9px] font-mono text-zinc-500 mb-1">Ciel</span>
            <div className="bg-zinc-900 border border-zinc-850 text-zinc-500 px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-2 text-xs">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-650 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-650 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-650 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              Analyzing timeline...
            </div>
          </div>
        )}
      </div>

      {/* input area */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2.5"
        >
          {/* mic button */}
          {speechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer select-none ${
                isListening
                  ? "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-850"
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* text field */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={isListening ? "Speak now..." : "Ask Ciel to send emails or set invites..."}
              disabled={loading || isListening}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-10 bg-zinc-900 border border-zinc-850 focus:border-cyan-500/40 text-xs text-white placeholder-zinc-550 rounded-lg px-4 pr-10 outline-none transition-all disabled:opacity-50 disabled:bg-zinc-950"
            />
            
            {/* send button */}
            <button
              type="submit"
              disabled={loading || isListening || !input.trim()}
              className="absolute right-1.5 top-1.5 w-7 h-7 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-900 flex items-center justify-center text-zinc-400 hover:text-cyan-400 disabled:opacity-20 disabled:hover:text-zinc-400 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* spacebar note */}
        {speechSupported && (
          <p className="text-[10px] text-zinc-600 mt-2 text-center font-mono select-none">
            {isListening ? "Listening... Submit by stopping speech." : "Tip: Hold Spacebar to speak commands"}
          </p>
        )}
      </div>

    </div>
  );
}
