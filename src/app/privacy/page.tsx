import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            Ciel / Security
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
              Privacy Policy
            </h1>
            <p className="text-xs font-mono text-cyan-400/80 mt-2 uppercase tracking-widest">
              Effective Date: June 2026
            </p>
          </div>

          {/* Prose Content */}
          <div className="space-y-8 text-sm md:text-base text-slate-300 leading-relaxed font-sans">
            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                1. Introduction
              </h2>
              <p>
                Welcome to Ciel (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at{" "}
                <a
                  href="https://ciel.mistjs.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline transition-all"
                >
                  ciel.mistjs.com
                </a>
                , specifically concerning our integration with Google Workspace services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                2. Information We Collect
              </h2>
              <p>
                To provide our AI-driven email management and calendar scheduling features, Ciel requests access to specific data via Google OAuth API Scopes:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>
                  <strong className="text-slate-300">Google Workspace Data:</strong> With your explicit permission, we access your Gmail messages (to summarize and analyze actions) and your Google Calendar (to create, update, or manage events).
                </li>
                <li>
                  <strong className="text-slate-300">Account Information:</strong> Basic profile information such as your name and email address to authenticate your account.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                3. How We Use Your Information
              </h2>
              <p>
                We use the collected data strictly to execute the core functionalities of Ciel:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>Analyzing and summarizing incoming emails using AI.</li>
                <li>Automatically identifying actionable dates and details to create corresponding Google Calendar events.</li>
                <li>Improving user experience and processing user-initiated requests.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                4. Data Sharing and Google API Disclosure
              </h2>
              <p>
                Ciel&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline transition-all"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>
                  <strong className="text-slate-300">No Third-Party Sale:</strong> We do not sell, trade, or rent your Google user data to third parties.
                </li>
                <li>
                  <strong className="text-slate-300">AI Processing:</strong> Your data is processed via secure AI models strictly for automation and summarization. Data sent to AI APIs is not used to train generalized models.
                </li>
                <li>
                  <strong className="text-slate-300">Human Review:</strong> Human review of your email or calendar data is strictly prohibited unless necessary for security purposes, debugging explicit errors reported by you, or as required by law.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                5. Data Retention and Deletion
              </h2>
              <p>
                We only retain your data for as long as necessary to provide our services. You can revoke Ciel’s access to your Google account at any time via your Google Security Settings or by deleting your account within the Ciel dashboard. Upon deletion, all cached indices or data associated with your account will be permanently removed from our databases.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                6. Security
              </h2>
              <p>
                We implement robust administrative, technical, and physical security measures (including encryption in transit and at rest) to protect your personal information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                7. Contact Us
              </h2>
              <p>
                If you have questions about this policy, please contact us at:{" "}
                <a
                  href="mailto:ciel@mistjs.com"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors font-mono"
                >
                  ciel@mistjs.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
