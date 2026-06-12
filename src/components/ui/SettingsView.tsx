"use client";

import { useState } from "react";
import { useCielStore } from "@/store/useCielStore";
import {
  Settings,
  User,
  Cpu,
  Volume2,
  Lock,
  Globe,
  Check,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export default function SettingsView() {
  const user = useCielStore((s) => s.user);
  const logout = useCielStore((s) => s.logout);

  // Settings mock state
  const [render3D, setRender3D] = useState(true);
  const [vocalize, setVocalize] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-void overflow-y-auto font-sans p-8 lg:p-12 select-none">
      
      {/* Header */}
      <header className="border-b border-white/10 pb-6 mb-8 shrink-0">
        <h1 className="text-sm font-semibold tracking-wider uppercase text-crisp-white flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-cyan-glow" />
          Settings Panel
        </h1>
        <p className="text-silvery-gray/60 text-xs mt-1.5">
          Configure synchronization settings, visual preferences, and connected integrations.
        </p>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        
        {/* Profile Card */}
        <section className="cyber-glass rounded-2xl p-6 flex flex-col shadow-xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-crisp-white border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-glow" />
            User Credentials
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider">Full Name</span>
              <span className="text-sm font-bold text-crisp-white">{user?.name || "Alexander"}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider">Email Address</span>
              <span className="text-sm font-bold text-silvery-gray font-mono">{user?.email || "alexander@ciel.app"}</span>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider block">Status</span>
                <span className="text-[11px] font-bold text-cyan-glow flex items-center gap-1.5 mt-0.5 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  Active Session
                </span>
              </div>
              
              <button
                onClick={logout}
                className="px-4 py-2 bg-crimson/15 border border-crimson/30 text-crimson hover:bg-crimson/25 hover:text-crisp-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-[0_0_10px_rgba(255,42,85,0.1)]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Integration Card */}
        <section className="cyber-glass rounded-2xl p-6 flex flex-col shadow-xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-crisp-white border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-glow" />
            Connected Integrations
          </h2>

          <div className="space-y-4">
            {/* Google workspace sync */}
            <div className="flex items-center justify-between p-3 bg-abyssal/40 border border-white/10 rounded-xl">
              <div>
                <span className="text-xs font-bold text-crisp-white block">Google Workspace</span>
                <span className="text-[10px] text-silvery-gray/50 block mt-0.5">Syncing Gmail & Google Calendar</span>
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow rounded-full shadow-[0_0_8px_rgba(0,240,255,0.1)]">
                Connected
              </span>
            </div>

            {/* Corsair dev integration */}
            <div className="flex items-center justify-between p-3 bg-abyssal/40 border border-white/10 rounded-xl">
              <div>
                <span className="text-xs font-bold text-crisp-white block">Corsair Integration Layer</span>
                <span className="text-[10px] text-silvery-gray/50 block mt-0.5">API Webhooks & MCP Server active</span>
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow rounded-full shadow-[0_0_8px_rgba(0,240,255,0.1)]">
                Synchronized
              </span>
            </div>
          </div>
        </section>

        {/* Visual preferences card */}
        <section className="cyber-glass rounded-2xl p-6 flex flex-col shadow-xl col-span-1 md:col-span-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-crisp-white border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-glow" />
            Preferences & Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rendering 3D canvas toggle */}
            <div className="flex items-center justify-between p-4 bg-abyssal/30 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3">
                <Cpu className="w-5 h-5 text-silvery-gray/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-crisp-white block">3D Visualizer</span>
                  <span className="text-[10px] text-silvery-gray/50 block mt-0.5">Toggle R3F WebGL assistant orb</span>
                </div>
              </div>
              <button
                onClick={() => setRender3D(!render3D)}
                className="text-silvery-gray hover:text-crisp-white transition-colors cursor-pointer"
              >
                {render3D ? (
                  <ToggleRight className="w-8 h-8 text-cyan-glow drop-shadow-[0_0_8px_#00F0FF]" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-silvery-gray/30" />
                )}
              </button>
            </div>

            {/* Vocalization feedback toggle */}
            <div className="flex items-center justify-between p-4 bg-abyssal/30 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3">
                <Volume2 className="w-5 h-5 text-silvery-gray/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-crisp-white block">Audio Responses</span>
                  <span className="text-[10px] text-silvery-gray/50 block mt-0.5">Read assistant replies aloud</span>
                </div>
              </div>
              <button
                onClick={() => setVocalize(!vocalize)}
                className="text-silvery-gray hover:text-crisp-white transition-colors cursor-pointer"
              >
                {vocalize ? (
                  <ToggleRight className="w-8 h-8 text-cyan-glow drop-shadow-[0_0_8px_#00F0FF]" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-silvery-gray/30" />
                )}
              </button>
            </div>

            {/* Telemetry settings */}
            <div className="flex items-center justify-between p-4 bg-abyssal/30 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-silvery-gray/60 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-crisp-white block">Telemetry Analytics</span>
                  <span className="text-[10px] text-silvery-gray/50 block mt-0.5">Send diagnostics to improve server</span>
                </div>
              </div>
              <button
                onClick={() => setAnalytics(!analytics)}
                className="text-silvery-gray hover:text-crisp-white transition-colors cursor-pointer"
              >
                {analytics ? (
                  <ToggleRight className="w-8 h-8 text-cyan-glow drop-shadow-[0_0_8px_#00F0FF]" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-silvery-gray/30" />
                )}
              </button>
            </div>

          </div>
        </section>

      </main>

    </div>
  );
}
