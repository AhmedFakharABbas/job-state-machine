import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Operations Dashboard",
  description: "Operator dashboard for asset job management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
