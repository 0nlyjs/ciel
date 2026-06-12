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
    <div className="absolute inset-0 flex items-center justify-center bg-void/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md cyber-glass rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(0,240,255,0.25)] transition-all">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow mb-4 animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-crisp-white font-sans">
            Sync with Ciel
          </h2>
          <p className="text-sm text-silvery-gray/70 mt-2">
            Establish connection to your Gmail and Google Calendar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-xs text-crimson bg-crimson/10 border border-crimson/20 px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-silvery-gray/60 uppercase tracking-wider">
              Your Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rimuru Tempest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 bg-void border border-white/10 focus:border-cyan-glow/50 text-crisp-white placeholder-silvery-gray/30 rounded-lg px-4 text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-silvery-gray/60 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. rimuru@tempest.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 bg-void border border-white/10 focus:border-cyan-glow/50 text-crisp-white placeholder-silvery-gray/30 rounded-lg px-4 text-sm outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-gradient-to-r from-cyan-glow to-cyber-magenta hover:opacity-90 disabled:from-cyan-glow/30 disabled:to-cyber-magenta/30 text-void font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)]"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-void/30 border-t-void rounded-full animate-spin" />
            ) : (
              <>
                Initiate Sync
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-void stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-x-0 border-t border-white/10"></div>
          <span className="relative bg-[#111625] px-3 text-xs text-silvery-gray/40 uppercase tracking-wider">
            Or Quick Access
          </span>
        </div>

        {/* mock google sso */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-11 bg-void hover:bg-white/5 border border-white/10 text-silvery-gray hover:text-cyan-glow font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
        >
          <Globe className="w-4 h-4 text-cyan-glow" />
          Continue with Google Account
        </button>
      </div>
    </div>
  );
}
