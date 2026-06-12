"use client";

import { useState, useRef, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import { useSession, signIn } from "next-auth/react";
import { useHotkeys } from "react-hotkeys-hook";
import { useSpeechToText, useTextToSpeech } from "@/lib/speech";
import CielCanvas from "@/components/3d/CielCanvas";
import AuthPortal from "@/components/ui/AuthPortal";
import Sidebar from "@/components/ui/Sidebar";
import Overview from "@/components/ui/Overview";
import EmailList from "@/components/ui/EmailList";
import EmailView from "@/components/ui/EmailView";
import CalendarView from "@/components/ui/CalendarView";
import ChatPanel from "@/components/ui/ChatPanel";
import SettingsView from "@/components/ui/SettingsView";
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

  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const fetchCalendarEvents = useCielStore((s) => s.fetchCalendarEvents);
  const performSearch = useCielStore((s) => s.performSearch);
  const login = useCielStore((s) => s.login);
  const logout = useCielStore((s) => s.logout);

  const { data: session, status } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const view = user ? "dashboard" : (isSigningIn ? "login" : "landing");

  // Sync NextAuth session state with Zustand store
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const name = session.user.name || "User";
      const email = session.user.email || "";
      if (!user || user.email !== email || user.name !== name) {
        login(name, email);
      }
    } else if (status === "unauthenticated") {
      if (user) {
        logout();
      }
    }
  }, [status, session, user, login, logout]);
  const [isComposing, setIsComposing] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load initial data from Postgres on load / when dashboard is active
  useEffect(() => {
    if (view === "dashboard") {
      fetchEmails();
      fetchCalendarEvents();
    }
  }, [view, fetchEmails, fetchCalendarEvents]);

  // Debounce search input to query the database using vector matching
  useEffect(() => {
    if (view !== "dashboard") return;

    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        fetchEmails();
        fetchCalendarEvents();
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, view, performSearch, fetchEmails, fetchCalendarEvents]);

  // voice control setup
  const { speak, stop: stopSpeech } = useTextToSpeech();
  const handleVoiceInput = (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    const query = trimmed.toLowerCase();
    
    // Check navigation first
    if (query.includes("open inbox") || query.includes("show inbox") || query.includes("go to inbox") || query.includes("open email")) {
      setActiveTab("inbox");
      speak("Opening inbox.");
    } else if (query.includes("open calendar") || query.includes("show calendar") || query.includes("go to calendar") || query.includes("open schedule")) {
      setActiveTab("calendar");
      speak("Loading schedule planner.");
    } else if (query.includes("open assistant") || query.includes("show assistant") || query.includes("go to assistant") || query.includes("open chat")) {
      setActiveTab("chat");
      speak("Summoning conversational console.");
    } else if (query.includes("open settings") || query.includes("go to settings")) {
      setActiveTab("settings");
      speak("Opening settings.");
    } else if (query.includes("open overview") || query.includes("go to overview") || query.includes("go to dashboard")) {
      setActiveTab("overview");
      speak("Opening dashboard overview.");
    } else {
      // Otherwise route query to ChatPanel and switch view
      setActiveTab("chat");
      setTimeout(() => {
        const event = new CustomEvent("ciel-voice-command", { detail: trimmed });
        window.dispatchEvent(event);
      }, 150);
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
  useHotkeys("g+o", () => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    setActiveTab("overview");
  });
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
  useHotkeys("g+s", () => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    setActiveTab("settings");
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

  if (status === "loading") {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-void text-crisp-white font-sans select-none relative overflow-hidden">
        <div className="cyber-glass p-8 rounded-2xl flex flex-col items-center max-w-sm text-center shadow-2xl relative z-10 border border-white/10">
          <Terminal className="w-8 h-8 text-cyan-glow mb-4 animate-[spin_3s_linear_infinite]" />
          <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-crisp-white">
            Initializing Ciel
          </h2>
          <p className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider mt-2">
            Establishing secure session
          </p>
          <div className="w-24 h-0.5 bg-white/5 rounded-full overflow-hidden mt-6 relative">
            <div className="absolute inset-y-0 bg-gradient-to-r from-cyan-glow to-cyber-magenta w-1/2 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-void text-crisp-white select-none relative overflow-hidden font-sans">
      
      {/* landing page */}
      {view === "landing" && (
        <div className="w-full h-full relative flex flex-col justify-between p-8">

          {/* header */}
          <header className="relative z-10 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-glow animate-pulse" />
            <span className="font-mono text-sm tracking-widest font-bold text-crisp-white">CIEL // SECURE</span>
          </header>

          {/* hero section */}
          <main className="relative z-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-glow/20 bg-cyan-glow/5 text-cyan-glow text-xs font-mono mb-6 animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <Eye className="w-3.5 h-3.5" />
              INTEGRATION MULTI-CLIENT READY
            </div>
            
            <h1 className="text-5xl font-extrabold tracking-tight text-white font-sans sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-crisp-white via-ice-blue to-cyan-glow leading-tight drop-shadow-[0_0_30px_rgba(0,240,255,0.15)]">
              Ciel Workspace
            </h1>
            
            <p className="text-silvery-gray/70 text-sm leading-relaxed mt-4 max-w-sm">
              Sentient email and calendar coordination system powered by Corsair.dev integrations. Hands-free voice interface.
            </p>

            <div className="mt-8 flex gap-4 items-center justify-center">
              <button
                onClick={() => signIn("google")}
                className="px-6 h-12 bg-gradient-to-r from-cyan-glow to-cyber-magenta hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-void font-bold rounded-xl text-sm shadow-[0_0_25px_rgba(0,240,255,0.2)] transition-all cursor-pointer border border-cyan-glow/10"
              >
                Sign In
              </button>
              <button
                onClick={() => signIn("google")}
                className="px-6 h-12 border border-white/10 hover:border-cyan-glow/30 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] text-crisp-white font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </main>

          {/* footer */}
          <footer className="relative z-10 text-center text-[10px] font-mono text-silvery-gray/30">
            Ciel AI v0.1.0 // Developed with Corsair Integration Layer
          </footer>
        </div>
      )}

      {/* login modal */}
      {view === "login" && (
        <div className="w-full h-full relative">
          <AuthPortal />
        </div>
      )}

      {/* main dashboard */}
      {view === "dashboard" && (
        <div className="w-full h-full flex overflow-hidden">
          
          {/* sidebar */}
          <Sidebar />

          {/* dashboard content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-void">
            
            {/* header toolbar (rendered conditionally based on active tab) */}
            {activeTab !== "overview" && activeTab !== "settings" && (
              <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0 select-none bg-abyssal/40 backdrop-blur-md z-20">
                
                {/* search bar */}
                <div className="flex-grow max-w-md relative flex items-center group">
                  <Search className="w-4 h-4 text-silvery-gray/40 absolute left-3 group-focus-within:text-cyan-glow transition-colors" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Press / to search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 bg-void border border-white/10 hover:border-white/20 focus:border-cyan-glow/40 text-xs text-crisp-white placeholder-silvery-gray/30 rounded-lg pl-9 pr-4 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 text-[10px] font-mono text-silvery-gray hover:text-crisp-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* utility triggers */}
                <div className="flex items-center gap-3">
                  
                  {/* mic indicator */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-void border border-white/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${isListening ? "bg-crimson animate-ping" : "bg-silvery-gray/40"}`} />
                    <span className={`text-[10px] font-mono ${isListening ? "text-crimson font-bold" : "text-silvery-gray/70"}`}>
                      {isListening ? "Voice Active" : "[Space] Walkie-Talkie"}
                    </span>
                  </div>

                  {/* keyboard help button */}
                  <button
                    onClick={() => setShowKeyboardHelp((prev) => !prev)}
                    className="h-8 w-8 rounded bg-void hover:bg-white/5 border border-white/10 flex items-center justify-center text-silvery-gray hover:text-crisp-white transition-all cursor-pointer shadow-sm"
                    title="Keyboard Shortcuts Map"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>

              </header>
            )}

            {/* view router */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* overview tab */}
              {activeTab === "overview" && <Overview />}

              {/* inbox tab */}
              {activeTab === "inbox" && (
                <div className="flex-1 flex overflow-hidden h-full">
                  <div className="w-80 border-r border-white/10 flex-shrink-0 h-full">
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

              {/* settings tab */}
              {activeTab === "settings" && <SettingsView />}

            </div>
          </div>
        </div>
      )}

      {/* keyboard help modal */}
      {showKeyboardHelp && (
        <div className="absolute inset-0 bg-void/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-abyssal border border-white/10 rounded-2xl p-6 shadow-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-crisp-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-glow" />
                Ciel Keyboard Commands
              </h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-5 h-5 rounded hover:bg-white/5 flex items-center justify-center text-silvery-gray hover:text-crisp-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              
              {/* navigation */}
              <div className="space-y-2">
                <h4 className="font-bold text-crisp-white uppercase tracking-wider text-[10px]">Navigation</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Next email in list</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">J</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Previous email in list</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">K</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Focus advanced search</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">/</kbd>
                </div>
              </div>

              {/* operations */}
              <div className="space-y-2">
                <h4 className="font-bold text-crisp-white uppercase tracking-wider text-[10px]">Operations</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Compose new email</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">C</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Reply to current email</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">R</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Archive selected email</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">E</kbd>
                </div>
              </div>

              {/* global nav */}
              <div className="space-y-2">
                <h4 className="font-bold text-crisp-white uppercase tracking-wider text-[10px]">Global Navigation</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Go to Overview tab</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">g + o</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Go to Inbox tab</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">g + i</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Go to Calendar tab</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">g + c</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Go to Ciel Chat</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">g + a</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Go to Settings tab</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">g + s</kbd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-silvery-gray">Hold to Speak (Walkie-Talkie)</span>
                  <kbd className="bg-void px-2 py-0.5 rounded border border-white/10 font-mono text-cyan-glow">Spacebar</kbd>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
