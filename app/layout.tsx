import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  // 700/800 are the landing page's display weights.
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Virtuozo — Ads Manager",
  description: "Run and manage Facebook ads, minus the complexity.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${montserrat.variable} min-h-screen bg-background text-ink antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
