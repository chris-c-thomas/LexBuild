import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/styles/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "LexBuild — U.S. Code in Markdown",
    template: "%s | LexBuild",
  },
  description:
    "Browse the complete U.S. Code as structured Markdown. Built by LexBuild for AI/RAG ingestion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
