"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signUp } from "@/lib/auth-client";
import {
  Sparkles,
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
    <div className="relative min-h-screen bg-[#090B10] text-[#d1d5db] font-sans selection:bg-cyan-500 selection:text-black flex flex-col justify-between">
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#090B10]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black tracking-tighter shadow-lg shadow-cyan-500/20">
              C
            </div>
            <span className="text-white font-bold tracking-widest text-xl">Ceil.</span>
          </div>

          <div className="flex items-center gap-4">
            {isPending ? (
              <span className="text-xs text-cyan-400/60 animate-pulse">Checking credentials...</span>
            ) : isAuthenticated ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="px-5 py-2 border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/20 text-cyan-400 hover:text-white text-xs font-bold uppercase rounded-md transition-all duration-300 cursor-pointer shadow-md shadow-cyan-950/20"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError("");
                  setAuthSuccess("");
                  setShowAuthModal(true);
                }}
                className="text-xs font-bold uppercase hover:text-white text-gray-400 transition-colors cursor-pointer px-4 py-2 hover:bg-white/5 rounded-md border border-transparent hover:border-white/10"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-32 pb-16 space-y-24">
        
        {/* Section 1: Hero (The Awakening) */}
        <section className="flex flex-col items-center justify-center text-center min-h-[75vh] py-12 space-y-8 max-w-3xl mx-auto">
          {/* Decorative Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/20 bg-cyan-950/10 text-cyan-400 rounded-full text-[10px] uppercase font-bold tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Next-Gen Agentic Workspace
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-normal leading-tight uppercase">
            Think Fast.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              Work Faster.
            </span>
          </h1>

          {/* Sub-Headline */}
          <p className="text-sm md:text-base text-gray-400 leading-relaxed">
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
              className="px-8 py-4 bg-cyan-400 text-black hover:bg-cyan-300 font-bold uppercase rounded-lg transition-all duration-300 cursor-pointer shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 text-xs tracking-widest flex items-center gap-2 group border-none"
            >
              {isAuthenticated ? "Go to Dashboard" : "Launch Ceil"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>

        {/* Section 2: The Agent (Corsair MCP Focus) */}
        <section className="py-8">
          <div className="p-8 md:p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl space-y-6 hover:border-cyan-500/20 transition-all duration-300 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-purple-500/20 bg-purple-950/10 text-purple-400 rounded-full text-[10px] uppercase font-bold tracking-widest mx-auto">
              <Command className="w-3.5 h-3.5" />
              Corsair MCP Layer
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-normal leading-tight uppercase">
              Just Tell Ceil What to Do.
            </h2>

            <p className="text-xs md:text-sm text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/10 text-white text-[10px] font-mono">Cmd + K</kbd> and just type. Need to set up a meeting for Thursday? Want to clear out your junk mail? Just ask. Ceil understands plain English and handles the complex steps for you. It is like having a real assistant built right into your screen.
            </p>

            {/* 3-Column Mini-Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="p-5 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors text-left space-y-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chat to Act</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">Just type what you want.</p>
              </div>

              <div className="p-5 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors text-left space-y-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Smart Sorting</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">AI finds your most important emails.</p>
              </div>

              <div className="p-5 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors text-left space-y-2">
                <MousePointerClick className="w-5 h-5 text-blue-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Keyboard Only</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">Never click through menus again.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: The Engine (Speed & Postgres Focus) */}
        <section className="py-8">
          <div className="p-8 md:p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl space-y-6 hover:border-cyan-500/20 transition-all duration-300 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/20 bg-cyan-950/10 text-cyan-400 rounded-full text-[10px] uppercase font-bold tracking-widest mx-auto">
              <Zap className="w-3.5 h-3.5" />
              Database Speed Engine
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-normal leading-tight uppercase">
              Find Anything Instantly.
            </h2>

            <p className="text-xs md:text-sm text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Waiting for pages to load is frustrating. Ceil solves this by saving your data locally. This means you can search your entire email history and find any calendar event in less than one second. No loading bars. It is just always ready.
            </p>

            {/* 3-Column Mini-Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="p-5 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors text-left space-y-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instant Search</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">Find emails in under a second.</p>
              </div>

              <div className="p-5 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors text-left space-y-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Waiting</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">No loading screens or spinners.</p>
              </div>

              <div className="p-5 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors text-left space-y-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Always Live</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">Syncs your calendar in real-time.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#07080c] py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          {/* Left: Open Source & Demo links */}
          <div className="flex justify-center md:justify-start gap-6 text-xs text-gray-400 font-bold uppercase tracking-wider">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              GitHub Repo
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Demo Video
            </a>
          </div>

          {/* Center: Built Info & Hackathon details */}
          <div className="space-y-2 text-center text-[10px] text-gray-500 uppercase tracking-widest">
            <p className="text-gray-400 font-bold">Built with Next.js, Postgres & Corsair</p>
            <p className="text-[9px] opacity-75">
              Builder Mode On | MacBook Giveaway Hackathon #chaicode #corsair-dev
            </p>
          </div>

          {/* Right: Social links */}
          <div className="flex justify-center md:justify-end gap-6 text-xs text-gray-400 font-bold uppercase tracking-wider">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
              X / Twitter
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </footer>

      {/* Auth Popup Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div
              className="max-w-md w-full bg-slate-950/80 backdrop-blur-2xl border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Subtle background glow accents inside modal */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 tracking-normal leading-tight text-center font-sans">CIEL WORKSPACE</h3>
            <p className="text-[10px] text-gray-500 mb-6 uppercase tracking-wider text-center">Node Security Authorization</p>

            {isVerificationSent ? (
              <div className="space-y-4">
                <div className="border border-green-800/40 bg-green-950/20 p-4 rounded-xl text-xs text-green-300 leading-relaxed">
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
                  className="w-full py-2.5 border border-white/10 text-gray-300 font-bold text-xs rounded-lg hover:bg-white/5 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[9px] leading-relaxed text-cyan-400/80 font-bold uppercase tracking-widest text-center">
                  {isSignUp ? "INITIALIZE_NEW_IDENTITY_NODE" : "AUTHORIZE_SECURE_SESSION"}
                </p>

                {authError && (
                  <div className="border border-red-950 bg-red-950/20 p-3 rounded-lg text-[11px] text-red-400 whitespace-pre-wrap border-red-900/40">
                    {authError}
                  </div>
                )}

                {authSuccess && (
                  <div className="border border-green-950 bg-green-950/20 p-3 rounded-lg text-[11px] text-green-400 border-green-900/40">
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
                      <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">NODE_NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-[#12151e] border border-white/10 text-xs px-3 py-2.5 outline-none rounded-lg text-white focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">EMAIL_ADDRESS</label>
                    <input
                      type="email"
                      placeholder="e.g. guest@ciel.app"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-[#12151e] border border-white/10 text-xs px-3 py-2.5 outline-none rounded-lg text-white focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">PASSWORD_SECRET</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-[#12151e] border border-white/10 text-xs px-3 py-2.5 outline-none rounded-lg text-white focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-cyan-400 text-black font-bold text-xs rounded-lg hover:bg-cyan-300 transition-colors uppercase tracking-widest disabled:opacity-50 cursor-pointer border-none"
                  >
                    {authLoading ? "Authorizing..." : isSignUp ? "Create Node Account" : "Access Console"}
                  </button>
                </form>

                <div className="relative flex items-center justify-center my-4">
                  <hr className="w-full border-white/5" />
                  <span className="absolute bg-[#0b0c10] px-2 text-[9px] text-gray-600 uppercase tracking-widest">OR</span>
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
                  className="w-full py-2.5 bg-[#12151e] text-white border border-white/10 hover:border-cyan-500/30 font-bold text-xs rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
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
                    className="text-[10px] text-gray-500 hover:text-white transition-colors underline uppercase tracking-wider cursor-pointer bg-transparent border-none"
                  >
                    {isSignUp ? "Already registered? Sign In" : "Need an account? Register Node"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
