"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signUp } from "@/lib/auth-client";

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

  // If user is already logged in, redirect them to dashboard directly on load if they want
  // but we keep them on landing page to see the features, with "Dashboard" buttons active.
  const isAuthenticated = !isPending && !!session;

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-gray-300 font-mono flex flex-col relative overflow-hidden select-none">
      {/* Subtle background glow accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-gray-900/80 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center font-bold text-black tracking-tighter">
            C
          </div>
          <span className="text-white font-bold tracking-widest text-lg">CIEL</span>
        </div>

        <div className="flex items-center gap-4">
          {isPending ? (
            <span className="text-xs text-gray-500 animate-pulse">Syncing session...</span>
          ) : isAuthenticated ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 border border-purple-500/30 hover:border-purple-500 bg-purple-950/20 text-purple-300 hover:text-white text-xs font-bold uppercase rounded transition-all cursor-pointer shadow-lg shadow-purple-950/20"
              >
                Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError("");
                  setAuthSuccess("");
                  setShowAuthModal(true);
                }}
                className="text-xs font-bold uppercase hover:text-white transition-colors cursor-pointer px-3 py-2"
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
                className="px-4 py-2 bg-white text-black hover:bg-gray-200 text-xs font-bold uppercase rounded transition-colors cursor-pointer shadow-md"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-16 flex flex-col justify-center relative z-10">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-800/60 bg-cyan-950/10 text-cyan-400 rounded-full text-[10px] uppercase font-bold tracking-widest animate-pulse-slow">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Sentient Analytical Workspace Coordination
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-none uppercase">
            Autonomously Orchestrate <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400">
              Your Day & Workflow
            </span>
          </h1>

          <p className="text-sm md:text-base text-gray-400 max-w-2xl leading-relaxed">
            Supercharge your inbox and schedule using Ciel. Connect your Gmail and Google Calendar parameters, and command our agentic AI assistant to draft emails, prioritize correspondence, organize calendars, and search vector databases.
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3.5 bg-gradient-to-r from-purple-700 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white text-xs font-bold uppercase rounded transition-all cursor-pointer shadow-lg shadow-purple-950/40"
              >
                Go to Dev Dashboard &rarr;
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError("");
                  setAuthSuccess("");
                  setShowAuthModal(true);
                }}
                className="px-6 py-3.5 bg-white text-black hover:bg-gray-200 text-xs font-bold uppercase rounded transition-colors cursor-pointer shadow-lg shadow-white/10"
              >
                Initialize Ciel Node
              </button>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20">
          <div className="p-6 border border-gray-900 bg-gray-950/40 backdrop-blur-sm rounded hover:border-purple-900/60 transition-colors">
            <div className="text-xl mb-3">📬</div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Live Sync Log</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Real-time synchronization with Gmail using Server-Sent Events. Instantly pulls, reads, and updates messages.
            </p>
          </div>

          <div className="p-6 border border-gray-900 bg-gray-950/40 backdrop-blur-sm rounded hover:border-cyan-900/60 transition-colors">
            <div className="text-xl mb-3">✨</div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Ciel AI Agent</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              An agentic chatbot that reads incoming emails, drafts context-aware smart responses, and coordinates calendars.
            </p>
          </div>

          <div className="p-6 border border-gray-900 bg-gray-950/40 backdrop-blur-sm rounded hover:border-pink-900/60 transition-colors">
            <div className="text-xl mb-3">🔍</div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Vector Search DB</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Semantically query calendar dates and mail contents using artificial intelligence embeddings database lookup.
            </p>
          </div>

          <div className="p-6 border border-gray-900 bg-gray-950/40 backdrop-blur-sm rounded hover:border-gray-800 transition-colors">
            <div className="text-xl mb-3">⚙️</div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Workspace Tuning</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Calibrate auto-priority filters, synchronization frequencies, and system preferences inside a clean developer console.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-gray-900/60 text-center text-[10px] text-gray-600 uppercase tracking-widest relative z-10">
        Ciel Workspace &copy; {new Date().getFullYear()} // Secure AI Nodes Integrated.
      </footer>

      {/* Auth Popup Modal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div 
            className="max-w-md w-full border border-gray-800 bg-[#0d0e12] p-8 rounded shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle glow accents inside modal */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg cursor-pointer"
            >
              ×
            </button>

            <h1 className="text-xl font-bold text-white mb-1 tracking-widest text-center">CIEL WORKSPACE</h1>
            <p className="text-[10px] text-gray-500 mb-6 uppercase tracking-wider text-center">Node Security Authorization</p>

            {isVerificationSent ? (
              <div className="space-y-4">
                <div className="border border-green-800 bg-green-950/20 p-4 rounded text-xs text-green-300 leading-relaxed">
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
                  className="w-full py-2 border border-gray-700 text-gray-400 font-bold text-xs rounded hover:bg-gray-800 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] leading-relaxed text-gray-400 uppercase tracking-widest text-center">
                  {isSignUp ? "INITIALIZE_NEW_IDENTITY_NODE" : "AUTHORIZE_SECURE_SESSION"}
                </p>

                {authError && (
                  <div className="border border-red-900 bg-red-950/20 p-3 rounded text-[11px] text-red-400 whitespace-pre-wrap">
                    {authError}
                  </div>
                )}

                {authSuccess && (
                  <div className="border border-green-900 bg-green-950/20 p-3 rounded text-[11px] text-green-400">
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
                  className="space-y-3"
                >
                  {isSignUp && (
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">NODE_NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-[#12151e] border border-gray-800 text-xs px-3 py-2 outline-none rounded text-white focus:border-[#FF007F]"
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
                      className="w-full bg-[#12151e] border border-gray-800 text-xs px-3 py-2 outline-none rounded text-white focus:border-[#00F0FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">PASSWORD_SECRET</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-[#12151e] border border-gray-800 text-xs px-3 py-2 outline-none rounded text-white focus:border-[#00F0FF]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-200 transition-colors uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                  >
                    {authLoading ? "Authorizing..." : isSignUp ? "Create Node Account" : "Access Console"}
                  </button>
                </form>

                <div className="relative flex items-center justify-center my-4">
                  <hr className="w-full border-gray-800" />
                  <span className="absolute bg-[#0d0e12] px-2 text-[9px] text-gray-600 uppercase tracking-widest">OR</span>
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
                  className="w-full py-2 bg-[#12151e] text-white border border-gray-800 hover:border-gray-600 font-bold text-xs rounded transition-colors uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
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
                    className="text-[10px] text-gray-500 hover:text-white transition-colors underline uppercase tracking-wider cursor-pointer"
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
