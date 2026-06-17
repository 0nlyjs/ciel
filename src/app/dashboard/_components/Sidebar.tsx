"use client";

import { useCielStore } from "@/store/useCielStore";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Edit2 } from "lucide-react";

interface SidebarProps {
  onShowShortcuts: () => void;
  onOpenProfile: () => void;
}

const CartoonAvatar = () => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/30 shadow-inner shrink-0">
    {/* Head/Face shape */}
    <circle cx="18" cy="16" r="8" fill="#FDBA74" />
    {/* Hair */}
    <path d="M10 16C10 11.5817 13.5817 8 18 8C22.4183 8 26 11.5817 26 16V17H10V16Z" fill="#1E293B" />
    {/* Eyes */}
    <circle cx="15.5" cy="16" r="1" fill="#0F172A" />
    <circle cx="20.5" cy="16" r="1" fill="#0F172A" />
    {/* Smile */}
    <path d="M16 19.5C16.5 20.2 19.5 20.2 20 19.5" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />
    {/* Body/Clothes */}
    <path d="M8 30C8 25.5817 11.5817 22 16 22H20C24.4183 22 28 25.5817 28 30V32H8V30Z" fill="#6366F1" />
  </svg>
);

export function Sidebar({ onShowShortcuts, onOpenProfile }: SidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const activeTab = useCielStore((s) => s.activeTab);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const logout = useCielStore((s) => s.logout);
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const isDark = true;

  const handleSignOutClick = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          logout();
          router.push("/");
        }
      }
    });
  };

  const navItems = [
    { id: "chat", label: "Chat" },
    { id: "inbox", label: "Inbox" },
    { id: "calendar", label: "Calendar" },
    { id: "settings", label: "Settings" },
  ] as const;

  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const activeClass = isDark 
    ? "bg-purple-950/40 text-purple-300 border-b border-white/10" 
    : "bg-cyan-950/20 text-cyan-800 border-b border-white/20";
  const inactiveClass = isDark 
    ? "bg-transparent text-gray-400 hover:text-white border-b border-white/10 hover:bg-white/5" 
    : "bg-transparent text-slate-500 hover:text-slate-900 border-b border-white/20 hover:bg-black/5";

  return (
    <aside className="w-64 flex flex-col p-4 transition-all duration-300 bg-white/5 dark:bg-black/10 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl rounded-2xl">
      {/* Brand Header */}
      <div className="px-3 py-4 mb-6">
        <span className={`font-black tracking-widest text-lg uppercase block ${textWhiteClass}`}>CIEL</span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 flex flex-col border-t border-white/10">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-start px-3 py-3 text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-slate-200/20 dark:border-white/5 space-y-2">
        {/* Connection status display */}
        <div className="px-3 py-2.5 bg-black/20 dark:bg-black/35 rounded-xl border border-white/5 flex flex-col gap-1.5 text-[9px] font-semibold tracking-wider font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">GMAIL:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${gmailConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className={gmailConnected ? "text-emerald-450" : "text-rose-400"}>
                {gmailConnected ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">CALENDAR:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${calendarConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className={calendarConnected ? "text-emerald-450" : "text-rose-400"}>
                {calendarConnected ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onShowShortcuts}
          className={`w-full px-3 py-2.5 border border-slate-200/20 dark:border-white/5 rounded-xl text-[10px] uppercase font-bold cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 ${
            isDark ? "bg-white/5 text-slate-300 hover:text-white" : "bg-slate-900/5 text-slate-700 hover:text-black"
          }`}
        >
          <span>⌨️</span> Shortcuts
        </button>
      </div>

      {/* User Profile Section Card */}
      <div 
        onClick={onOpenProfile}
        className="mt-4 pt-4 border-t border-slate-200/20 dark:border-white/5 flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-white/5 rounded-xl transition-all group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <CartoonAvatar />
          <div className="min-w-0">
            <span className={`font-bold text-xs block truncate ${textWhiteClass}`}>
              {session?.user?.name || "User"}
            </span>
            <span className={`text-[9px] block truncate ${textMutedClass}`}>
              {session?.user?.email || ""}
            </span>
          </div>
        </div>
        <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors opacity-60 group-hover:opacity-100 shrink-0" />
      </div>

      {/* Sign Out Button below Profile */}
      <div className="mt-2">
        <button
          onClick={handleSignOutClick}
          className={`w-full px-3 py-2.5 border border-slate-200/20 dark:border-white/5 rounded-xl text-[10px] uppercase font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            isDark ? "bg-white/5 text-slate-400 hover:text-red-400" : "bg-slate-900/5 text-slate-600 hover:text-red-600"
          }`}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
