import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c, Unbounded } from "next/font/google";
import "./globals.scss";

const rounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-rounded",
  display: "swap"
});

const display = Unbounded({
  subsets: ["latin"],
  weight: ["600", "800", "900"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "BLOBVERSE",
  description: "Rezerv frontend assessment built with Next.js, TypeScript, Three.js, SCSS modules, and reusable table utilities.",
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true
    },
    index: true
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#120a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rounded.variable} ${display.variable}`}>
      <head>
        <link rel="preload" as="image" href="/images/purple16.webp" />
      </head>
      <body>{children}</body>
    </html>
  );
}
