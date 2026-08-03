import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Condensed } from "next/font/google";
import "./globals.css";

// Data/tabular face
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Headers / nav / labels face
const cond = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const TAGLINE = "Fiscalyx — Multi-Asset Market Terminal.";

export const metadata: Metadata = {
  title: "Fiscalyx — Multi-Asset Market Terminal",
  description: TAGLINE,
  applicationName: "Fiscalyx",
  openGraph: {
    title: "Fiscalyx",
    description: TAGLINE,
    siteName: "Fiscalyx",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Fiscalyx",
    description: TAGLINE,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mono.variable} ${cond.variable}`}>
      <body className="bg-term-bg text-term-white antialiased selection:bg-term-amber selection:text-black">
        {children}
      </body>
    </html>
  );
}
