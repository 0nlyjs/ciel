"use client";

import { useCielStore } from "@/store/useCielStore";

export function SettingsTab() {
  const user = useCielStore((s) => s.user);
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const emails = useCielStore((s) => s.emails);
  const calendarEvents = useCielStore((s) => s.calendarEvents);
  const chatMessages = useCielStore((s) => s.chatMessages);
  const searchQuery = useCielStore((s) => s.searchQuery);
  const syncInterval = useCielStore((s) => s.syncInterval);
  const aiAutoPriority = useCielStore((s) => s.aiAutoPriority);
  const localIntegrations = useCielStore((s) => s.localIntegrations);
  const updateSettings = useCielStore((s) => s.updateSettings);

  const isDark = true;

  const textWhiteClass = "text-white";
  const textMutedClass = "text-slate-400";
  const borderClass = "border-white/5";
  const border900Class = "border-white/10";
  const cardBgClass = "bg-transparent backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]";
  const innerCardBgClass = isDark ? "bg-black/15" : "bg-white/20";
  const buttonBgClass = isDark 
    ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" 
    : "bg-white/40 hover:bg-white/60 text-slate-800 border border-white/50";
  const inputBgClass = isDark 
    ? "bg-black/20 focus:bg-black/35 border-white/10 focus:border-purple-500/50 text-white" 
    : "bg-white/35 focus:bg-white/55 border-white/40 focus:border-cyan-500/50 text-slate-900";

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-xl font-bold tracking-tight ${textWhiteClass}`}>System Preferences</h1>
        <p className={`text-xs ${textMutedClass}`}>Configure your AI settings and workspace integration sync preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preferences Panel */}
        <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4`}>
          <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Preferences</h3>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-bold block">Sync Interval</label>
            <select
              value={syncInterval}
              onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value, 10) })}
              className={`w-full text-xs px-3 py-2 border ${border900Class} rounded-xl outline-none transition-all duration-300 ${inputBgClass}`}
            >
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour (Default)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold block">AI Auto-Priority</label>
              <span className="text-[9px] text-slate-500">Classify incoming emails using AI model</span>
            </div>
            <button
              onClick={() => updateSettings({ aiAutoPriority: !aiAutoPriority })}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl uppercase cursor-pointer transition-colors ${
                aiAutoPriority 
                  ? "bg-green-600/20 text-green-700 dark:text-green-300 border border-green-500/20" 
                  : "bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20"
              }`}
            >
              {aiAutoPriority ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {/* Sync Integrations Panel */}
        <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4`}>
          <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Synced Integrations (Neon DB Cache)</h3>
          <p className="text-[10px] text-slate-500">Local records of connection status synced from Corsair:</p>
          
          {localIntegrations.length === 0 ? (
            <p className={`text-xs ${textMutedClass} italic`}>No integration sync records found in database. Check connections in respective tabs.</p>
          ) : (
            <div className="space-y-2">
              {localIntegrations.map((integration) => (
                <div key={integration.id} className={`p-2.5 border rounded-xl text-xs flex justify-between items-center ${innerCardBgClass} ${borderClass}`}>
                  <div>
                    <span className={`font-bold ${textWhiteClass} uppercase`}>{integration.provider === "googlecalendar" ? "google calendar" : integration.provider}</span>
                    <span className="text-slate-500 ml-2">({integration.connected_email})</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase ${
                    integration.status === "connected" 
                      ? "bg-green-500/10 text-green-700 dark:text-green-350" 
                      : "bg-red-500/10 text-red-700 dark:text-red-350"
                  }`}>
                    {integration.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zustand State Dump */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4`}>
        <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-wider`}>Live Zustand Store State</h3>
        <pre className={`p-4 border ${border900Class} ${innerCardBgClass} rounded-2xl text-[10px] text-green-600 dark:text-green-400 overflow-x-auto whitespace-pre-wrap font-mono`}>
          {JSON.stringify({
            user,
            gmailConnected,
            calendarConnected,
            emailsCount: emails.length,
            calendarEventsCount: calendarEvents.length,
            chatMessagesCount: chatMessages.length,
            searchQuery,
            settings: { syncInterval, aiAutoPriority },
            localIntegrations,
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
