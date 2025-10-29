import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 p-6">{children}</body>
    </html>
  );
}
