"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, ArrowRight, Globe } from "lucide-react";

export default function AuthPortal() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    signIn("google");
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

        {/* Action Button */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-cyan-glow to-cyber-magenta hover:opacity-90 disabled:opacity-50 text-void font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)]"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-void/30 border-t-void rounded-full animate-spin" />
            ) : (
              <>
                <Globe className="w-4 h-4 text-void stroke-[3]" />
                Continue with Google Account
                <ArrowRight className="w-4 h-4 text-void stroke-[3]" />
              </>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] font-mono text-silvery-gray/30 mt-6">
          Secured with NextAuth.js OAuth 2.0 handshake
        </div>

      </div>
    </div>
  );
}
