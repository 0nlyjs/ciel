"use client";

import { useState, useEffect } from "react";
import { useCielStore, Email, CalendarEvent } from "@/store/useCielStore";
import { useSpeechToText, useTextToSpeech } from "@/lib/speech";
import CielCanvas from "../3d/CielCanvas";
import {
  Inbox,
  Calendar,
  Bell,
  Sparkles,
  Mic,
  MicOff,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Globe
} from "lucide-react";

export default function Overview() {
  const user = useCielStore((s) => s.user);
  const emails = useCielStore((s) => s.emails);
  const calendarEvents = useCielStore((s) => s.calendarEvents);
  const addChatMessage = useCielStore((s) => s.addChatMessage);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const cielStatus = useCielStore((s) => s.cielStatus);
  const setCielStatus = useCielStore((s) => s.setCielStatus);
  const setSelectedEmailIndex = useCielStore((s) => s.setSelectedEmailIndex);
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const fetchIntegrationStatus = useCielStore((s) => s.fetchIntegrationStatus);

  const [input, setInput] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // Fetch status on load
  useEffect(() => {
    fetchIntegrationStatus();
  }, [fetchIntegrationStatus]);

  // Set date client-side to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Speech hooks
  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim()) {
      handleSubmitCommand(transcript);
    }
  };

  const { isListening, startListening, stopListening, supported: speechSupported } =
    useSpeechToText(handleVoiceInput);
  const { stop: stopSpeech } = useTextToSpeech();

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeech();
      startListening();
    }
  };

  const handleSubmitCommand = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // Add message and route to chat tab
    addChatMessage({ role: "user", content: trimmed });
    setActiveTab("chat");
  };

  // Get dynamic priority/unread emails count
  const unreadEmails = emails.filter((e) => !e.read);
  const priorityList = emails.slice(0, 3); // Take top 3 for dashboard display

  // Weather mock (e.g. San Francisco, 18°C)
  const weatherMock = "San Francisco, 18°C";

  // Helper to render priority items' custom icons
  const getEmailIcon = (email: Email) => {
    if (email.from.toLowerCase().includes("security") || email.subject.toLowerCase().includes("security") || email.subject.toLowerCase().includes("alert")) {
      return (
        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    if (email.priority === "high") {
      return (
        <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
          <Zap className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
        <CheckCircle2 className="w-5 h-5" />
      </div>
    );
  };

  // Quick action suggestions
  const suggestions = [
    { text: "Summarize morning emails", label: '"Summarize morning emails"' },
    { text: "Show me my next meeting", label: '"Next meeting?"' },
  ];

  // Calendar calendar widget builder
  const today = currentDate || new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Start day of month (0 = Sunday, 1 = Monday...)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Generate calendar grid array
  const calendarCells = [];
  // Empty slots for previous month's overlap
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Current month's days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Check if a specific day has any calendar events
  const hasEventOnDay = (day: number) => {
    return calendarEvents.some((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear
      );
    });
  };

  // Formatted header date (e.g. Monday, Oct 21)
  const getFormattedHeaderDate = () => {
    if (!currentDate) return "Loading...";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "short",
      day: "numeric",
    };
    return currentDate.toLocaleDateString("en-US", options);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-void overflow-y-auto font-sans p-8 lg:p-12 select-none relative">
      
      {/* Top Greeting and Weather Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 border-b border-white/10 pb-6 mb-8 shrink-0">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-crisp-white leading-tight">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-glow via-ice-blue to-crisp-white">{user?.name.split(" ")[0] || "Alexander"}.</span>
          </h1>
          <p className="text-silvery-gray text-sm mt-2 font-medium">
            Ciel is ready to help you navigate your day.
          </p>
        </div>

        <div className="flex items-center gap-5 self-end md:self-auto">
          <div className="text-right">
            <span className="text-xs font-mono font-semibold text-crisp-white block">
              {getFormattedHeaderDate()}
            </span>
            <span className="text-[11px] font-medium text-silvery-gray/60 block mt-0.5">
              {weatherMock}
            </span>
          </div>

          {/* Notification Bell */}
          <button className="relative w-10 h-10 rounded-full border border-white/10 bg-abyssal/80 flex items-center justify-center text-silvery-gray hover:text-crisp-white hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-glow animate-pulse shadow-[0_0_8px_#00F0FF]" />
          </button>
        </div>
      </header>

      {/* Main Grid Columns */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {!(gmailConnected && calendarConnected) ? (
          <section className="cyber-glass rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl col-span-1 lg:col-span-2 min-h-[350px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyber-magenta/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-glow/10 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-glow/20 to-cyber-magenta/20 border border-white/10 flex items-center justify-center mb-6 shadow-inner animate-pulse">
              <Globe className="w-8 h-8 text-cyan-glow" />
            </div>

            <h2 className="text-crisp-white text-lg font-bold tracking-wide uppercase">Workspace coordinates offline</h2>
            <p className="text-silvery-gray/60 text-xs mt-3 max-w-md leading-relaxed">
              Integrate Gmail and Google Calendar to enable intelligence coordination routing, unread email classifications, semantic search, and meetings orchestrations.
            </p>

            <div className="flex justify-center mt-8 w-full max-w-sm">
              <button
                onClick={async () => {
                  try {
                    const targetPlugin = !gmailConnected ? "gmail" : "googlecalendar";
                    const res = await fetch(`/api/auth/corsair/connect?plugin=${targetPlugin}`);
                    const data = await res.json();
                    if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full h-11 bg-gradient-to-r from-cyan-glow to-cyber-magenta hover:opacity-90 active:scale-[0.98] text-void font-bold rounded-xl text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all cursor-pointer border border-cyan-glow/10 flex items-center justify-center gap-2"
              >
                {!gmailConnected && !calendarConnected && "Connect Gmail & Calendar"}
                {gmailConnected && !calendarConnected && "Connect Calendar"}
                {!gmailConnected && calendarConnected && "Connect Gmail"}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Priority Inbox Column */}
            <section className="cyber-glass rounded-2xl p-6 flex flex-col h-[400px] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-cyan-glow" />
                  <h2 className="text-sm font-semibold tracking-wider uppercase text-crisp-white">
                    Priority Inbox
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow">
                    {unreadEmails.length} Unread
                  </span>
                  <button
                    onClick={() => setActiveTab("inbox")}
                    className="text-xs text-cyan-glow hover:text-ice-blue font-bold transition-colors cursor-pointer"
                  >
                    Open Gmail
                  </button>
                </div>
              </div>

              {/* Email list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {priorityList.map((email, idx) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmailIndex(emails.findIndex(e => e.id === email.id));
                      setActiveTab("inbox");
                    }}
                    className="flex items-start gap-4 p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    {getEmailIcon(email)}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="text-xs font-bold text-crisp-white truncate max-w-[140px]">
                          {email.from}
                        </h3>
                        <span className="text-[10px] font-mono text-silvery-gray/60">{email.date}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-silvery-gray truncate">
                        {email.subject}
                      </h4>
                      <p className="text-[11px] text-silvery-gray/45 line-clamp-1 mt-0.5">
                        {email.body}
                      </p>
                    </div>
                  </div>
                ))}
                {priorityList.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-silvery-gray/50">
                    <Inbox className="w-8 h-8 text-silvery-gray/30 mb-2" />
                    <p className="text-xs font-medium">Your priority inbox is empty.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Upcoming Meetings Column */}
            <section className="cyber-glass rounded-2xl p-6 flex flex-col h-[400px] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-glow" />
                  <h2 className="text-sm font-semibold tracking-wider uppercase text-crisp-white">
                    Upcoming Meetings
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className="text-xs text-cyan-glow hover:text-ice-blue font-bold transition-colors cursor-pointer"
                >
                  View Calendar
                </button>
              </div>

              {/* Calendar Calendar Widget */}
              <div className="flex-1 flex flex-col justify-center">
                {/* Widget Header */}
                <div className="flex items-center justify-between px-2 mb-4">
                  <span className="text-xs font-bold text-crisp-white">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-white/5 text-silvery-gray hover:text-crisp-white transition-colors cursor-pointer">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-white/5 text-silvery-gray hover:text-crisp-white transition-colors cursor-pointer">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Days Names */}
                <div className="grid grid-cols-7 text-center mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <span key={i} className="text-[10px] font-bold font-mono text-silvery-gray/40">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} />;
                    }
                    const isToday = day === today.getDate();
                    const hasEvent = hasEventOnDay(day);

                    return (
                      <div
                        key={`day-${day}`}
                        className="flex flex-col items-center justify-center h-9 relative"
                      >
                        <span
                          className={`text-xs font-mono w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                            isToday
                              ? "bg-cyan-glow text-void font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                              : "text-silvery-gray hover:bg-white/5 hover:text-crisp-white cursor-pointer"
                          }`}
                        >
                          {day}
                        </span>
                        {hasEvent && !isToday && (
                          <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-glow" />
                        )}
                        {hasEvent && isToday && (
                          <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-void" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Bottom Assistant Section */}
      <section className="flex flex-col items-center justify-center mt-12 w-full max-w-2xl mx-auto mb-4 shrink-0">
        
        {/* Ciel 3D Orb Canvas Wrapper */}
        <div className="relative flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 rounded-full border border-white/10 bg-void overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.15)] flex items-center justify-center group">
            <div className="absolute inset-0 z-0">
              <CielCanvas scene="dashboard" />
            </div>
          </div>

          {/* status label pill */}
          <div className="absolute -bottom-2.5 z-10">
            <span className="text-[9px] font-mono tracking-widest font-extrabold uppercase px-3 py-1 rounded-full bg-abyssal border border-white/10 text-cyan-glow shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              {cielStatus === "listening" && "Listening..."}
              {cielStatus === "thinking" && "Thinking..."}
              {cielStatus === "speaking" && "Speaking..."}
              {cielStatus === "error" && "Error"}
              {cielStatus === "idle" && "Ciel is Active"}
            </span>
          </div>
        </div>

        {/* Command bar input */}
        <div className="w-full flex items-center gap-3 mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitCommand(input);
            }}
            className="flex-1 relative flex items-center bg-abyssal/50 border border-white/10 focus-within:border-cyan-glow/50 rounded-2xl h-14 px-4 shadow-2xl transition-all"
          >
            <Sparkles className="w-5 h-5 text-cyan-glow shrink-0 mr-3 animate-pulse" />
            
            <input
              type="text"
              placeholder={isListening ? "Listening to your request..." : `How can I help you, ${user?.name.split(" ")[0] || "Alexander"}?`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-full bg-transparent text-sm text-crisp-white placeholder-silvery-gray/30 outline-none pr-12"
            />

            {/* Mic toggle icon */}
            {speechSupported && (
              <button
                type="button"
                onClick={handleMicClick}
                className={`absolute right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? "bg-crimson/10 text-crimson animate-pulse border border-crimson/25 shadow-[0_0_8px_rgba(255,42,85,0.2)]"
                    : "text-silvery-gray hover:text-crisp-white hover:bg-white/5"
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </form>

          {/* Launch Zap Action Button */}
          <button
            onClick={() => handleSubmitCommand(input)}
            className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-glow via-ice-blue to-cyan-glow hover:scale-[1.02] active:scale-[0.98] text-void flex items-center justify-center shadow-lg shadow-cyan-glow/20 transition-all cursor-pointer font-bold"
          >
            <Zap className="w-5 h-5 fill-void stroke-void" />
          </button>
        </div>

        {/* Quick action chips */}
        <div className="flex items-center gap-3 mt-4">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSubmitCommand(sug.text)}
              className="px-4 py-1.5 rounded-full border border-white/10 hover:border-cyan-glow/30 bg-white/5 text-silvery-gray hover:text-crisp-white text-xs font-semibold transition-all cursor-pointer"
            >
              {sug.label}
            </button>
          ))}
        </div>

      </section>

    </div>
  );
}
