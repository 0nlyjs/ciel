"use client";

import { useCielStore } from "@/store/useCielStore";
import { Inbox, Calendar, MessageSquare, Send, Trash, LogOut, Terminal } from "lucide-react";
import CielCanvas from "../3d/CielCanvas";

export default function Sidebar() {
  const activeTab = useCielStore((s) => s.activeTab);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const user = useCielStore((s) => s.user);
  const logout = useCielStore((s) => s.logout);
  const emails = useCielStore((s) => s.emails);
  const cielStatus = useCielStore((s) => s.cielStatus);

  const unreadCount = emails.filter((e) => !e.read).length;

  const navItems = [
    { id: "inbox", label: "Inbox", icon: Inbox, badge: unreadCount },
    { id: "calendar", label: "Calendar", icon: Calendar, badge: undefined },
    { id: "chat", label: "Ciel Chat", icon: MessageSquare, badge: undefined },
    { id: "sent", label: "Sent", icon: Send, badge: undefined },
    { id: "trash", label: "Trash", icon: Trash, badge: undefined },
  ] as const;

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between h-full select-none">
      
      {/* top brand and 3d core */}
      <div className="flex flex-col items-center pt-8 px-4 w-full">
        {/* app name */}
        <div className="flex items-center gap-2 mb-6">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span className="text-lg font-bold font-mono tracking-widest text-white">
            CIEL
          </span>
        </div>

        {/* 3d visualizer */}
        <div className="relative w-40 h-40 rounded-full border border-zinc-800/80 bg-zinc-950/40 overflow-hidden shadow-[0_0_20px_-8px_rgba(0,240,255,0.15)] mb-8 flex items-center justify-center group">
          <div className="absolute inset-0 z-0">
            <CielCanvas scene="dashboard" />
          </div>
          
          {/* status label */}
          <div className="absolute bottom-2 inset-x-0 text-center z-10 pointer-events-none">
            <span className="text-[10px] font-mono tracking-wider font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400">
              {cielStatus === "listening" && "Listening..."}
              {cielStatus === "thinking" && "Thinking..."}
              {cielStatus === "speaking" && "Speaking..."}
              {cielStatus === "error" && "Error"}
              {cielStatus === "idle" && "Sync Active"}
            </span>
          </div>
        </div>

        {/* nav menu */}
        <nav className="w-full space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 border border-zinc-800/80 text-white font-medium shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* user details & logout */}
      <div className="p-4 border-t border-zinc-900 w-full flex items-center justify-between">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-xs font-bold text-white truncate font-sans">
            {user?.name || "User"}
          </span>
          <span className="text-[10px] text-zinc-500 truncate font-mono">
            {user?.email || "user@ciel.app"}
          </span>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          className="w-8 h-8 rounded-md bg-zinc-900 hover:bg-red-500/10 hover:text-red-400 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

    </aside>
  );
}
