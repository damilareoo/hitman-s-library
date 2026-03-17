import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from '@/components/theme-provider'
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] })

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
  authors: [{ name: "v0" }],
  creator: "v0",
  publisher: "v0",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://mars-hitman-library.vercel.app"),
  icons: {
    icon: [
      { url: "/icon.jpg", type: "image/jpeg" },
      { url: "/icon.jpg", sizes: "32x32", type: "image/jpeg" },
      { url: "/icon.jpg", sizes: "16x16", type: "image/jpeg" },
    ],
    apple: [
      { url: "/icon.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
    shortcut: "/icon.jpg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Hitman's Library",
    description:
      "A personal infrastructure for everything worth saving on the web. No folders. No bookmarks. Just the library.",
    siteName: "Hitman's Library",
    images: [
      {
        url: "https://mars-hitman-library.vercel.app/og-image-v2.png",
        width: 1200,
        height: 630,
        alt: "Hitman's Library - A personal infrastructure for everything worth saving on the web",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hitman's Library",
    description:
      "A personal infrastructure for everything worth saving on the web. No folders. No bookmarks. Just the library.",
    images: ["https://mars-hitman-library.vercel.app/og-image-v2.png"],
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
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${GeistMono.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
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
            {children}
          </MotionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
