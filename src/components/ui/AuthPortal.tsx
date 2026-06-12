"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Terminal, Globe, X, ArrowRight, User, Mail, Lock, ShieldCheck } from "lucide-react";

interface AuthPortalProps {
  onCancel: () => void;
}

export default function AuthPortal({ onCancel }: AuthPortalProps) {
  const [tab, setTab] = useState<"signin" | "signup" | "verify">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Clear errors on tab switch
  useEffect(() => {
    setError("");
  }, [tab]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (tab === "signup" && !name.trim()) {
      setError("Please enter your name to register.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (tab === "signup") {
        // Sign Up Flow
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Registration failed.");
          setIsLoading(false);
          return;
        }

        // Signup successful, transition to verification code entry
        setVerifyEmail(email);
        setTab("verify");
        setIsLoading(false);
        return;
      }

      // Sign In Flow
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "UNVERIFIED") {
          // If correct credentials but unverified, transition to code entry
          setVerifyEmail(email);
          setTab("verify");
        } else {
          setError("Invalid email or password. Verify credentials.");
        }
        setIsLoading(false);
      } else {
        window.location.reload(); // Success, reload to sync session and load dashboard
      }
    } catch (err) {
      console.error("[AuthForm] Error:", err);
      setError("Authentication service offline.");
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 1. Submit code to verify API
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, code: verificationCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setIsLoading(false);
        return;
      }

      // 2. Code verified! Log in user automatically with cached password
      const result = await signIn("credentials", {
        email: verifyEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account verified. Please go back and sign in manually.");
        setIsLoading(false);
      } else {
        window.location.reload(); // Success, login complete
      }
    } catch (err) {
      console.error("[VerifyForm] Error:", err);
      setError("Verification service offline.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    signIn("google");
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-void/65 backdrop-blur-md px-4 z-40 font-sans">
      <div className="w-full max-w-md cyber-glass rounded-2xl p-8 border border-white/10 shadow-[0_0_50px_rgba(0,240,255,0.15)] relative">
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-silvery-gray hover:text-crisp-white p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/5"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header (Only shown on login/signup tabs) */}
        {tab !== "verify" && (
          <div className="text-center mb-6 select-none">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow mb-3">
              <Terminal className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-crisp-white tracking-wide">
              Ciel Workspace Access
            </h2>
            <p className="text-[11px] text-silvery-gray/50 mt-1">
              Establish secure analytical terminal connection.
            </p>
          </div>
        )}

        {/* Tab switchers (Only shown on login/signup tabs) */}
        {tab !== "verify" && (
          <div className="grid grid-cols-2 gap-1 mb-5 bg-void/40 p-1 rounded-lg border border-white/5 select-none text-[11px] font-mono font-semibold">
            <button
              onClick={() => setTab("signin")}
              className={`py-1.5 rounded-md transition-all cursor-pointer ${
                tab === "signin"
                  ? "bg-cyan-glow/15 text-cyan-glow shadow-sm"
                  : "text-silvery-gray/50 hover:text-silvery-gray"
              }`}
            >
              [ SIGN IN ]
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`py-1.5 rounded-md transition-all cursor-pointer ${
                tab === "signup"
                  ? "bg-cyber-magenta/15 text-cyber-magenta shadow-sm"
                  : "text-silvery-gray/50 hover:text-silvery-gray"
              }`}
            >
              [ SIGN UP ]
            </button>
          </div>
        )}

        {/* Error Notification banner */}
        {error && (
          <div className="text-[11px] font-mono text-crimson bg-crimson/10 border border-crimson/20 px-3 py-2 rounded-lg mb-5 animate-pulse">
            ERR // {error.toUpperCase()}
          </div>
        )}

        {/* Verification code prompt */}
        {tab === "verify" && (
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow mb-3 animate-pulse">
                <ShieldCheck className="w-6 h-6 text-cyan-glow" />
              </div>
              <h3 className="text-sm font-bold text-crisp-white select-none">Security Verification</h3>
              <p className="text-[11px] text-silvery-gray/60 mt-2 max-w-xs mx-auto leading-relaxed">
                We sent a 6-digit access code to <span className="text-cyan-glow font-mono font-bold">{verifyEmail}</span>. Enter the code to activate your workspace node.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-silvery-gray/50 uppercase tracking-wider block">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                disabled={isLoading}
                required
                className="w-full h-11 bg-void/60 border border-white/10 focus:border-cyan-glow/40 text-crisp-white placeholder-silvery-gray/25 rounded-lg px-4 text-center text-sm outline-none tracking-[0.75em] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-cyan-glow to-ice-blue hover:opacity-90 disabled:opacity-50 text-void font-bold rounded-lg text-[10px] tracking-wider font-mono transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-glow/20 shadow-md"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
              ) : (
                <>
                  VERIFY & CONNECT
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("signin")}
              className="w-full text-center text-[10px] font-mono text-silvery-gray/40 hover:text-crisp-white mt-4 uppercase tracking-wider block transition-colors cursor-pointer"
            >
              [ Back to Sign In ]
            </button>
          </form>
        )}

        {/* Credentials Inputs (Signin & Signup) */}
        {tab !== "verify" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-silvery-gray/50 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-silvery-gray/30 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Alexander Ciel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full h-10 bg-void/60 border border-white/10 focus:border-cyan-glow/40 text-crisp-white placeholder-silvery-gray/25 rounded-lg pl-9 pr-4 text-xs outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-silvery-gray/50 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-silvery-gray/30 absolute left-3" />
                <input
                  type="email"
                  placeholder="alexander@ciel.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full h-10 bg-void/60 border border-white/10 focus:border-cyan-glow/40 text-crisp-white placeholder-silvery-gray/25 rounded-lg pl-9 pr-4 text-xs outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-silvery-gray/50 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-silvery-gray/30 absolute left-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full h-10 bg-void/60 border border-white/10 focus:border-cyan-glow/40 text-crisp-white placeholder-silvery-gray/25 rounded-lg pl-9 pr-4 text-xs outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-10 bg-gradient-to-r font-mono text-[10px] uppercase font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2 ${
                tab === "signin"
                  ? "from-cyan-glow to-ice-blue hover:opacity-90 disabled:opacity-50 text-void border border-cyan-glow/20"
                  : "from-cyber-magenta to-crimson hover:opacity-90 disabled:opacity-50 text-crisp-white border border-cyber-magenta/20"
              }`}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {tab === "signin" ? "INITIATE SESSION" : "ESTABLISH NODE"}
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Demo fallback credentials helper notice */}
        {tab === "signin" && (
          <div className="mt-4 text-center font-mono text-[9px] text-cyan-glow/50 bg-cyan-glow/5 border border-cyan-glow/10 py-1.5 px-3 rounded-lg select-none">
            TIP: Use <span className="underline">guest@ciel.app</span> / <span className="underline">password</span> for guest login.
          </div>
        )}

        {/* SSO Quick Connect Divider */}
        {tab !== "verify" && (
          <div className="relative flex items-center justify-center my-4 select-none">
            <div className="absolute inset-x-0 border-t border-white/10"></div>
            <span className="relative bg-[#0d121f] px-3 text-[9px] text-silvery-gray/30 uppercase tracking-widest font-mono">
              Or Quick Connect
            </span>
          </div>
        )}

        {/* Google SSO button */}
        {tab !== "verify" && (
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-10 bg-void hover:bg-white/5 border border-white/10 text-silvery-gray hover:text-cyan-glow font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Globe className="w-4 h-4 text-cyan-glow" />
            Continue with Google
          </button>
        )}

        {/* Security watermark footer */}
        <div className="text-center text-[9px] font-mono text-silvery-gray/30 mt-6 select-none">
          SECURE HANDSHAKE // OAUTH_2.0 // CODE_VERIFICATION
        </div>

      </div>
    </div>
  );
}
