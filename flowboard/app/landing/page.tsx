import type { Metadata } from "next";
import LandingClient from "./LandingClient";
import "./landing.css";

export const metadata: Metadata = {
  title: "KocBan — Küçük ekipler için büyük kanban",
  description:
    "Kanban, timeline, list view, leaderboard ve KAI AI asistanı — hepsi tek bir yerde. Küçük yazılım ekipleri için sıcak, sade bir tahta.",
};

export default function LandingPage() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <LandingClient />
    </>
  );
}
