import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from '@/components/theme-provider'
import { SoundsProvider } from '@/contexts/sounds-context'
import "./globals.css"


export const metadata: Metadata = {
  title: {
    default: "Hitman's Library",
    template: "%s | Hitman's Library",
  },
  description:
    "Extract, organize, and reference design systems. Upload links, import Excel sheets, automatically extract colors, typography, layout architecture. Generate prompts for consistent high-quality builds.",
  keywords: [
    "design library",
    "design extraction",
    "design reference",
    "design system",
    "color palette extraction",
    "typography extraction",
    "design patterns",
    "design inspiration",
    "design catalog",
    "design management",
  ],
  authors: [{ name: "Damilare Osofisan" }],
  creator: "Damilare Osofisan",
  publisher: "Hitman's Library",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://hitmanslibrary.xyz"),
  icons: {
    // SVG first — it stays sharp at every size and answers the browser's own
    // theme; the PNG is the fallback for clients that don't take SVG favicons.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    // Apple flattens transparency onto black, so this one carries its own
    // light ground rather than being handed one.
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Hitman's Library",
    description:
      "A personal infrastructure for everything worth saving on the web. No folders. No bookmarks. Just the library.",
    siteName: "Hitman's Library",
    // One image, not two. Link previews are rendered from a copy the platform
    // scraped and cached on its own servers, so there is no viewer and no
    // theme to answer — the card's frame follows the phone, the picture in it
    // cannot. Dark holds up on both grounds; /og-light.png is the same artwork
    // the other way round if we ever want to switch.
    images: [
      {
        url: "https://hitmanslibrary.xyz/og.png",
        width: 1200,
        height: 630,
        alt: "Hitman's Library",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hitman's Library",
    description:
      "A personal infrastructure for everything worth saving on the web. No folders. No bookmarks. Just the library.",
    images: ["https://hitmanslibrary.xyz/og.png"],
    creator: "@damilareoo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const resizeObserverErr = /ResizeObserver loop/;

                window.addEventListener('error', function(e) {
                  if (e.message && resizeObserverErr.test(e.message)) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                  }
                });

                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && e.reason.message && resizeObserverErr.test(e.reason.message)) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                  }
                });

                const originalError = console.error;
                console.error = function(...args) {
                  if (args[0] && typeof args[0] === 'string' && resizeObserverErr.test(args[0])) {
                    return;
                  }
                  originalError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
          <MotionProvider>
            <SoundsProvider>
              {children}
            </SoundsProvider>
          </MotionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
