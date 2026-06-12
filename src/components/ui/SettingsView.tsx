"use client";

import { useState } from "react";
import { useCielStore } from "@/store/useCielStore";
import { signOut } from "next-auth/react";
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
  const gmailConnected = useCielStore((s) => s.gmailConnected);
  const calendarConnected = useCielStore((s) => s.calendarConnected);
  const fetchIntegrationStatus = useCielStore((s) => s.fetchIntegrationStatus);
  const updateUserName = useCielStore((s) => s.updateUserName);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");

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
              {isEditingName ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newName.trim()) return;
                    try {
                      const res = await fetch("/api/auth/profile/update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newName })
                      });
                      if (res.ok) {
                        updateUserName(newName);
                        setIsEditingName(false);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex gap-2 mt-1"
                >
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-void border border-white/10 text-xs text-crisp-white px-2 py-1.5 rounded-lg outline-none focus:border-cyan-glow/40"
                  />
                  <button type="submit" className="px-3 py-1 bg-cyan-glow text-void font-bold text-[10px] rounded-lg cursor-pointer">Save</button>
                  <button type="button" onClick={() => setIsEditingName(false)} className="px-3 py-1 bg-white/5 border border-white/10 text-crisp-white text-[10px] rounded-lg cursor-pointer">Cancel</button>
                </form>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-crisp-white">{user?.name || "Alexander"}</span>
                  <button onClick={() => { setNewName(user?.name || ""); setIsEditingName(true); }} className="text-[10px] font-bold text-cyan-glow hover:underline cursor-pointer">Edit</button>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider">Email Address</span>
              <span className="text-sm font-bold text-silvery-gray font-mono">{user?.email || "alexander@ciel.app"}</span>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider">Account Operations</span>
              <select
                defaultValue=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  
                  // Reset select value to default so user can trigger it again
                  e.target.value = "";

                  if (val === "change_name") {
                    setNewName(user?.name || "");
                    setIsEditingName(true);
                  } else if (val === "remove_gmail") {
                    if (confirm("Are you sure you want to disconnect Gmail?")) {
                      try {
                        const res = await fetch("/api/auth/corsair/disconnect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plugin: "gmail" })
                        });
                        if (res.ok) fetchIntegrationStatus();
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  } else if (val === "remove_calendar") {
                    if (confirm("Are you sure you want to disconnect Google Calendar?")) {
                      try {
                        const res = await fetch("/api/auth/corsair/disconnect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plugin: "googlecalendar" })
                        });
                        if (res.ok) fetchIntegrationStatus();
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  } else if (val === "delete_account") {
                    if (confirm("Are you absolutely sure you want to delete your account? This will permanently delete all your data and integration configurations. This action cannot be undone.")) {
                      try {
                        const res = await fetch("/api/auth/profile/delete", { method: "POST" });
                        if (res.ok) {
                          signOut();
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }
                }}
                className="w-full bg-abyssal border border-white/10 hover:border-white/20 text-xs text-crisp-white px-3 py-2 rounded-xl outline-none focus:border-cyan-glow/40 cursor-pointer font-semibold transition-all"
              >
                <option value="" disabled>Select profile option...</option>
                <option value="change_name">Change User Name</option>
                <option value="remove_gmail" disabled={!gmailConnected}>
                  {gmailConnected ? "Remove Gmail Integration" : "Remove Gmail Integration (Offline)"}
                </option>
                <option value="remove_calendar" disabled={!calendarConnected}>
                  {calendarConnected ? "Remove Calendar Integration" : "Remove Calendar Integration (Offline)"}
                </option>
                <option value="delete_account" className="text-crimson font-bold">
                  Delete Account
                </option>
              </select>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-silvery-gray/50 uppercase font-bold tracking-wider block">Status</span>
                  <span className="text-[11px] font-bold text-cyan-glow flex items-center gap-1.5 mt-0.5 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    Active Session
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-crisp-white hover:bg-white/10 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
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
            {/* Gmail sync */}
            <div className="flex items-center justify-between p-3 bg-abyssal/40 border border-white/10 rounded-xl">
              <div>
                <span className="text-xs font-bold text-crisp-white block">Gmail Connection</span>
                <span className="text-[10px] text-silvery-gray/50 block mt-0.5">Secure mail orchestration via Corsair</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border shadow-[0_0_8px_rgba(0,240,255,0.05)] ${
                  gmailConnected 
                    ? "bg-cyan-glow/10 border-cyan-glow/20 text-cyan-glow" 
                    : "bg-white/5 border-white/10 text-silvery-gray/40"
                }`}>
                  {gmailConnected ? "Connected" : "Inactive"}
                </span>
                <button
                  onClick={async () => {
                    if (gmailConnected) {
                      try {
                        const res = await fetch("/api/auth/corsair/disconnect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plugin: "gmail" })
                        });
                        if (res.ok) fetchIntegrationStatus();
                      } catch (e) {
                        console.error("Disconnect gmail error:", e);
                      }
                    } else {
                      try {
                        const res = await fetch("/api/auth/corsair/connect?plugin=gmail");
                        const data = await res.json();
                        if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                      } catch (e) {
                        console.error("Connect gmail error:", e);
                      }
                    }
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    gmailConnected 
                      ? "bg-crimson/10 border-crimson/25 text-crimson hover:bg-crimson/20" 
                      : "bg-cyan-glow/10 border-cyan-glow/20 text-cyan-glow hover:bg-cyan-glow/20"
                  }`}
                >
                  {gmailConnected ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>

            {/* Google Calendar sync */}
            <div className="flex items-center justify-between p-3 bg-abyssal/40 border border-white/10 rounded-xl">
              <div>
                <span className="text-xs font-bold text-crisp-white block">Google Calendar Connection</span>
                <span className="text-[10px] text-silvery-gray/50 block mt-0.5">Meeting and coordinates syncing</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border shadow-[0_0_8px_rgba(0,240,255,0.05)] ${
                  calendarConnected 
                    ? "bg-cyan-glow/10 border-cyan-glow/20 text-cyan-glow" 
                    : "bg-white/5 border-white/10 text-silvery-gray/40"
                }`}>
                  {calendarConnected ? "Connected" : "Inactive"}
                </span>
                <button
                  onClick={async () => {
                    if (calendarConnected) {
                      try {
                        const res = await fetch("/api/auth/corsair/disconnect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plugin: "googlecalendar" })
                        });
                        if (res.ok) fetchIntegrationStatus();
                      } catch (e) {
                        console.error("Disconnect calendar error:", e);
                      }
                    } else {
                      try {
                        const res = await fetch("/api/auth/corsair/connect?plugin=googlecalendar");
                        const data = await res.json();
                        if (data.authorizeUrl) window.location.href = data.authorizeUrl;
                      } catch (e) {
                        console.error("Connect calendar error:", e);
                      }
                    }
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    calendarConnected 
                      ? "bg-crimson/10 border-crimson/25 text-crimson hover:bg-crimson/20" 
                      : "bg-cyan-glow/10 border-cyan-glow/20 text-cyan-glow hover:bg-cyan-glow/20"
                  }`}
                >
                  {calendarConnected ? "Disconnect" : "Connect"}
                </button>
              </div>
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
