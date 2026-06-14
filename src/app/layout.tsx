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
        {/* Global SVG Filters for Liquid Glass Refraction */}
        <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
          <defs>
            {/* Standard pebble-lens refraction for cards, nav, buttons */}
            <filter id="liquid-glass-refract" x="-10%" y="-10%" width="120%" height="120%">
              <feImage
                href="data:image/svg+xml;utf8,<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'><defs><radialGradient id='r' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%23808080'/><stop offset='70%25' stop-color='%23808080'/><stop offset='100%25' stop-color='%23606060'/></radialGradient></defs><rect width='200' height='200' fill='%23808080'/><ellipse cx='100' cy='100' rx='90' ry='90' fill='url(%23r)'/></svg>"
                result="lensMap"
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              />
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed="1" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="warped" />
              <feGaussianBlur in="warped" stdDeviation="0.4" />
            </filter>

            {/* Magnifier lens effect */}
            <filter id="navbar-magnifier" x="0" y="0" width="1" height="1">
              <feImage
                href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48bGluZWFyR3JhZGllbnQgaWQ9ImdYIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmYwMDAwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDAwMDAwIi8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNnWCkiLz48L3N2Zz4="
                result="mapX"
                x="0"
                y="0"
                width="1"
                height="1"
                preserveAspectRatio="none"
              />
              <feImage
                href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48bGluZWFyR3JhZGllbnQgaWQ9ImdZIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMDA4NjAwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDA3OTAwIi8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNnWSkiLz48L3N2Zz4="
                result="mapY"
                x="0"
                y="0"
                width="1"
                height="1"
                preserveAspectRatio="none"
              />
              <feBlend in="mapX" in2="mapY" mode="screen" result="map" />
              <feDisplacementMap in="SourceGraphic" in2="map" scale="120" xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Stronger refraction for larger surfaces (modal) */}
            <filter id="liquid-glass-refract-strong" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" seed="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="warped" />
              <feGaussianBlur in="warped" stdDeviation="0.6" />
            </filter>

          </defs>
        </svg>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

