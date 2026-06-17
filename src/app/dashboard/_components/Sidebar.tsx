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

const CielLogoInline = ({ height = "88px" }: { height?: string }) => (
  <svg 
    style={{ height, width: "auto", display: "block" }} 
    viewBox="0 0 340 150" 
    version="1.1" 
    xmlns="http://www.w3.org/2000/svg" 
    xmlnsXlink="http://www.w3.org/1999/xlink" 
    xmlSpace="preserve"
    className="object-contain"
  >
    <style dangerouslySetInnerHTML={{__html: `
        .yellow-glow {
            filter: url(#glow-circle-3x);
        }
        .glowing-layer {
            filter: url(#glow-blur);
            opacity: 0.45;
        }
    `}} />

    {/* Glow Backdrop Layer (Static Middle-Ground Glow - Recentered with margins) */}
    <g className="glowing-layer">
        {/* Glowing duplicate of border with thicker stroke for soft edges */}
        <rect x="38" y="27" width="264" height="97" rx="22" ry="22" style={{ fill: "none", stroke: "url(#_Linear1)", strokeWidth: "12px" }} />
        {/* Glowing duplicate of letters with thicker stroke */}
        <g transform="matrix(0.88785,0,0,0.88785,3.971963,8.635514)">
            <path d="M120,45L80,45L80,105L120,105M150.137,45L150.137,105M180,45L180,105L220,105M180,75L210,75M180,45L220,45M250,45L250,105L290,105" style={{ fill: "none", stroke: "url(#_Linear1)", strokeWidth: "12px" }} />
        </g>
    </g>

    {/* Sharp Foreground Layers (Recentered for safety spacing) */}
    <g id="text" transform="matrix(0.88785,0,0,0.88785,3.971963,8.635514)">
        <path d="M120,45L80,45L80,105L120,105M150.137,45L150.137,105M180,45L180,105L220,105M180,75L210,75M180,45L220,45M250,45L250,105L290,105" fill="none" fillRule="nonzero" stroke="url(#_Linear1)" strokeWidth={8} />
    </g>
    <g id="circle" transform="matrix(0.88785,0,0,0.88785,3.971963,8.635514)">
        <circle className="yellow-glow" cx={290} cy={105} r={4} style={{ fill: "rgb(237,255,0)" }} />
    </g>
    <g id="boarder">
        <rect x="38" y="27" width="264" height="97" rx="22" ry="22" fill="none" stroke="url(#_Linear1)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={5} />
    </g>

    <defs>
        {/* Horizontal gradient rotated 30 degrees down (#3BB5CD to #E08C08) */}
        <linearGradient id="_Linear1" x1={114} y1={11} x2={296} y2={116} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3BB5CD" stopOpacity={1} />
            <stop offset="1" stopColor="#E08C08" stopOpacity={1} />
        </linearGradient>
        {/* Expanded Glow Blur Filter region to prevent edge cutoffs --> */}
        <filter id="glow-blur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={8} />
        </filter>
        {/* Intense 3x Yellow Glow Filter */}
        <filter id="glow-circle-3x" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation={6} result="blur1" />
            <feGaussianBlur stdDeviation={2.5} result="blur2" />
            {/* Color matrix with high alpha multiplier (3x) to intensify yellow glow */}
            <feColorMatrix type="matrix" values="
                1.0 0.0 0.0 0.0 0.9
                0.0 1.0 0.0 0.0 1.0
                0.0 0.0 1.0 0.0 0.0
                0.0 0.0 0.0 3.0 0.0" in="blur1" result="colored-blur1" />
            <feMerge>
                <feMergeNode in="colored-blur1" />
                <feMergeNode in="colored-blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
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
      <div className="w-full py-5 mb-4 flex items-center justify-center">
        <CielLogoInline height="88px" />
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
