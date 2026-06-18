"use client";

import { useCielStore } from "@/store/useCielStore";
import { useSession } from "@/lib/auth-client";

export function OverviewTab() {
  const { data: session } = useSession();
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const emails = useCielStore((s) => s.emails);
  const calendarEvents = useCielStore((s) => s.calendarEvents);
  const isDark = true;

  const textWhiteClass = "text-white";
  const textMutedClass = "text-slate-400";
  const cardBgClass = "bg-black/25 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]";

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-xl font-bold tracking-tight ${textWhiteClass}`}>Welcome back, {session?.user?.name || "User"}</h1>
        <p className={`text-xs ${textMutedClass}`}>Here is a summary of your workspace connections and analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gmail Status */}
        <div className={`p-5 rounded-2xl ${cardBgClass} flex flex-col justify-between min-h-[140px]`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Gmail Integration</span>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${gmailConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            </div>
            <h3 className={`text-2xl font-bold font-mono ${textWhiteClass}`}>{gmailConnected ? `${emails.length} Cached` : "Disconnected"}</h3>
          </div>
          <p className={`text-[11px] ${textMutedClass}`}>
            {gmailConnected ? "Your inbox is actively syncing in the background via Server-Sent Events." : "Connect your Gmail account to start syncing and analysis."}
          </p>
        </div>

        {/* Calendar Status */}
        <div className={`p-5 rounded-2xl ${cardBgClass} flex flex-col justify-between min-h-[140px]`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Calendar Integration</span>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${calendarConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            </div>
            <h3 className={`text-2xl font-bold font-mono ${textWhiteClass}`}>{calendarConnected ? `${calendarEvents.length} Events` : "Disconnected"}</h3>
          </div>
          <p className={`text-[11px] ${textMutedClass}`}>
            {calendarConnected ? "Your schedule is fully synchronized with local cache." : "Connect Google Calendar to synchronize your daily schedule."}
          </p>
        </div>
      </div>

      {/* System Status Summary */}
      <div className={`p-5 rounded-2xl ${cardBgClass}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textWhiteClass}`}>Workspace Activity Stream</h3>
        <div className="space-y-3 font-mono text-[11px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className={textMutedClass}>Analytical Engine</span>
            <span className="text-green-500 font-bold uppercase">Online</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className={textMutedClass}>Background Syncing</span>
            <span className="text-green-500 font-bold uppercase">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={textMutedClass}>Database Cache State</span>
            <span className="text-cyan-400 font-bold uppercase">Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
