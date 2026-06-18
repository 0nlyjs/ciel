"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signUp } from "@/lib/auth-client";
import { Footer } from "@/components/Footer";
import {
  Filter,
  Zap,
  Search,
  Clock,
  RefreshCw,
  ExternalLink,
  X,
  Command,
  ArrowRight,
  Terminal,
  MousePointerClick,
  Shield,
  Cpu,
  Layers,
  Gauge,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const isAuthenticated = !isPending && !!session;

  return (
    <div className="relative min-h-screen bg-transparent text-slate-200 font-sans selection:bg-cyan-500 selection:text-black">


      {/* Foreground UI Layer */}
      <div
        className={`relative z-10 w-full min-h-screen flex flex-col justify-between transition-all duration-300 ${
          showAuthModal ? "lg:pr-[448px]" : ""
        }`}
      >
        {/* Top Navigation Bar */}
        <header
          className={`liquid-glass-island transition-all duration-300 !max-w-none ${
            showAuthModal
              ? "lg:!left-[calc(50%-224px)] lg:!w-[calc(100%-448px-2rem)]"
              : ""
          }`}
        >
          <div className="w-full px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/ciel.svg"
                alt="CIEL Logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="flex items-center gap-4">
              {isPending ? (
                <span className="text-[10px] text-cyan-600/70 animate-pulse font-mono font-bold uppercase">
                  Checking credentials...
                </span>
              ) : isAuthenticated ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/40 text-cyan-200 hover:text-white rounded-full text-[10px] uppercase transition-all duration-200 shadow-sm cursor-pointer"
                >
                  Dashboard
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsSignUp(false);
                      setAuthError("");
                      setAuthSuccess("");
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white rounded-full text-[10px] uppercase transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setIsSignUp(true);
                      setAuthError("");
                      setAuthSuccess("");
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/40 text-cyan-200 hover:text-white rounded-full text-[10px] uppercase transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Sections */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-28 pb-20 space-y-32">
          {/* Section 1: Hero (Cinematic Impact) */}
          <section className="flex flex-col items-center justify-center text-center min-h-[80vh] py-16 w-full">
            <div className="space-y-10 max-w-3xl">
              {/* Glowing Pill Badge */}
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-xl text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  v2.0 // The Agentic Workspace Lives
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-slate-50 tracking-tight leading-[0.95] uppercase">
                The Speed of Thought.
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,211,238,0.25)]">
                  The Power of Ciel.
                </span>
              </h1>

              {/* Sub-Headline */}
              <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Bypass the busywork. Ciel is the command-line interface for your
                entire digital life. Native calendar sync, localized email
                scraping, and real-time task execution—all moving at the speed
                of your keystrokes. Built for developers who refuse to wait.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push("/dashboard");
                    } else {
                      setIsSignUp(true);
                      setAuthError("");
                      setAuthSuccess("");
                      setShowAuthModal(true);
                    }
                  }}
                  className="px-10 py-4 rounded-full text-xs font-bold tracking-[0.2em] flex items-center justify-center gap-3 group transition-all duration-300 cursor-pointer drop-shadow-[0_0_25px_rgba(34,211,238,0.45)] border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 hover:from-cyan-400 hover:to-blue-400 hover:scale-[1.03]"
                >
                  {isAuthenticated ? "OPEN DASHBOARD" : "LAUNCH CIEL"}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Technical Specifications & Features (Asymmetric Bento Grid) */}
          <section className="py-16 w-full space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                <Cpu className="w-3.5 h-3.5" />
                SYSTEM ARCHITECTURE
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-50 tracking-tight uppercase">
                Engineered for Speed.
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                Ciel is built from the ground up for low latency, secure
                localization, and natural interface mechanics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
              {/* Card 1: Chat to Act (col-span-2) */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-cyan-400/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 md:col-span-2 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                    <Terminal className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Chat-to-Act Intent Engine
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Our advanced NLP middleware parses complex, unstructured
                    language into verified JSON schemas, triggering downstream
                    microservices in a single execution loop. From booking
                    flights to scheduling meetings, Ciel automates the
                    transaction with zero user context switching.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    Active Schema: intent_router_v2_stable
                  </span>
                </div>
              </div>

              {/* Card 2: Intelligent Triage (col-span-1) */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-blue-500/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 md:col-span-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <Filter className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-50 uppercase tracking-wider">
                    Intelligent Triage
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Localized semantic filtering analyzes incoming headers to
                    bubble high-priority items to your workspace.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-slate-400">
                    99.8% Sorting Accuracy
                  </span>
                </div>
              </div>

              {/* Card 3: Zero-Click Workflow (col-span-1) */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-amber-500/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 md:col-span-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <MousePointerClick className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-50 uppercase tracking-wider">
                    Zero-Click HUD
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ditch the mouse. Navigate, query, compose, and execute using
                    standard vim keys and hotkeys.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-slate-400">
                    Average Session: 0 clicks
                  </span>
                </div>
              </div>

              {/* Card 4: Zero-Latency Retrieval (col-span-2) */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-cyan-400/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 md:col-span-2 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                    <Search className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Zero-Latency Local Retrieval
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    By utilizing a localized database pipeline, all searches,
                    vector match queries, and indexing jobs execute directly
                    on-device. Your calendar state and historical communications
                    reside in a lightweight local Postgres partition, resolving
                    searches in {"<"}15ms.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400">
                    Response Time: &lt;15ms
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Disk Speed Execution
                  </span>
                </div>
              </div>

              {/* Card 5: Real-Time Sync Mesh (col-span-2) */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-blue-500/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 md:col-span-2 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin-slow" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Real-Time Sync Mesh
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    High-frequency background sync orchestrators communicate
                    with Gmail and Google Calendar. Incremental delta updates
                    stream in through persistent WebSocket connections, ensuring
                    your dashboard state is never stale, all without blocking UI
                    rendering threads.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-slate-400">
                    Sync Pipeline: Active
                  </span>
                </div>
              </div>

              {/* Card 6: Cryptographic Node Security (col-span-1) */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-amber-500/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 md:col-span-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Shield className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-50 uppercase tracking-wider">
                    Zero-Knowledge Node
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Authentication tokens, vector embeddings, and private
                    communication payloads are encrypted client-side.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono text-slate-400">
                    AES-256-GCM Hardware Encrypted
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: The Manifesto */}
          <section className="w-full max-w-5xl mx-auto py-32 flex flex-col items-center justify-center px-6">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-[#D28F17] tracking-widest uppercase animate-pulse">
                [ SYSTEM OVERRIDE: MONK MODE ENGAGED ]
              </div>
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white">
                KILL COGNITIVE NOISE.
              </h2>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed">
                Every context switch is a tax on your genius. Ciel runs silently
                in the background, routing alerts and scheduling events so you
                can remain locked in your IDE.
              </p>
            </div>

            {/* Monk Mode Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
              {/* Card 1: Cognitive Load Filter */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-[#D28F17]/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(210,143,23,0.15)] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D28F17]/10 border border-[#D28F17]/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(210,143,23,0.2)]">
                    <Filter className="w-6 h-6 text-[#D28F17]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Cognitive Load Filter
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Intercept and prioritize incoming traffic. Ciel's semantic
                    firewall automatically intercepts low-priority noise,
                    letting only high-criticality signals pierce through while
                    consolidating others into daily digests.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-400">
                    Noise Reduction: -87% / Active Triage
                  </span>
                </div>
              </div>

              {/* Card 2: Attention Lock & Batching */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-[#D28F17]/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(210,143,23,0.15)] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D28F17]/10 border border-[#D28F17]/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(210,143,23,0.2)]">
                    <Clock className="w-6 h-6 text-[#D28F17]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Attention Lock
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Establish deep focus windows. Block external app pings,
                    stack non-essential tasks in temporary execution buffers,
                    and sync back only when you choose to pause.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#D28F17]" />
                  <span className="text-[10px] font-mono text-slate-400">
                    State: Buffered / Interval: 90min
                  </span>
                </div>
              </div>

              {/* Card 3: Context Preserver */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-[#D28F17]/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(210,143,23,0.15)] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D28F17]/10 border border-[#D28F17]/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(210,143,23,0.2)]">
                    <Layers className="w-6 h-6 text-[#D28F17]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Context Preserver
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Never lose your train of thought. Ciel captures and mirrors
                    your current programming environment and notes, ensuring
                    instant resumption of complex tasks without starting from
                    scratch.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-slate-400">
                    Resume Latency: &lt;2s / Active Snapshot
                  </span>
                </div>
              </div>

              {/* Card 4: Autonomous Execution Layer */}
              <div className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 border-t-[#D28F17]/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(210,143,23,0.15)] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D28F17]/10 border border-[#D28F17]/20 flex items-center justify-center drop-shadow-[0_0_15px_rgba(210,143,23,0.2)]">
                    <Zap className="w-6 h-6 text-[#D28F17]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-wider">
                    Autonomous Dispatch
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Offload micro-operations. Allow Ciel to schedule callbacks,
                    draft responses, and auto-archive junk in real-time, letting
                    your subconscious focus solely on high-value execution.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-400">
                    Efficiency: 2.4x Multiplier / Active
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: The Workflow Grid */}
          <section className="w-full max-w-6xl mx-auto py-20 px-6">
            <h3 className="text-3xl font-bold text-center text-white mb-16">
              THE COMMAND-LINE FOR YOUR REALITY.
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#D28F17]/30 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.01] group">
                <span className="block text-xs font-mono text-[#D28F17] mb-6">
                  01 // PARSE
                </span>
                <h4 className="text-xl font-bold text-slate-100 mb-3">
                  Asynchronous Intent Processing
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Stream raw language prompts directly into our low-overhead
                  syntactic analyzer. Ciel translates ambiguous text into
                  functional schemas without interrupting active loops.
                </p>
              </div>
              <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#D28F17]/30 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.01] group">
                <span className="block text-xs font-mono text-[#D28F17] mb-6">
                  02 // ORCHESTRATE
                </span>
                <h4 className="text-xl font-bold text-slate-100 mb-3">
                  Autonomous Dispatchers
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Background synchronization fibers reconcile tasks across
                  multiple APIs concurrently. Updates propagate silently via
                  webhooks, preserving local execution speed.
                </p>
              </div>
              <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#D28F17]/30 shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.01] group">
                <span className="block text-xs font-mono text-[#D28F17] mb-6">
                  03 // SECURE
                </span>
                <h4 className="text-xl font-bold text-slate-100 mb-3">
                  Zero-Knowledge Boundary
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Encrypt sensitive communication blocks locally prior to
                  transport. Maintain absolute privacy controls over key
                  workflows and operational secrets.
                </p>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="py-16 border-t border-white/10 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-4xl font-black text-white tracking-normal uppercase">
                Transparent Pricing tiers.
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Start for free today. Upgrade as your agentic workspace grows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-4 relative z-10">
              {/* Free Plan */}
              <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-400 font-sans">
                      Developer Tier
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase">
                      Free Plan
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-50">
                      $0
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / month
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Perfect for individual developers getting started with local
                    agentic workflows.
                  </p>
                  <hr className="border-white/10" />
                  <ul className="space-y-3.5 text-xs text-slate-300">
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      <span>Gmail & Calendar integration</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      <span>Native AI Agent for task commands</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      <span>Voice command with AI Agent</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      <span>Local-first Postgres DB sync ({"<"}15ms)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      <span>1M monthly free token allowance</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push("/dashboard");
                    } else {
                      setIsSignUp(true);
                      setAuthError("");
                      setAuthSuccess("");
                      setShowAuthModal(true);
                    }
                  }}
                  className="w-full py-3.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-widest text-slate-100 hover:text-white shadow-sm transition-all duration-200 cursor-pointer"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                </button>
              </div>

              {/* Pro Plan */}
              <div className="p-8 rounded-2xl border border-amber-500/30 bg-white/5 backdrop-blur-xl space-y-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.3)] relative overflow-hidden">
                {/* Glowing Badge */}
                <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                  Enterprise Grade
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-amber-400 font-sans">
                      PRO POWER TIER
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase">
                      Pro Plan
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      $15
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / month
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    For power users and teams requiring infinite scale, custom
                    voice models, and smarter AI models.
                  </p>
                  <hr className="border-white/10" />
                  <ul className="space-y-3.5 text-xs text-slate-300">
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span className="font-semibold text-white">
                        Everything in Developer Tier, plus:
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span>Highest monthly token limit</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span>Access to smarter AI reasoning models</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span>Custom voice models & synthesis</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span>Priority Support SLA (24/7 dedicated)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span>Distributed node backup network</span>
                    </li>
                  </ul>
                </div>

                <button
                  disabled
                  className="w-full py-3.5 rounded-xl bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-widest text-slate-500 cursor-not-allowed shadow-none"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </section>
        </main>

        <Footer />

        {/* Backdrop overlay */}
        <div
          className={`fixed inset-0 z-40 bg-transparent transition-opacity duration-300 ${
            showAuthModal
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setShowAuthModal(false)}
        />

        {/* Auth Sidebar Panel Container */}
        <div
          className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-950/35 backdrop-blur-xl border-y-0 border-r-0 border-l border-white/10 shadow-[-8px_0_32px_rgba(0,0,0,0.25)] transition-opacity duration-300 ${
            showAuthModal
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Sliding content panel */}
          <div
            className={`w-full h-full p-8 flex flex-col justify-center relative overflow-hidden transition-all duration-300 ease-out ${
              showAuthModal
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0"
            }`}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-8">
              <img
                src="/ciel.svg"
                alt="CIEL Logo"
                className="h-24 w-auto object-contain"
              />
            </div>

            {isVerificationSent ? (
              <div className="space-y-4">
                <div className="border border-green-500/20 bg-green-950/35 p-4 rounded-xl text-xs text-green-400 leading-relaxed">
                  <span className="font-bold block uppercase mb-1">
                    VERIFICATION LINK DISPATCHED
                  </span>
                  A secure verification link has been sent to{" "}
                  <span className="underline font-bold text-white">
                    {authEmail}
                  </span>
                  . Please check your inbox and click the link to activate your
                  node.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsVerificationSent(false);
                    setIsSignUp(false);
                    setAuthSuccess("");
                    setAuthError("");
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white text-xs uppercase tracking-wider rounded-xl transition-all duration-200 shadow-sm"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {authError && (
                  <div className="border border-red-500/20 bg-red-950/35 p-3 rounded-lg text-[11px] text-red-400 whitespace-pre-wrap">
                    {authError}
                  </div>
                )}

                {authSuccess && (
                  <div className="border border-green-500/20 bg-green-950/35 p-3 rounded-lg text-[11px] text-green-400">
                    {authSuccess}
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError("");
                    setAuthSuccess("");
                    setAuthLoading(true);

                    if (isSignUp) {
                      if (
                        !authName.trim() ||
                        !authEmail.trim() ||
                        !authPassword
                      ) {
                        setAuthError("All credentials fields are required.");
                        setAuthLoading(false);
                        return;
                      }
                      await signUp.email(
                        {
                          email: authEmail.trim(),
                          password: authPassword,
                          name: authName.trim(),
                        },
                        {
                          onError: (ctx) => {
                            setAuthError(
                              ctx.error.message || "Registration failed.",
                            );
                            setAuthLoading(false);
                          },
                          onSuccess: () => {
                            setAuthLoading(false);
                            setShowAuthModal(false);
                            router.push("/dashboard");
                          },
                        },
                      );
                    } else {
                      if (!authEmail.trim() || !authPassword) {
                        setAuthError("Email and password are required.");
                        setAuthLoading(false);
                        return;
                      }
                      await signIn.email(
                        {
                          email: authEmail.trim(),
                          password: authPassword,
                          callbackURL: "/dashboard",
                        },
                        {
                          onError: (ctx) => {
                            if (ctx.error.status === 403) {
                              setAuthError(
                                "Node is unverified. Please verify your email before logging in.",
                              );
                            } else {
                              setAuthError(
                                ctx.error.message || "Authorization failed.",
                              );
                            }
                            setAuthLoading(false);
                          },
                          onSuccess: () => {
                            setAuthLoading(false);
                            setShowAuthModal(false);
                            router.push("/dashboard");
                          },
                        },
                      );
                    }
                  }}
                  className="space-y-4"
                >
                  {isSignUp && (
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">
                        name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-white/5 focus:bg-white/10 border border-white/10 focus:border-white/20 outline-none rounded-xl text-xs px-3 py-2.5 text-white transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">
                      email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. guest@ciel.app"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-white/5 focus:bg-white/10 border border-white/10 focus:border-white/20 outline-none rounded-xl text-xs px-3 py-2.5 text-white transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">
                      password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-white/5 focus:bg-white/10 border border-white/10 focus:border-white/20 outline-none rounded-xl text-xs px-3 py-2.5 text-white transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/40 text-cyan-200 hover:text-white rounded-xl text-xs uppercase tracking-widest transition-all duration-200 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-cyan-500/10 disabled:border-cyan-500/10 disabled:text-cyan-200/50"
                  >
                    {authLoading
                      ? "Authorizing..."
                      : isSignUp
                        ? "Create Node Account"
                        : "Access Console"}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-white/10" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                    OR
                  </span>
                  <div className="flex-1 h-[1px] bg-white/10" />
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    setAuthError("");
                    setAuthSuccess("");
                    setAuthLoading(true);
                    try {
                      await signIn.social({
                        provider: "google",
                        callbackURL: "/dashboard",
                      });
                    } catch (err) {
                      console.error("Google login error", err);
                      setAuthError("Google authentication failed.");
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-200 hover:text-white rounded-xl transition-all duration-200 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-white/5 disabled:border-white/10 disabled:text-slate-200/50"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign In with Google
                </button>

                <div className="text-center mt-4 pt-2">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors underline uppercase tracking-wider cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSignUp
                      ? "Already registered? Sign In"
                      : "Need an account? Register Node"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
