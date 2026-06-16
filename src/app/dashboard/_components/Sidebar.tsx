"use client";

import { useCielStore } from "@/store/useCielStore";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface SidebarProps {
  onShowShortcuts: () => void;
}

export function Sidebar({ onShowShortcuts }: SidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const activeTab = useCielStore((s) => s.activeTab);
  const setActiveTab = useCielStore((s) => s.setActiveTab);
  const logout = useCielStore((s) => s.logout);
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
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "inbox", label: "Inbox", icon: "📥" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "chat", label: "AI Chat", icon: "💬" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ] as const;

  const textWhiteClass = isDark ? "text-white" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const activeClass = isDark 
    ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
    : "bg-cyan-500/15 text-cyan-800 border-cyan-500/20";
  const inactiveClass = isDark 
    ? "text-gray-400 hover:text-white border-transparent hover:bg-white/5" 
    : "text-slate-500 hover:text-slate-900 border-transparent hover:bg-black/5";

  return (
    <aside className="w-64 flex flex-col p-4 transition-all duration-300 bg-white/5 dark:bg-black/10 backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl rounded-2xl">
// Brand Header
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white tracking-tighter shadow-sm shrink-0">
          C
        </div>
        <div className="min-w-0">
          <span className={`font-bold tracking-widest text-xs uppercase block ${textWhiteClass}`}>Ciel.</span>
          <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-mono uppercase tracking-wider font-bold block truncate">
            {session?.user?.email || "Workspace Console"}
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-slate-200/20 dark:border-white/5 space-y-2">
        <button
          onClick={onShowShortcuts}
          className={`w-full px-3 py-2.5 border border-slate-200/20 dark:border-white/5 rounded-xl text-[10px] uppercase font-bold cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 ${
            isDark ? "bg-white/5 text-slate-300 hover:text-white" : "bg-slate-900/5 text-slate-700 hover:text-black"
          }`}
        >
          <span>⌨️</span> Shortcuts
        </button>
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
