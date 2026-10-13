import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GH Radar, open-source tool discovery",
  description:
    "Newly created open-source GitHub repositories that ship developer tools, indexed daily.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <div className="grid-backdrop" aria-hidden="true" />
        <div className="glow-cyan fixed inset-0 -z-10" aria-hidden="true" />
        <div className="glow-violet fixed inset-0 -z-10" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
