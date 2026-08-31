import type { Metadata } from "next";
import "./globals.css";
import "./rhythm.css";
import "./public-polish.css";
import "./workspace.css";
import "./workspace-layout.css";
import "./workspace-theme-compat.css";
import "./workspace-soft-polish.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "Vira Media | Creator Marketing & Short-form Agency, Kenya", template: "%s | Vira Media" },
  description: "Vira Media helps Kenyan brands create short-form content and run creator-led campaigns through strategy, production and Vira Network.",
};

const workspaceThemeInit=`try{const t=localStorage.getItem('vira-workspace-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.opsTheme=t}else{delete document.documentElement.dataset.opsTheme}}catch{}`;

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:workspaceThemeInit}}/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/></head><body><AppShell>{children}</AppShell></body></html>}
