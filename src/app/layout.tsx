import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const fontSans = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ciel Workspace // Sentient Analytical Interface",
  description: "AI-driven Gmail and Google Calendar coordination dashboard, built with Corsair integration layer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full"
      suppressHydrationWarning
    >
      <body className={`${fontSans.variable} ${fontMono.variable} min-h-full flex flex-col antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

