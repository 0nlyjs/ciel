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
    <div className="flex-grow flex flex-col h-full bg-void font-sans border-l border-white/10 overflow-hidden select-none">
      
      {/* header */}
      <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-abyssal/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <h1 className="text-sm font-semibold tracking-wider uppercase text-crisp-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-glow" />
          Ciel AI Terminal
        </h1>
        <button
          onClick={clearChat}
          title="Clear Chat Log"
          className="w-8 h-8 rounded hover:bg-white/5 flex items-center justify-center text-silvery-gray hover:text-crisp-white transition-all cursor-pointer border border-transparent hover:border-white/10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* message history */}
      <div
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-4 flex flex-col justify-start bg-void/30"
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
              <span className="text-[9px] font-mono text-silvery-gray/50 mb-1 flex items-center gap-1">
                {!isUser && <Sparkles className="w-2.5 h-2.5 text-cyan-glow" />}
                {isUser ? "You" : "Ciel"}
              </span>

              {/* bubble */}
              <div
                className={`text-xs px-4 py-3 rounded-xl leading-relaxed whitespace-pre-line ${
                  isUser
                    ? "bg-gradient-to-r from-cyan-glow to-ice-blue text-void font-bold rounded-tr-none shadow-[0_2px_15px_rgba(0,240,255,0.15)] border border-cyan-glow/20"
                    : "bg-abyssal/70 border border-white/10 text-crisp-white rounded-tl-none shadow-sm font-sans"
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
            <span className="text-[9px] font-mono text-silvery-gray/50 mb-1">Ciel</span>
            <div className="bg-abyssal/70 border border-white/10 text-silvery-gray/70 px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-2 text-xs">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              Analyzing timeline...
            </div>
          </div>
        )}
      </div>

      {/* input area */}
      <div className="p-4 border-t border-white/10 bg-abyssal/30 shrink-0">
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
                  ? "bg-crimson/10 border-crimson/40 text-crimson animate-pulse shadow-[0_0_12px_rgba(255,42,85,0.2)]"
                  : "bg-void border-white/10 text-silvery-gray hover:text-crisp-white hover:bg-white/5"
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
              className="w-full h-10 bg-void border border-white/10 focus:border-cyan-glow/40 text-xs text-crisp-white placeholder-silvery-gray/30 rounded-lg px-4 pr-10 outline-none transition-all disabled:opacity-50 disabled:bg-void"
            />
            
            {/* send button */}
            <button
              type="submit"
              disabled={loading || isListening || !input.trim()}
              className="absolute right-1.5 top-1.5 w-7 h-7 rounded bg-abyssal hover:bg-white/5 border border-white/10 flex items-center justify-center text-silvery-gray hover:text-cyan-glow disabled:opacity-20 disabled:hover:text-silvery-gray transition-all cursor-pointer animate-pulse"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* spacebar note */}
        {speechSupported && (
          <p className="text-[10px] text-silvery-gray/40 mt-2 text-center font-mono select-none">
            {isListening ? "Listening... Submit by stopping speech." : "Tip: Hold Spacebar to speak commands"}
          </p>
        )}
      </div>

    </div>
  );
}
