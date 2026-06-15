"use client";

import { useCielStore } from "@/store/useCielStore";

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ sidebar, children }: DashboardLayoutProps) {
  const theme = useCielStore((s) => s.theme);
  const isDark = theme === "dark";

  const ambientBg = isDark
    ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E"), linear-gradient(135deg, #0b0c10 0%, #12131a 30%, #1a1528 70%, #0b0c10 100%)`
    : `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E"), linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 16%, #ddd6fe 32%, #fbcfe8 48%, #fecdd3 64%, #fed7aa 80%, #bbf7d0 100%)`;

  const bgClass = isDark 
    ? "text-gray-300 selection:bg-purple-500 selection:text-white" 
    : "text-slate-700 selection:bg-cyan-500 selection:text-black";

  return (
    <div className={`h-screen w-screen overflow-hidden relative bg-transparent ${bgClass} p-6 font-sans flex transition-all duration-300`}>
      {/* Ambient Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none overflow-hidden"
        style={{
          background: ambientBg,
        }}
      >
        <div className={`absolute top-[10%] left-[5%] w-[45vw] h-[45vw] max-w-[600px] rounded-full blur-[120px] transition-all duration-500 ${
          isDark ? "bg-indigo-500/5 animate-float-slow-1" : "bg-sky-300/25 animate-float-slow-1"
        }`} />
        <div className={`absolute bottom-[10%] right-[5%] w-[50vw] h-[50vw] max-w-[700px] rounded-full blur-[140px] transition-all duration-500 ${
          isDark ? "bg-fuchsia-500/5 animate-float-slow-2" : "bg-pink-300/25 animate-float-slow-2"
        }`} />
        <div className={`absolute top-[40%] left-[35%] w-[40vw] h-[40vw] max-w-[500px] rounded-full blur-[120px] transition-all duration-500 ${
          isDark ? "bg-violet-500/5 animate-float-slow-3" : "bg-violet-300/15 animate-float-slow-3"
        }`} />
      </div>

      {/* Main Grid Wrapper */}
      <div className="flex gap-6 w-full h-full min-h-0">
        {sidebar}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
export default DashboardLayout;
