"use client";

import { useState, useEffect } from "react";
import { useCielStore } from "@/store/useCielStore";
import { useTextToSpeech } from "@/lib/speech";
import { ChevronDown } from "lucide-react";

const ALL_SUGGESTIONS = [
  { title: "Bullet Summaries", text: "Always summarize emails or details into maximum 3 clean, actionable bullet points." },
  { title: "Workspace Priority", text: "Keep responses brief and technical. Prioritize flagging calendar scheduling conflicts immediately." },
  { title: "Direct Execution", text: "Skip conversational greetings or intros. Get straight to executing the workspace command or details." },
  { title: "French Translation", text: "Translate all client email summaries to French." },
  { title: "Highlight Questions", text: "Highlight any direct questions from clients at the top of the summary." },
  { title: "Bold Deadlines", text: "Underline or bold dates and times in all messages." },
  { title: "Morning Schedules", text: "If a schedule conflict arises, suggest alternative slots only between 9 AM and 11 AM." },
  { title: "Action Indicators", text: "Prefix all action items with an emoji representing the category (e.g. 📧 for email, 📅 for calendar)." },
  { title: "Priority Labels", text: "Categorize tasks as High, Medium, or Low priority automatically." },
  { title: "VIP Sender Alert", text: "If an email is from my manager, append [VIP] to the beginning of the subject line." },
  { title: "Standard Sign-off", text: "End every email draft with 'Best regards, Ciel Workspace Assistant'." },
  { title: "Simple Explanations", text: "Explain technical terms simply as if explaining to a non-technical person." }
];

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
  const aiTone = useCielStore((s) => s.aiTone);
  const aiDirective = useCielStore((s) => s.aiDirective);
  const ttsVoice = useCielStore((s) => s.ttsVoice);
  const ttsSpeed = useCielStore((s) => s.ttsSpeed);
  const localIntegrations = useCielStore((s) => s.localIntegrations);
  const updateSettings = useCielStore((s) => s.updateSettings);
  const bgRotate = useCielStore((s) => s.bgRotate);
  const bgColorCycle = useCielStore((s) => s.bgColorCycle);
  const bgHue = useCielStore((s) => s.bgHue);
  const updateBgSettings = useCielStore((s) => s.updateBgSettings);

  const { getAvailableVoices, previewVoice } = useTextToSpeech();
  const [voices, setVoices] = useState<Array<{ name: string; lang: string; gender: string }>>([]);
  const [newRuleText, setNewRuleText] = useState("");
  const [randomSuggestions, setRandomSuggestions] = useState<typeof ALL_SUGGESTIONS>([]);

  useEffect(() => {
    const activeRules = aiDirective ? aiDirective.split("\n").filter((r) => r.trim() !== "") : [];
    const available = ALL_SUGGESTIONS.filter(
      (s) => !activeRules.some((r) => r.trim().toLowerCase() === s.text.trim().toLowerCase())
    );
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    setRandomSuggestions(shuffled.slice(0, 2));
  }, [aiDirective]);

  useEffect(() => {
    setVoices(getAvailableVoices());
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const handleVoicesChanged = () => {
        setVoices(getAvailableVoices());
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      };
    }
  }, []);

  const handleAddRule = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const currentRules = aiDirective ? aiDirective.split("\n").filter((r) => r.trim() !== "") : [];
    if (!currentRules.includes(trimmed)) {
      const nextRules = [...currentRules, trimmed];
      updateSettings({ aiDirective: nextRules.join("\n") });
    }
  };

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

      {/* Row 1: Preferences & Synced Integrations */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Preferences Panel */}
        <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4 w-full md:w-1/2`}>
          <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Preferences</h3>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-bold block">Sync Interval</label>
            <div className="relative">
              <select
                value={syncInterval}
                onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value, 10) })}
                className={`w-full text-xs pl-3 pr-8 py-2 border ${border900Class} rounded-xl outline-none transition-all duration-300 ${inputBgClass} appearance-none cursor-pointer`}
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes (Default)</option>
                <option value={30}>Every 30 minutes</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
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

        {/* Synced Integrations Panel */}
        <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4 w-full md:w-1/2`}>
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

      {/* Row 2: AI Behavior & TTS Preferences */}
      <div className="flex flex-col md:flex-row gap-6 items-start mt-6">
        {/* AI Agent Behavior & Tone Controls Panel */}
        <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4 w-full md:w-1/2`}>
          <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>AI Agent Behavior & Tone</h3>
          
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase font-bold block">Response Tone</label>
            <div className="relative">
              <select
                value={aiTone}
                onChange={(e) => updateSettings({ aiTone: e.target.value })}
                className={`w-full text-xs pl-3 pr-8 py-2 border ${border900Class} rounded-xl outline-none transition-all duration-300 ${inputBgClass} appearance-none cursor-pointer`}
              >
                <option value="professional">Professional (Accurate & Formal)</option>
                <option value="friendly">Friendly (Warm & Helpful)</option>
                <option value="concise">Concise (Brief & Direct)</option>
                <option value="academic">Detailed (In-depth Analysis)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-slate-500 uppercase font-bold block">Custom Prompt Directive Rules</label>
            
            {/* List of current active rules */}
            {(() => {
              const rules = aiDirective ? aiDirective.split("\n").filter((r) => r.trim() !== "") : [];
              return (
                <>
                  {/* Add New Rule Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddRule(newRuleText);
                      setNewRuleText("");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      placeholder="Add a new assistant rule..."
                      className={`flex-1 text-xs px-3 py-2 border ${border900Class} rounded-xl outline-none transition-all duration-300 ${inputBgClass}`}
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-purple-650 hover:bg-purple-500 text-white border border-purple-500/30 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  {/* List of current active rules */}
                  {rules.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {rules.map((rule, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 p-2.5 bg-black/15 border border-white/5 rounded-xl text-[11px] text-slate-300">
                          <span className="leading-relaxed flex-1">{rule}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextRules = rules.filter((_, i) => i !== idx);
                              updateSettings({ aiDirective: nextRules.join("\n") });
                            }}
                            className="text-red-400 hover:text-red-350 hover:bg-white/5 rounded px-1.5 py-0.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
                            title="Remove rule"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No custom rules defined yet. Use the reference templates below or add custom rules.</p>
                  )}

                  {/* Quick Reference Templates */}
                  {randomSuggestions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <span className="text-[8.5px] text-slate-500 uppercase font-bold block">Quick Reference Templates (Click to Add):</span>
                      <div className="flex flex-col gap-1.5">
                        {randomSuggestions.map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddRule(tpl.text)}
                            className="text-[9px] text-left text-slate-400 hover:text-purple-300 transition-all duration-300 cursor-pointer bg-black/20 hover:bg-black/45 p-2 rounded-xl border border-white/5 active:scale-[0.98]"
                          >
                            <span className="block text-purple-400 text-[8px] font-bold uppercase tracking-wider mb-0.5">{tpl.title}</span>
                            {tpl.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Right side container stacking TTS and Theme preferences */}
        <div className="w-full md:w-1/2 space-y-6">
          {/* Text-to-Speech (TTS) Preferences Panel */}
          <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4`}>
            <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Text-to-Speech (TTS) Preferences</h3>
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold block">Default TTS Voice</label>
              <div className="relative">
                <select
                  value={ttsVoice}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateSettings({ ttsVoice: val });
                    previewVoice(val);
                  }}
                  className={`w-full text-xs pl-3 pr-8 py-2 border ${border900Class} rounded-xl outline-none transition-all duration-300 ${inputBgClass} appearance-none cursor-pointer`}
                >
                  <option value="Google UK English Female">Google UK English Female (Female)</option>
                  <option value="Google UK English Male">Google UK English Male (Male)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold block">Voice Speed</label>
              <div className="flex rounded-xl border border-white/10 overflow-hidden bg-black/20 p-0.5">
                {[
                  { label: "Slow", value: "0.8" },
                  { label: "Normal", value: "1.0" },
                  { label: "Speed", value: "1.2" },
                ].map((opt) => {
                  const isActive = ttsSpeed === opt.value || (opt.value === "1.0" && (ttsSpeed === "1" || !ttsSpeed));
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateSettings({ ttsSpeed: opt.value })}
                      className={`flex-1 text-[10px] py-1.5 font-bold uppercase transition-all duration-300 rounded-lg cursor-pointer ${
                        isActive
                          ? "bg-purple-500/20 text-purple-300 shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Theme & 3D Background Preferences Panel */}
          <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} space-y-4`}>
            <h3 className={`text-xs font-bold ${textWhiteClass} uppercase tracking-normal leading-tight`}>Theme & 3D Background Preferences</h3>
            
            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Camera Rotation</label>
                <span className="text-[9px] text-slate-500">Enable or pause the 360° rotation animation</span>
              </div>
              <button
                onClick={() => updateBgSettings({ bgRotate: !bgRotate })}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl uppercase cursor-pointer transition-colors ${
                  bgRotate 
                    ? "bg-purple-650/20 text-purple-300 border border-purple-500/20" 
                    : "bg-red-500/10 text-red-300 border border-red-500/20"
                }`}
              >
                {bgRotate ? "Rotating" : "Paused"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Pastel Color Cycling</label>
                <span className="text-[9px] text-slate-500">Enable cycling pastel gradient lights</span>
              </div>
              <button
                onClick={() => updateBgSettings({ bgColorCycle: !bgColorCycle })}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl uppercase cursor-pointer transition-colors ${
                  bgColorCycle 
                    ? "bg-purple-650/20 text-purple-300 border border-purple-500/20" 
                    : "bg-red-500/10 text-red-300 border border-red-500/20"
                }`}
              >
                {bgColorCycle ? "Cycling" : "Stopped"}
              </button>
            </div>

            {!bgColorCycle && (
              <div className="space-y-1.5 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-500 uppercase font-bold">Pick Fixed Color (Hue)</label>
                  <span className="text-[9px] text-slate-400 font-mono">{(bgHue * 360).toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={bgHue}
                  onChange={(e) => updateBgSettings({ bgHue: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-[8px] text-slate-500 block">HSL Hue slider mapped on fixed 0.3 Saturation & 0.3 Lightness spectrum</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
