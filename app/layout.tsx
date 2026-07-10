import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Rezerv Frontend Engineering Assessment",
  description: "Next.js assessment project with animation and reusable DataTable challenges."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
