"use client";

import { useState } from "react";
import { useCielStore } from "@/store/useCielStore";
import { Mail, ArrowRight, Globe } from "lucide-react";

interface AuthPortalProps {
  onSuccess: () => void;
}

export default function AuthPortal({ onSuccess }: AuthPortalProps) {
  const login = useCielStore((s) => s.login);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError("");

    // fake delay to make it feel real
    setTimeout(() => {
      login(name, email);
      setIsLoading(false);
      onSuccess();
    }, 1200);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setError("");
    
    setTimeout(() => {
      login("Rimuru Tempest", "rimuru@tempest.gov");
      setIsLoading(false);
      onSuccess();
    }, 1000);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(0,240,255,0.15)] transition-all">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 animate-pulse">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            Sync with Ciel
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Establish connection to your Gmail and Google Calendar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Your Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rimuru Tempest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 bg-zinc-900/50 border border-zinc-800 focus:border-cyan-500/50 text-white placeholder-zinc-550 rounded-lg px-4 text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. rimuru@tempest.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 bg-zinc-900/50 border border-zinc-800 focus:border-cyan-500/50 text-white placeholder-zinc-550 rounded-lg px-4 text-sm outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:text-zinc-400 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Initiate Sync
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-x-0 border-t border-zinc-800/80"></div>
          <span className="relative bg-zinc-950/70 px-3 text-xs text-zinc-500 uppercase tracking-wider">
            Or Quick Access
          </span>
        </div>

        {/* mock google sso */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          Continue with Google Account
        </button>
      </div>
    </div>
  );
}
