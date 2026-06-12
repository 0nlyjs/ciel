"use client";

import { useCielStore } from "@/store/useCielStore";
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Bot,
  Settings,
  Plus
} from "lucide-react";
import Image from "next/image";

export default function Sidebar() {
  const activeTab = useCielStore((s) => s.activeTab);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const emails = useCielStore((s) => s.emails);

  const unreadCount = emails.filter((e) => !e.read).length;

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, badge: undefined },
    { id: "inbox", label: "Inbox", icon: Inbox, badge: unreadCount },
    { id: "calendar", label: "Calendar", icon: Calendar, badge: undefined },
    { id: "chat", label: "AI Assistant", icon: Bot, badge: undefined },
    { id: "settings", label: "Settings", icon: Settings, badge: undefined },
  ] as const;

  return (
    <aside className="w-60 cyber-glass flex flex-col justify-between h-full p-5 select-none shrink-0 font-sans border-r border-white/10">
      
      {/* Top Brand Section */}
      <div className="flex flex-col w-full">
        {/* Assistant Header Avatar */}
        <div className="flex items-center gap-3.5 pb-6 border-b border-white/10">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-void flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <Image
              src="/ciel_avatar.png"
              alt="Ciel Avatar"
              fill
              className="object-cover"
              sizes="40px"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-crisp-white tracking-wide leading-tight">
              Ciel
            </span>
            <span className="text-[10px] font-semibold text-ice-blue tracking-wider uppercase mt-0.5">
              AI Assistant
            </span>
          </div>
        </div>

        {/* New Command Action Button */}
        <button
          onClick={() => {
            setActiveTab("chat");
            // Trigger voice or chat compose focuses
            setTimeout(() => {
              const chatInput = document.querySelector('input[placeholder*="Ask Ciel"]') as HTMLInputElement;
              chatInput?.focus();
            }, 100);
          }}
          className="w-full h-11 bg-gradient-to-r from-cyan-glow to-cyber-magenta hover:opacity-90 active:scale-[0.98] text-void text-xs font-bold rounded-xl flex items-center justify-center gap-2 mt-6 cursor-pointer border border-cyan-glow/20 shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all"
        >
          <Plus className="w-4 h-4 text-void stroke-[3]" />
          New Command
        </button>

        {/* Nav Navigation Menu */}
        <nav className="w-full mt-8 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full h-11 px-3.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer border ${
                  isActive
                    ? "bg-abyssal/60 border-cyan-glow/20 text-cyan-glow font-bold shadow-[0_0_15px_rgba(0,240,255,0.08)]"
                    : "text-silvery-gray hover:text-crisp-white hover:bg-white/5 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "text-cyan-glow" : "text-silvery-gray"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? "bg-cyan-glow/20 text-cyan-glow" : "bg-white/5 text-silvery-gray border border-white/10"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Health Section */}
      <div className="w-full">
        <div className="p-4 bg-abyssal/40 border border-white/10 rounded-2xl flex items-center gap-3.5 w-full shadow-lg">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-glow opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-glow"></span>
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-silvery-gray uppercase tracking-widest leading-none">
              Workspace Health
            </span>
            <span className="text-[9px] font-medium text-cyan-glow/85 mt-1 truncate">
              All Systems Clear
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
}
