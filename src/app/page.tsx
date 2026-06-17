"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signUp } from "@/lib/auth-client";
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
  MousePointerClick
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
      {/* Ambient Animated Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none overflow-hidden"
        style={{
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E"),
            url("/cielbg.jpg")
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      {/* Foreground UI Layer */}
      <div className={`relative z-10 min-h-screen flex flex-col justify-between transition-all duration-300 ${
        showAuthModal ? "lg:pr-[448px]" : ""
      }`}>
      
      {/* Top Navigation Bar */}
      {/* Top Navigation Bar */}
      <header className={`liquid-glass-island transition-all duration-300 !max-w-none ${
        showAuthModal ? "lg:!left-[calc(50%-224px)] lg:!w-[calc(100%-448px-2rem)]" : ""
      }`}>
        <div className="w-full px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-200 tracking-tighter shadow-sm">
              C
            </div>
            <span className="text-white font-bold tracking-widest text-sm uppercase">Ceil.</span>
          </div>

          <div className="flex items-center gap-4">
            {isPending ? (
              <span className="text-[10px] text-cyan-600/70 animate-pulse font-mono font-bold uppercase">Checking credentials...</span>
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-32 pb-16 space-y-24">
        
        {/* Section 1: Hero (The Awakening) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center min-h-[75vh] py-12 w-full text-left">
          <div className="space-y-8 max-w-xl">
            {/* Decorative Tag */}
            <div className="text-[11px] uppercase font-bold tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Next-Gen Agentic Workspace</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-normal leading-tight uppercase">
              Think Fast.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Work Faster.
              </span>
            </h1>

            {/* Sub-Headline */}
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Your time is valuable. Ceil clears the noise and handles the busywork, so you can stay in the zone and get things done.
            </p>

            {/* Action Button */}
            <div className="pt-4">
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
                className="px-8 py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/40 text-cyan-200 hover:text-white rounded-full text-xs tracking-widest flex items-center gap-2 group transition-all duration-200 shadow-sm cursor-pointer"
              >
                {isAuthenticated ? "Go to Dashboard" : "Launch Ceil"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Placeholder column for future image */}
          <div className="hidden md:block w-full h-[360px] border border-dashed border-white/10 rounded-2xl bg-white/5 relative overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500/50 uppercase tracking-widest font-mono">Placeholder Image Area</div>
          </div>
        </section>

        {/* Section 2: The Agent (Corsair MCP Focus) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12 w-full text-left">
          {/* Placeholder column for future image (renders first on desktop, bottom on mobile) */}
          <div className="hidden md:block w-full h-[360px] border border-dashed border-white/10 rounded-2xl bg-white/5 relative overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] order-last md:order-first">
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500/50 uppercase tracking-widest font-mono">Placeholder Image Area</div>
          </div>

          <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest relative z-10">
              <Command className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Corsair MCP Layer</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-normal leading-tight uppercase relative z-10">
              Just Tell Ceil What to Do.
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed relative z-10">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white text-[10px] font-mono">Cmd + K</kbd> and just type. Need to set up a meeting for Thursday? Want to clear out your junk mail? Just ask. Ceil understands plain English and handles the complex steps for you. It is like having a real assistant built right into your screen.
            </p>

            {/* Vertical Stack Mini-Cards */}
            <div className="space-y-3 pt-2 relative z-10">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left space-y-1">
                <Terminal className="w-4 h-4 text-cyan-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chat to Act</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">Just type what you want.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left space-y-1">
                <Filter className="w-4 h-4 text-purple-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Smart Sorting</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">AI finds your most important emails.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left space-y-1">
                <MousePointerClick className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Keyboard Only</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">Never click through menus again.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: The Engine (Speed & Postgres Focus) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12 w-full text-left">
          <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest relative z-10">
              <Zap className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">Database Speed Engine</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-normal leading-tight uppercase relative z-10">
              Find Anything Instantly.
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed relative z-10">
              Waiting for pages to load is frustrating. Ceil solves this by saving your data locally. This means you can search your entire email history and find any calendar event in less than one second. No loading bars. It is just always ready.
            </p>

            {/* Vertical Stack Mini-Cards */}
            <div className="space-y-3 pt-2 relative z-10">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left space-y-1">
                <Search className="w-4 h-4 text-cyan-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instant Search</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">Find emails in under a second.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left space-y-1">
                <Clock className="w-4 h-4 text-purple-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Waiting</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">No loading screens or spinners.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left space-y-1">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Always Live</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">Syncs your calendar in real-time.</p>
              </div>
            </div>
          </div>

          {/* Placeholder column for future image */}
          <div className="hidden md:block w-full h-[360px] border border-dashed border-white/10 rounded-2xl bg-white/5 relative overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500/50 uppercase tracking-widest font-mono">Placeholder Image Area</div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-12 border-t border-white/10 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-normal uppercase">
              Simple, Transparent Pricing.
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Start for free today. Upgrade as your agentic workspace grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto pt-4 relative z-10">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md space-y-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 font-sans">Developer Tier</span>
                  <h3 className="text-xl font-bold text-white uppercase">Free Plan</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Perfect for individual developers getting started with local agentic workflows.
                </p>
                <hr className="border-white/10" />
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Gmail & Calendar integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>AI Agent for task commands</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Voice command with AI Agent</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>1M monthly token limit</span>
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
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-[11px] font-bold uppercase tracking-wider text-slate-100 hover:text-white shadow-sm transition-all duration-200 cursor-pointer"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl border border-purple-500/20 bg-white/5 backdrop-blur-md space-y-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.1)] relative overflow-hidden">
              {/* Coming Soon Tag */}
              <div className="absolute top-4 right-4 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">
                Coming Soon
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 font-sans">Enterprise Ready</span>
                  <h3 className="text-xl font-bold text-white uppercase">Pro Plan</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">$15</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  For power users and teams requiring infinite scale, custom voice models, and smarter AI models.
                </p>
                <hr className="border-white/10" />
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="font-semibold text-white">Everything in Free, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Highest monthly token limit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Access to smarter AI models</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Custom voice models</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Priority Support</span>
                  </li>
                </ul>
              </div>

              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-not-allowed shadow-none"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full liquid-glass-footer py-8 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {/* Left: Copyright */}
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            © {new Date().getFullYear()} Ciel. All rights reserved.
          </div>

          {/* Right: Social links */}
          <div className="flex justify-center gap-4 text-slate-400">
            <a
              href="https://github.com/0nlyjs"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="hover:text-cyan-400 transition-colors p-1.5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </a>
            <a
              href="https://x.com/mistjsx"
              target="_blank"
              rel="noreferrer"
              aria-label="X (formerly Twitter)"
              className="hover:text-cyan-400 transition-colors p-1.5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com/in/mistjs"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="hover:text-cyan-400 transition-colors p-1.5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-transparent transition-opacity duration-300 ${
          showAuthModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setShowAuthModal(false)}
      />

      {/* Auth Sidebar Panel Container */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-950/35 backdrop-blur-xl border-y-0 border-r-0 border-l border-white/10 shadow-[-8px_0_32px_rgba(0,0,0,0.25)] transition-opacity duration-300 ${
          showAuthModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Sliding content panel */}
        <div
          className={`w-full h-full p-8 flex flex-col justify-center relative overflow-hidden transition-all duration-300 ease-out ${
            showAuthModal ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
          }`}
        >
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6 tracking-normal leading-tight text-center font-sans">CIEL</h3>

            {isVerificationSent ? (
              <div className="space-y-4">
                <div className="border border-green-500/20 bg-green-950/35 p-4 rounded-xl text-xs text-green-400 leading-relaxed">
                  <span className="font-bold block uppercase mb-1">VERIFICATION LINK DISPATCHED</span>
                  A secure verification link has been sent to <span className="underline font-bold text-white">{authEmail}</span>. 
                  Please check your inbox and click the link to activate your node.
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
                      if (!authName.trim() || !authEmail.trim() || !authPassword) {
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
                            setAuthError(ctx.error.message || "Registration failed.");
                            setAuthLoading(false);
                          },
                          onSuccess: () => {
                            setIsVerificationSent(true);
                            setAuthLoading(false);
                          },
                        }
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
                              setAuthError("Node is unverified. Please verify your email before logging in.");
                            } else {
                              setAuthError(ctx.error.message || "Authorization failed.");
                            }
                            setAuthLoading(false);
                          },
                          onSuccess: () => {
                            setAuthLoading(false);
                            setShowAuthModal(false);
                            router.push("/dashboard");
                          },
                        }
                      );
                    }
                  }}
                  className="space-y-4"
                >
                  {isSignUp && (
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">name</label>
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
                    <label className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">email</label>
                    <input
                      type="email"
                      placeholder="e.g. guest@ciel.app"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-white/5 focus:bg-white/10 border border-white/10 focus:border-white/20 outline-none rounded-xl text-xs px-3 py-2.5 text-white transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">password</label>
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
                    className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/40 text-cyan-200 hover:text-white rounded-xl text-xs uppercase tracking-widest transition-all duration-200 shadow-sm disabled:opacity-50"
                  >
                    {authLoading ? "Authorizing..." : isSignUp ? "Create Node Account" : "Access Console"}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-white/10" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">OR</span>
                  <div className="flex-1 h-[1px] bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signIn.social({
                        provider: "google",
                        callbackURL: "/dashboard",
                      });
                    } catch (err) {
                      console.error("Google login error", err);
                    }
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-slate-200 hover:text-white rounded-xl transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Sign In with Google
                </button>

                <div className="text-center mt-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors underline uppercase tracking-wider cursor-pointer bg-transparent border-none"
                  >
                    {isSignUp ? "Already registered? Sign In" : "Need an account? Register Node"}
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
