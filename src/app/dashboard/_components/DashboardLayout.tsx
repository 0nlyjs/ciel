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
    ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E"), linear-gradient(135deg, #020204 0%, #060814 30%, #0a0d24 70%, #020204 100%)`
    : `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.025'/%3E%3C/svg%3E"), linear-gradient(135deg, #f4f4f6 0%, #e2e8f0 30%, #cbd5e1 70%, #f4f4f6 100%)`;

  const bgClass = isDark 
    ? "text-gray-300 selection:bg-blue-500 selection:text-white" 
    : "text-slate-800 selection:bg-cyan-500 selection:text-black";

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
          isDark ? "bg-blue-600/5 animate-float-slow-1" : "bg-slate-300/30 animate-float-slow-1"
        }`} />
        <div className={`absolute bottom-[10%] right-[5%] w-[50vw] h-[50vw] max-w-[700px] rounded-full blur-[140px] transition-all duration-500 ${
          isDark ? "bg-indigo-650/5 animate-float-slow-2" : "bg-zinc-350/20 animate-float-slow-2"
        }`} />
        <div className={`absolute top-[40%] left-[35%] w-[40vw] h-[40vw] max-w-[500px] rounded-full blur-[120px] transition-all duration-500 ${
          isDark ? "bg-sky-500/5 animate-float-slow-3" : "bg-neutral-300/25 animate-float-slow-3"
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
