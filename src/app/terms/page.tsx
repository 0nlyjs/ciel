import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between text-slate-200 font-sans selection:bg-cyan-500 selection:text-black">
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

      {/* Main content container */}
      <main className="w-full flex-1 max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-8">
        {/* Navigation / Header island */}
        <div className="liquid-glass-island flex items-center justify-between py-4 px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 hover:text-white transition-all duration-200 font-mono"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 animate-pulse" />
            Back to Console
          </Link>
          <div className="text-xs uppercase tracking-widest font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Ciel / Terms
          </div>
        </div>

        {/* Legal content card */}
        <article className="relative bg-slate-900/40 border border-white/5 rounded-3xl p-8 md:p-12 backdrop-blur-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
          {/* Subtle decoration elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

          {/* Heading */}
          <div className="border-b border-white/10 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Terms and Conditions
            </h1>
            <p className="text-xs font-mono text-cyan-400/80 mt-2 uppercase tracking-widest">
              Last Updated: June 2026
            </p>
          </div>

          {/* Prose Content */}
          <div className="space-y-8 text-sm md:text-base text-slate-300 leading-relaxed font-sans">
            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using Ciel at{" "}
                <a
                  href="https://ciel.mistjs.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline transition-all"
                >
                  ciel.mistjs.com
                </a>
                , you agree to be bound by these Terms and Conditions. If you do not agree, you may not use the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                2. Description of Service
              </h2>
              <p>
                Ciel provides an AI-powered automation layer for email and calendar management. By linking your Google account, you authorize Ciel to act on your behalf to read, summarize, and manage emails, as well as create and edit calendar entries based on your configurations.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                3. User Responsibilities
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>You must be at least 18 years old to use this service.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You agree not to use the platform for any illegal or unauthorized purposes.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                4. Third-Party Services (Google)
              </h2>
              <p>
                Ciel relies on integrations with Google APIs. Your use of these integrations is governed by Google&apos;s Terms of Service. Ciel is not liable for any service interruptions, data losses, or policy changes implemented by Google.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                5. Limitation of Liability
              </h2>
              <p>
                Ciel is provided &quot;as is&quot; without warranties of any kind. In no event shall Ciel, its founders, or affiliates be liable for any indirect, incidental, special, or consequential damages arising out of your use or inability to use the platform, including but not limited to missed calendar events or misinterpretation of emails by the AI.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                6. Termination
              </h2>
              <p>
                We reserve the right to terminate or suspend your access to Ciel immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or our business interests.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                7. Governing Law
              </h2>
              <p>
                These terms are governed by the laws of India.
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
