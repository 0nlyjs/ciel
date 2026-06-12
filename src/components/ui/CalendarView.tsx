"use client";

import { useState } from "react";
import { useCielStore } from "@/store/useCielStore";
import { CorsairClient } from "@/lib/corsair";
import { Calendar, Clock, MapPin, Users, Plus, X, AlignLeft } from "lucide-react";

export default function CalendarView() {
  const events = useCielStore((s) => s.calendarEvents);

  // modal / form state
  const [showCreator, setShowCreator] = useState(false);
  const [title, setTitle] = useState("");
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // timeline slots: 8am to 8pm
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // [8, 9, 10, ..., 20]

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || !endTime) return;

    setIsCreating(true);

    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTime}:00`;
    const attendeesArray = attendees
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    await CorsairClient.createCalendarInvite(
      title,
      attendeesArray,
      startISO,
      endISO,
      location || undefined,
      description || undefined
    );

    // reset
    setTitle("");
    setLocation("");
    setAttendees("");
    setDescription("");
    setShowCreator(false);
    setIsCreating(false);
  };

  // format iso string to 12-hour format
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.split("T")[1]?.substring(0, 5) || isoString;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // check if event is scheduled for this hour
  const getEventForHour = (hour: number) => {
    return events.filter((e) => {
      const startHour = new Date(e.start).getHours();
      return startHour === hour;
    });
  };

  return (
    <div className="flex-1 flex bg-void font-sans h-full overflow-hidden select-none">
      
      {/* planner timeline */}
      <div className="flex-1 border-r border-white/10 overflow-y-auto flex flex-col h-full cyber-glass">
        {/* header */}
        <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-abyssal/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <h1 className="text-sm font-semibold tracking-wider uppercase text-crisp-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-glow" />
            Schedule Planner
          </h1>
          <button
            onClick={() => setShowCreator(true)}
            className="h-8 px-3 rounded bg-gradient-to-r from-cyan-glow to-ice-blue hover:opacity-90 active:scale-[0.98] text-xs font-bold text-void flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)]"
          >
            <Plus className="w-3.5 h-3.5 text-void stroke-[3]" />
            Schedule Invite
          </button>
        </div>

        {/* timeline grid */}
        <div className="p-6 space-y-6">
          {hours.map((hour) => {
            const formattedHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`;
            const hourEvents = getEventForHour(hour);

            return (
              <div key={hour} className="flex gap-4 items-start group min-h-[50px]">
                {/* hour label */}
                <span className="w-16 text-right text-xs font-mono text-silvery-gray/65 pt-0.5 select-none">
                  {formattedHour}
                </span>

                {/* event slot */}
                <div className="flex-1 border-t border-white/10 pt-3 relative min-h-[40px]">
                  {hourEvents.length === 0 ? (
                    <span className="text-xs text-silvery-gray/30 italic opacity-0 group-hover:opacity-100 transition-opacity">
                      Free slot
                    </span>
                  ) : (
                    <div className="grid gap-3">
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="bg-abyssal/80 border border-white/10 hover:border-cyan-glow/30 rounded-xl p-4 transition-all relative overflow-hidden group/card shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-glow" />
                          <h4 className="text-sm font-bold text-crisp-white tracking-tight">
                            {event.title}
                          </h4>
                          
                          {/* timing/details */}
                          <div className="flex items-center gap-4 text-xs text-silvery-gray mt-2 flex-wrap">
                            <span className="flex items-center gap-1.5 font-mono text-[11px] text-ice-blue">
                              <Clock className="w-3.5 h-3.5 text-silvery-gray/70" />
                              {formatTime(event.start)} - {formatTime(event.end)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1.5 truncate max-w-[200px] text-silvery-gray/80">
                                <MapPin className="w-3.5 h-3.5 text-silvery-gray/70" />
                                {event.location}
                              </span>
                            )}
                          </div>

                          {event.description && (
                            <p className="text-xs text-silvery-gray/50 mt-2 leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/10">
                              <Users className="w-3.5 h-3.5 text-silvery-gray/70" />
                              <div className="flex gap-1 flex-wrap">
                                {event.attendees.map((email) => (
                                  <span
                                    key={email}
                                    className="text-[9px] font-mono font-medium px-2 py-0.5 rounded bg-void border border-white/10 text-silvery-gray/75"
                                  >
                                    {email}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* upcoming list / form panel */}
      {showCreator ? (
        <div className="w-80 cyber-glass border-l border-white/10 p-6 flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-crisp-white">
              New Calendar Invite
            </h3>
            <button
              onClick={() => setShowCreator(false)}
              className="w-5 h-5 rounded hover:bg-white/5 flex items-center justify-center text-silvery-gray hover:text-crisp-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4 flex-grow">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-silvery-gray uppercase tracking-wider">
                Event Title
              </label>
              <input
                type="text"
                placeholder="e.g. Project Sync"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 bg-void border border-white/10 focus:border-cyan-glow/50 text-xs text-crisp-white rounded-lg px-3 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-silvery-gray uppercase tracking-wider">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-9 bg-void border border-white/10 text-xs text-crisp-white rounded-lg px-2 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-silvery-gray uppercase tracking-wider">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-9 bg-void border border-white/10 text-xs text-crisp-white rounded-lg px-2 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-silvery-gray uppercase tracking-wider">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Discord Stage, Zoom"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-9 bg-void border border-white/10 focus:border-cyan-glow/50 text-xs text-crisp-white rounded-lg px-3 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-silvery-gray uppercase tracking-wider">
                Attendees (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="dev@corsair.dev, team@ciel.app"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                className="w-full h-9 bg-void border border-white/10 focus:border-cyan-glow/50 text-xs text-crisp-white rounded-lg px-3 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-silvery-gray uppercase tracking-wider">
                Description
              </label>
              <textarea
                placeholder="Event description detail"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-void border border-white/10 focus:border-cyan-glow/50 text-xs text-crisp-white rounded-lg p-3 outline-none resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full h-9 bg-gradient-to-r from-cyan-glow to-cyber-magenta hover:opacity-90 active:scale-[0.98] text-xs font-bold text-void rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)]"
            >
              {isCreating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Save Meeting"
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-80 cyber-glass border-l border-white/10 p-6 flex flex-col h-full overflow-y-auto shrink-0 select-none">
          <h3 className="text-xs font-bold uppercase tracking-wider text-crisp-white border-b border-white/10 pb-4 mb-4 flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-cyan-glow" />
            Upcoming Events
          </h3>
          <div className="space-y-4 flex-1">
            {events.length === 0 ? (
              <p className="text-xs text-silvery-gray/40 italic">No events on your calendar.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="bg-abyssal/40 hover:bg-abyssal/60 border border-white/10 p-3 rounded-lg flex flex-col gap-1.5 transition-all"
                >
                  <h4 className="text-xs font-bold text-crisp-white truncate">{event.title}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-ice-blue font-mono">
                    <Clock className="w-3 h-3 text-silvery-gray/70" />
                    {formatTime(event.start)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-[10px] text-silvery-gray/75 truncate">
                      <MapPin className="w-3 h-3 text-silvery-gray/70" />
                      {event.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
