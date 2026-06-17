"use client";

import { useState, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import toast from "react-hot-toast";

interface CalendarTabProps {
  onInitiateCompose: (to?: string, subject?: string, body?: string) => void;
}

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday, etc.
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const cells: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = [];
  
  // Previous month filler days
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevMonthTotalDays - i),
      isCurrentMonth: false,
      dayNum: prevMonthTotalDays - i
    });
  }
  
  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    cells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
      dayNum: i
    });
  }
  
  // Next month filler days (to make the grid a complete multiple of 7, e.g., 42 cells)
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      dayNum: i
    });
  }
  
  return cells;
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export function CalendarTab({ onInitiateCompose }: CalendarTabProps) {
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const calendarEvents = useCielStore((s) => s.calendarEvents);
  const fetchCalendarEvents = useCielStore((s) => s.fetchCalendarEvents);
  const fetchEmails = useCielStore((s) => s.fetchEmails);
  const selectedDate = useCielStore((s) => s.selectedDate);

  const isDark = true;

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("day");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Edit Event Modal states
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState("");
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editEventStart, setEditEventStart] = useState("");
  const [editEventEnd, setEditEventEnd] = useState("");
  const [editEventLocation, setEditEventLocation] = useState("");
  const [editEventDescription, setEditEventDescription] = useState("");
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (selectedDate) {
      setCalendarAnchorDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!calendarConnected) return;
    // Periodically poll the DB cache (non-blocking sync) for updates every 10 seconds
    const interval = setInterval(() => {
      fetchCalendarEvents(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [calendarConnected, fetchCalendarEvents]);

  const handleInitiateEditEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setEditEventTitle(evt.title || "");
    
    const startLocal = new Date(evt.start);
    const endLocal = new Date(evt.end);
    
    const formatLocalDateForInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditEventStart(formatLocalDateForInput(startLocal));
    setEditEventEnd(formatLocalDateForInput(endLocal));
    setEditEventLocation(evt.location || "");
    setEditEventDescription(evt.description || "");
    setShowEditEventModal(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId || !editEventTitle.trim() || isUpdatingEvent) return;

    setIsUpdatingEvent(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEventId,
          title: editEventTitle,
          start: new Date(editEventStart).toISOString(),
          end: new Date(editEventEnd).toISOString(),
          location: editEventLocation,
          description: editEventDescription,
        })
      });

      if (res.ok) {
        setShowEditEventModal(false);
        fetchCalendarEvents();
        toast.success("Event updated successfully!");
      } else {
        const data = await res.json();
        alert("Failed to update event: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to update event", err);
      alert("Error updating event.");
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the event "${title}"?`)) return;

    try {
      const res = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId })
      });

      if (res.ok) {
        fetchCalendarEvents();
        toast.success("Event deleted successfully!");
      } else {
        const data = await res.json();
        alert("Failed to delete event: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to delete event", err);
      alert("Error deleting event.");
    }
  };

  const handleEmailEventDetails = (evt: any) => {
    const startStr = new Date(evt.start).toLocaleString();
    const endStr = new Date(evt.end).toLocaleString();
    const subject = `Event Details: ${evt.title}`;
    const body = `Here are the event details:\n\n` +
      `Title: ${evt.title}\n` +
      `Time: ${startStr} - ${endStr}\n` +
      (evt.location ? `Location: ${evt.location}\n` : "") +
      (evt.attendees && evt.attendees.length > 0 ? `Attendees: ${evt.attendees.join(", ")}\n` : "") +
      (evt.description ? `Description:\n${evt.description}\n` : "");

    onInitiateCompose("", subject, body);
  };

  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const borderClass = isDark ? "border-white/5" : "border-white/20";
  const cardBgClass = isDark 
    ? "bg-transparent backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
    : "bg-transparent backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]";
  const innerCardBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const accordionHeaderBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const buttonBgClass = isDark 
    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" 
    : "bg-white/40 hover:bg-white/60 text-slate-800 border border-white/50";
  const inputBgClass = isDark 
    ? "bg-black/20 focus:bg-black/35 border-white/10 focus:border-purple-500/50 text-white" 
    : "bg-white/35 focus:bg-white/55 border-white/40 focus:border-cyan-500/50 text-slate-900";

  return (
    <div className={`rounded-2xl flex flex-col ${cardBgClass} overflow-hidden h-full min-h-0 w-full`}>
      <div className="h-[72px] px-5 flex items-center justify-between shrink-0 border-b border-white/5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Google Calendar</h2>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${calendarConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className={`text-[10px] font-semibold uppercase ${calendarConnected ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{calendarConnected ? "CONNECTED" : "DISCONNECTED"}</span>
            </div>
          </div>
          <p className={`text-[11px] ${textMutedClass} truncate`}>Corsair synchronization status for user schedules.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 mt-3">
        {calendarConnected ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Calendar Action & Navigation Bar */}
            <div className="px-5 pb-3 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await fetchCalendarEvents(true);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  className={`text-[10px] px-2.5 py-1.5 font-bold uppercase border rounded-lg cursor-pointer disabled:opacity-50 transition-all ${buttonBgClass}`}
                >
                  {isRefreshing ? "..." : "Refresh"}
                </button>
                
                {/* View Selectors */}
                <div className="flex rounded-lg border border-white/10 overflow-hidden bg-black/10">
                  {(["day", "week", "month"] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setCalendarView(view)}
                      className={`text-[9px] px-2.5 py-1 font-bold uppercase cursor-pointer transition-all ${
                        calendarView === view
                          ? "bg-purple-600/20 text-purple-300"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Navigation & Label */}
              <div className={`pt-2 border-t ${borderClass} flex items-center justify-between gap-2`}>
                <span className={`text-[10px] ${textWhiteClass} font-mono font-bold uppercase`}>
                  {(() => {
                    if (!mounted || !selectedDate || !calendarAnchorDate) return "";
                    if (calendarView === "day") {
                      return calendarAnchorDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
                    } else if (calendarView === "week") {
                      const sun = new Date(calendarAnchorDate);
                      sun.setDate(calendarAnchorDate.getDate() - calendarAnchorDate.getDay());
                      const sat = new Date(sun);
                      sat.setDate(sun.getDate() + 6);
                      return `${sun.toLocaleDateString([], { month: "short", day: "numeric" })} - ${sat.toLocaleDateString([], { month: "short", day: "numeric" })}`;
                    } else {
                      return calendarAnchorDate.toLocaleDateString([], { month: "long", year: "numeric" });
                    }
                  })()}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (!calendarAnchorDate) return;
                      const newDate = new Date(calendarAnchorDate);
                      if (calendarView === "day") newDate.setDate(newDate.getDate() - 1);
                      else if (calendarView === "week") newDate.setDate(newDate.getDate() - 7);
                      else newDate.setMonth(newDate.getMonth() - 1);
                      setCalendarAnchorDate(newDate);
                    }}
                    className={`text-[9px] px-2 py-1 font-bold uppercase border rounded-lg cursor-pointer ${buttonBgClass}`}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => {
                      if (selectedDate) setCalendarAnchorDate(selectedDate);
                    }}
                    className={`text-[9px] px-2 py-1 font-bold uppercase border rounded-lg cursor-pointer ${buttonBgClass}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      if (!calendarAnchorDate) return;
                      const newDate = new Date(calendarAnchorDate);
                      if (calendarView === "day") newDate.setDate(newDate.getDate() + 1);
                      else if (calendarView === "week") newDate.setDate(newDate.getDate() + 7);
                      else newDate.setMonth(newDate.getMonth() + 1);
                      setCalendarAnchorDate(newDate);
                    }}
                    className={`text-[9px] px-2 py-1 font-bold uppercase border rounded-lg cursor-pointer ${buttonBgClass}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar View Content Area */}
            <div className={`flex-1 border-t ${borderClass} overflow-y-auto p-4 min-h-0`}>
              {!mounted || !selectedDate || !calendarAnchorDate ? (
                <div className={`text-xs ${textMutedClass}`}>Loading calendar...</div>
              ) : calendarView === "day" ? (
                /* Day View */
                <div className="space-y-3">
                  {(() => {
                    const dayEvents = calendarEvents.filter((evt) => isSameDay(new Date(evt.start), calendarAnchorDate!));
                    if (dayEvents.length === 0) {
                      return <p className={`text-xs ${textMutedClass}`}>No events scheduled for this day.</p>;
                    }
                    return dayEvents.map((evt) => (
                      <div key={evt.id} className={`border ${borderClass} p-4 ${innerCardBgClass} rounded-xl text-xs shadow-sm`}>
                        <div className={`flex flex-col sm:flex-row justify-between mb-2 pb-1.5 border-b ${borderClass}/50`}>
                          <span className={`font-bold ${textWhiteClass} tracking-tight`}>{evt.title}</span>
                          <span className="text-slate-500 font-mono">
                            {new Date(evt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(evt.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {evt.location && <p className={`mb-1 ${isDark ? "text-slate-300" : "text-slate-600"} font-sans font-normal leading-relaxed`}>Location: {evt.location}</p>}
                        {evt.attendees && evt.attendees.length > 0 && (
                          <p className={`mb-1 ${isDark ? "text-slate-300" : "text-slate-600"} font-sans font-normal leading-relaxed`}>Attendees: {evt.attendees.join(", ")}</p>
                        )}
                        {evt.description && (
                          <p className={`${isDark ? "text-slate-350" : "text-slate-700"} font-sans font-normal leading-relaxed whitespace-pre-wrap bg-slate-900/5 dark:bg-black/20 p-3 border border-slate-900/5 dark:border-white/5 rounded-xl mt-2`}>{evt.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-3.5 pt-2.5 border-t border-slate-900/5 dark:border-white/5 justify-end">
                          <button
                            onClick={() => handleEmailEventDetails(evt)}
                            className="px-2 py-1 text-[9px] font-bold uppercase cursor-pointer rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-305 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex items-center"
                            title="Compose email with event details"
                          >
                            Email Event Details
                          </button>
                          <button
                            onClick={() => handleInitiateEditEvent(evt)}
                            className="px-2 py-1 text-[9px] font-bold uppercase cursor-pointer rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-305 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="px-2 py-1 text-[9px] font-bold uppercase cursor-pointer rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : calendarView === "week" ? (
                /* Week View */
                <div className="flex flex-col md:grid md:grid-cols-7 gap-2 h-full min-h-0">
                  {(() => {
                    const startOfWeek = new Date(calendarAnchorDate!);
                    startOfWeek.setDate(calendarAnchorDate!.getDate() - calendarAnchorDate!.getDay());
                    const weekDays = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(startOfWeek);
                      d.setDate(startOfWeek.getDate() + i);
                      return d;
                    });
                    return weekDays.map((day) => {
                      const eventsForDay = calendarEvents.filter((evt) => isSameDay(new Date(evt.start), day));
                      const isToday = isSameDay(day, selectedDate!);
                      const isAnchor = isSameDay(day, calendarAnchorDate!);
                      
                      return (
                        <div 
                          key={day.toISOString()} 
                          onClick={() => { setCalendarAnchorDate(day); setCalendarView("day"); }}
                          className={`flex-1 min-h-0 flex flex-col p-2 rounded-xl border transition-all cursor-pointer hover:bg-white/5 ${
                            isToday
                              ? "bg-purple-500/5 border-purple-500/30"
                              : isAnchor
                              ? "bg-white/5 border-white/20"
                              : `border-white/5 ${innerCardBgClass}`
                          }`}
                        >
                          <div className="text-center pb-1.5 border-b border-white/5 mb-1.5 shrink-0">
                            <span className="text-[9px] uppercase text-slate-500 block font-bold">
                              {day.toLocaleDateString([], { weekday: "short" })}
                            </span>
                            <span className={`text-xs font-bold font-mono ${isToday ? "text-purple-400" : textWhiteClass}`}>
                              {day.getDate()}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-1 min-h-[50px] md:min-h-0">
                            {eventsForDay.length === 0 ? (
                              <span className="text-[9px] text-slate-500/50 block text-center italic mt-2">No events</span>
                            ) : (
                              eventsForDay.map((evt) => {
                                const timeStr = new Date(evt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
                                return (
                                  <div 
                                    key={evt.id} 
                                    className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 truncate"
                                    title={`${evt.title} (${timeStr})`}
                                  >
                                    <span className="font-mono font-bold mr-1">{timeStr}</span>
                                    {evt.title}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                /* Month View */
                <div className="flex flex-col h-full min-h-0">
                  <div className="grid grid-cols-7 gap-1 text-center border-b border-white/5 pb-1 mb-1.5 shrink-0">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                      <span key={dayName} className="text-[9px] uppercase font-bold text-slate-500">
                        {dayName}
                      </span>
                    ))}
                  </div>

                  <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 min-h-0">
                    {getDaysInMonth(calendarAnchorDate!).map((cell) => {
                      const dayEvts = calendarEvents.filter((evt) => isSameDay(new Date(evt.start), cell.date));
                      const isToday = isSameDay(cell.date, selectedDate!);
                      const isSelected = isSameDay(cell.date, calendarAnchorDate!);
                      
                      return (
                        <div
                          key={cell.date.toISOString()}
                          onClick={() => { setCalendarAnchorDate(cell.date); setCalendarView("day"); }}
                          className={`min-h-0 p-1 rounded-lg border transition-all cursor-pointer flex flex-col justify-between hover:bg-white/5 ${
                            isToday
                              ? "bg-purple-500/5 border-purple-500/30"
                              : isSelected
                              ? "bg-white/5 border-white/20"
                              : `border-white/5 ${innerCardBgClass}`
                          } ${!cell.isCurrentMonth ? "opacity-30" : "opacity-100"}`}
                        >
                          <span className={`text-[9px] font-bold font-mono self-end ${isToday ? "text-purple-400" : textWhiteClass}`}>
                            {cell.dayNum}
                          </span>
                          
                          <div className="flex-1 flex flex-col justify-end space-y-0.5 mt-1 overflow-hidden">
                            {dayEvts.slice(0, 2).map((evt) => (
                              <div 
                                key={evt.id} 
                                className="text-[9.5px] bg-purple-500/10 text-purple-350 border border-purple-500/20 px-1 py-0.5 rounded truncate w-full"
                                title={evt.title}
                              >
                                {evt.title}
                              </div>
                            ))}
                            {dayEvts.length > 2 && (
                              <span className="text-[7px] text-slate-500 font-bold block text-right">
                                +{dayEvts.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 pt-2 shrink-0">
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/corsair/connect?plugin=googlecalendar");
                  const data = await res.json();
                  if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                } catch (e) { console.error("Failed to connect calendar:", e); }
              }}
              className={`text-center w-full py-2.5 ${buttonBgClass} border border-slate-900/10 dark:border-white/5 rounded-xl text-xs uppercase font-bold cursor-pointer`}
            >
              Connect Calendar
            </button>
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {showEditEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowEditEventModal(false)}>
          <div 
            className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[400px] ${cardBgClass} transition-transform duration-300 transform scale-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${borderClass} flex items-center justify-between ${accordionHeaderBgClass}`}>
              <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Edit Event Details</h3>
              <button 
                onClick={() => setShowEditEventModal(false)}
                className="text-slate-500 hover:text-slate-950 dark:hover:text-white font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateEvent} className="flex-1 flex flex-col p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Title:</label>
                <input 
                  type="text" 
                  value={editEventTitle}
                  onChange={(e) => setEditEventTitle(e.target.value)}
                  placeholder="Event Title"
                  required
                  className={`w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Start Time:</label>
                  <input 
                    type="datetime-local" 
                    value={editEventStart}
                    onChange={(e) => setEditEventStart(e.target.value)}
                    required
                    className={`w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold">End Time:</label>
                  <input 
                    type="datetime-local" 
                    value={editEventEnd}
                    onChange={(e) => setEditEventEnd(e.target.value)}
                    required
                    className={`w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Location:</label>
                <input 
                  type="text" 
                  value={editEventLocation}
                  onChange={(e) => setEditEventLocation(e.target.value)}
                  placeholder="Event Location (optional)"
                  className={`w-full text-xs p-2.5 outline-none rounded-xl border transition-all duration-300 ${inputBgClass}`}
                />
              </div>
              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Description:</label>
                <textarea 
                  value={editEventDescription}
                  onChange={(e) => setEditEventDescription(e.target.value)}
                  placeholder="Event description (optional)"
                  rows={4}
                  className={`flex-1 text-xs p-3 outline-none rounded-xl border transition-all duration-300 ${inputBgClass} resize-none`}
                />
              </div>
              <div className={`pt-3 border-t border-slate-900/10 dark:border-white/10 flex justify-end gap-2 shrink-0`}>
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  className="px-3.5 py-2 text-slate-500 hover:text-slate-950 dark:hover:text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEvent || !editEventTitle.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white rounded-xl font-bold uppercase text-[10px] cursor-pointer transition-colors"
                >
                  {isUpdatingEvent ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
