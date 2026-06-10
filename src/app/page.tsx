"use client";

import { useState, useRef, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import { useHotkeys } from "react-hotkeys-hook";
import { useSpeechToText, useTextToSpeech } from "@/lib/speech";
import CielCanvas from "@/components/3d/CielCanvas";
import AuthPortal from "@/components/ui/AuthPortal";
import Sidebar from "@/components/ui/Sidebar";
import EmailList from "@/components/ui/EmailList";
import EmailView from "@/components/ui/EmailView";
import CalendarView from "@/components/ui/CalendarView";
import ChatPanel from "@/components/ui/ChatPanel";
import { Search, Keyboard, HelpCircle, Terminal, Eye, X } from "lucide-react";

export default function Home() {
  const user = useCielStore((s) => s.user);
  const activeTab = useCielStore((s) => s.activeTab);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const selectedIndex = useCielStore((s) => s.selectedEmailIndex);
  const setSelectedIndex = useCielStore((s) => s.setSelectedEmailIndex);
  const emails = useCielStore((s) => s.emails);
  const archiveEmail = useCielStore((s) => s.archiveEmail);
  const markAsRead = useCielStore((s) => s.markAsRead);
  const searchQuery = useCielStore((s) => s.searchQuery);
  const setSearchQuery = useCielStore((s) => s.setSearchQuery);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const view = user ? "dashboard" : (isSigningIn ? "login" : "landing");
  const [isComposing, setIsComposing] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // voice control setup
  const { speak, stop: stopSpeech } = useTextToSpeech();
  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim() && activeTab === "chat") {
      // forward to chat panel if user is in chat tab
      const event = new CustomEvent("ciel-voice-command", { detail: transcript });
      window.dispatchEvent(event);
    } else if (transcript.trim()) {
      // otherwise navigate using speech commands
      const query = transcript.toLowerCase();
      if (query.includes("inbox") || query.includes("email")) {
        setActiveTab("inbox");
        speak("Opening inbox.");
      } else if (query.includes("calendar") || query.includes("schedule")) {
        setActiveTab("calendar");
        speak("Loading schedule planner.");
      } else if (query.includes("chat") || query.includes("agent")) {
        setActiveTab("chat");
        speak("Summoning conversational console.");
      }
    }
  };

  const { isListening, startListening, stopListening } = useSpeechToText(handleVoiceInput);

  // hotkey bindings

  // j/k to navigate email list
  useHotkeys("j", () => {
    if (activeTab !== "inbox" || isComposing || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    if (selectedIndex === null) {
      setSelectedIndex(0);
    } else if (selectedIndex < emails.length - 1) {
      const nextIndex = selectedIndex + 1;
      setSelectedIndex(nextIndex);
      markAsRead(emails[nextIndex].id);
    }
  }, [selectedIndex, emails, activeTab, isComposing]);

  useHotkeys("k", () => {
    if (activeTab !== "inbox" || isComposing || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    if (selectedIndex === null) {
      setSelectedIndex(0);
    } else if (selectedIndex > 0) {
      const prevIndex = selectedIndex - 1;
      setSelectedIndex(prevIndex);
      markAsRead(emails[prevIndex].id);
    }
  }, [selectedIndex, activeTab, isComposing]);

  // e to archive
  useHotkeys("e", () => {
    if (activeTab !== "inbox" || isComposing || selectedIndex === null || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    archiveEmail(emails[selectedIndex].id);
  }, [selectedIndex, emails, activeTab, isComposing]);

  // c to open compose modal
  useHotkeys("c", (e) => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    e.preventDefault();
    setIsComposing(true);
  }, [isComposing]);

  // / to focus search
  useHotkeys("/", (e) => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    e.preventDefault();
    searchInputRef.current?.focus();
  });

  // ? for help modal
  useHotkeys("shift+?", (e) => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    e.preventDefault();
    setShowKeyboardHelp((prev) => !prev);
  });

  // navigation shortcuts
  useHotkeys("g+i", () => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    setActiveTab("inbox");
  });
  useHotkeys("g+c", () => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    setActiveTab("calendar");
  });
  useHotkeys("g+a", () => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    setActiveTab("chat");
  });

  // hold space to talk, release to transcribe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== "dashboard" || e.code !== "Space") return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      e.preventDefault(); // prevent scroll
      if (!isListening) {
        stopSpeech();
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (view !== "dashboard" || e.code !== "Space") return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      e.preventDefault();
      if (isListening) {
        stopListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening, view, startListening, stopListening, stopSpeech]);

  // forward custom voice event to chat panel input
  useEffect(() => {
    const triggerVoiceChat = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const chatSubmitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      const chatInput = document.querySelector('input[placeholder*="Ask Ciel"]') as HTMLInputElement;
      
      if (chatInput && chatSubmitBtn) {
        chatInput.value = customEvent.detail;
        // trigger input event so react updates state
        const inputEvent = new Event("input", { bubbles: true });
        chatInput.dispatchEvent(inputEvent);
        chatSubmitBtn.click();
      }
    };

    window.addEventListener("ciel-voice-command", triggerVoiceChat);
    return () => window.removeEventListener("ciel-voice-command", triggerVoiceChat);
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white select-none relative overflow-hidden font-sans">
      
      {/* landing page */}
      {view === "landing" && (
        <div className="w-full h-full relative flex flex-col justify-between p-8">
          {/* galaxy bg */}
          <div className="absolute inset-0 z-0">
            <CielCanvas scene="landing" />
          </div>

          {/* header */}
          <header className="relative z-10 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="font-mono text-sm tracking-widest font-bold">CIEL // SECURE</span>
          </header>

          {/* hero section */}
          <main className="relative z-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-mono mb-6 animate-pulse">
              <Eye className="w-3.5 h-3.5" />
              INTEGRATION MULTI-CLIENT READY
            </div>
            
            <h1 className="text-5xl font-extrabold tracking-tight text-white font-sans sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-500 leading-tight">
              Ciel Workspace
            </h1>
            
            <p className="text-zinc-400 text-sm leading-relaxed mt-4 max-w-sm">
              Sentient email and calendar coordination system powered by Corsair.dev integrations. Hands-free voice interface.
            </p>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setIsSigningIn(true)}
                className="px-6 h-12 bg-cyan-600 hover:bg-cyan-500 hover:scale-[1.02] active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                Access System
              </button>
            </div>
          </main>

          {/* footer */}
          <footer className="relative z-10 text-center text-[10px] font-mono text-zinc-600">
            Ciel AI v0.1.0 // Developed with Corsair Integration Layer
          </footer>
        </div>
      )}

      {/* login modal */}
      {view === "login" && (
        <div className="w-full h-full relative">
          <div className="absolute inset-0 z-0 blur-sm brightness-[0.3]">
            <CielCanvas scene="landing" />
          </div>
          <AuthPortal onSuccess={() => setIsSigningIn(false)} />
        </div>
      )}

      {/* main dashboard */}
      {view === "dashboard" && (
        <div className="w-full h-full flex overflow-hidden">
          
          {/* sidebar */}
          <Sidebar />

          {/* dashboard content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
            
            {/* header toolbar */}
            <header className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between shrink-0 select-none bg-zinc-950/40 backdrop-blur-md z-20">
              
              {/* search bar */}
              <div className="flex-grow max-w-md relative flex items-center group">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Press / to search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 bg-zinc-900/50 border border-zinc-850 hover:border-zinc-800 focus:border-cyan-500/40 text-xs text-white placeholder-zinc-550 rounded-lg pl-9 pr-4 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* utility triggers */}
              <div className="flex items-center gap-3">
                
                {/* mic indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${isListening ? "bg-red-500 animate-ping" : "bg-zinc-650"}`} />
                  <span className="text-[10px] font-mono text-zinc-400">
                    {isListening ? "Voice Active" : "[Space] Walkie-Talkie"}
                  </span>
                </div>

                {/* keyboard help button */}
                <button
                  onClick={() => setShowKeyboardHelp((prev) => !prev)}
                  className="h-8 w-8 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Keyboard Shortcuts Map"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>

            </header>

            {/* view router */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* inbox tab */}
              {activeTab === "inbox" && (
                <div className="flex-1 flex overflow-hidden h-full">
                  <div className="w-80 border-r border-zinc-900 flex-shrink-0 h-full">
                    <EmailList />
                  </div>
                  <div className="flex-grow h-full">
                    <EmailView key={selectedIndex ?? "none"} isComposing={isComposing} setIsComposing={setIsComposing} />
                  </div>
                </div>
              )}

              {/* calendar tab */}
              {activeTab === "calendar" && <CalendarView />}

              {/* chat tab */}
              {activeTab === "chat" && <ChatPanel />}

              {/* fallback folders */}
              {(activeTab === "sent" || activeTab === "trash") && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/20 text-zinc-600">
                  <Terminal className="w-8 h-8 text-zinc-800 mb-2" />
                  <p className="text-sm font-medium text-zinc-500">System Folder Empty</p>
                  <p className="text-xs text-zinc-600 mt-1">No transactions are registered in this archive index.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* keyboard help modal */}
      {showKeyboardHelp && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                Ciel Keyboard Commands
              </h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-5 h-5 rounded hover:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              
              {/* navigation */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Navigation</h4>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Next email in list</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">J</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Previous email in list</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">K</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Focus advanced search</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">/</kbd>
                </div>
              </div>

              {/* operations */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Operations</h4>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Compose new email</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">C</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Reply to current email</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">R</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Archive selected email</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">E</kbd>
                </div>
              </div>

              {/* global nav */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Global Navigation</h4>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Go to Inbox tab</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">g + i</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Go to Calendar tab</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">g + c</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Go to Ciel Chat</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">g + a</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                  <span className="text-zinc-400">Hold to Speak (Walkie-Talkie)</span>
                  <kbd className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-mono text-cyan-400">Spacebar</kbd>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
