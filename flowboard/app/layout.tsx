import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { TweaksProvider } from "@/components/TweaksProvider";

export const metadata: Metadata = {
  title: "KocSistemBoard",
  description: "Kanban board built with Next.js + Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var raw = localStorage.getItem("flowboard.tweaks");
                if (raw) {
                  var tweaks = JSON.parse(raw);
                  var root = document.documentElement;
                  if (tweaks.accent) root.style.setProperty("--accent", tweaks.accent);
                  if (tweaks.density) root.setAttribute("data-density", tweaks.density);
                  if (tweaks.bg) root.setAttribute("data-bg", tweaks.bg);
                }
              } catch (e) {}
            })();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <TweaksProvider>
          <QueryProvider>{children}</QueryProvider>
        </TweaksProvider>
      </body>
    </html>
  );
}
