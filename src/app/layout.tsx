import type { Metadata } from "next";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import RevealInit from "@/components/RevealInit";

export const metadata: Metadata = {
  title: { default: "Vira Media | Creator Marketing & Short-form Agency, Kenya", template: "%s | Vira Media" },
  description: "Vira Media helps Kenyan brands create short-form content and run creator-led campaigns through strategy, production and Vira Network.",
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/></head><body><SiteNav/><main className="site-main">{children}</main><SiteFooter/><WhatsAppFloat/><RevealInit/></body></html>}
