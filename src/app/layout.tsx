import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulley System Simulator — Interactive Physics Education",
  description:
    "Build and simulate 2D pulley systems to learn about mechanical advantage, tension, and kinematics. An interactive physics education tool for high school students.",
  keywords: ["pulley", "physics", "simulator", "education", "mechanics", "tension"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
