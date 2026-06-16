"use client";

import { useCielStore } from "@/store/useCielStore";

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ sidebar, children }: DashboardLayoutProps) {
  const isDark = true;

  const ambientBg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E"), url("/cielbg.jpg")`;

  const bgClass = "text-gray-300 selection:bg-blue-500 selection:text-white";

  return (
    <div className={`h-screen w-screen overflow-hidden relative bg-transparent ${bgClass} p-6 font-sans flex transition-all duration-300`}>
      {/* Ambient Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none overflow-hidden"
        style={{
          backgroundImage: ambientBg,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute top-[10%] left-[5%] w-[45vw] h-[45vw] max-w-[600px] rounded-full blur-[120px] transition-all duration-500 bg-cyan-500/5 animate-float-slow-1" />
        <div className="absolute bottom-[10%] right-[5%] w-[50vw] h-[50vw] max-w-[700px] rounded-full blur-[140px] transition-all duration-500 bg-purple-500/5 animate-float-slow-2" />
        <div className="absolute top-[40%] left-[35%] w-[40vw] h-[40vw] max-w-[500px] rounded-full blur-[120px] transition-all duration-500 bg-blue-500/5 animate-float-slow-3" />
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
