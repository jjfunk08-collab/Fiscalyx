import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TERMINAL — Multi-Asset Market Workstation",
  description:
    "A Bloomberg Terminal-style multi-asset market terminal: live monitor, charting, fundamentals, news, macro calendar, yield curve, and options — built with Next.js 14.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="bg-term-bg text-term-white antialiased selection:bg-term-amber selection:text-black">
        {children}
      </body>
    </html>
  );
}
