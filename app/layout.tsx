import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emotion Tutor System",
  description: "Privacy-preserving emotion monitoring for tutor-student sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
