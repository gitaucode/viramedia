import type { Metadata } from "next";
import CreatorDirectory from "@/components/admin/CreatorDirectory";
import "../admin.css";

export const metadata: Metadata = { title: "Creator Directory | Vira Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function CreatorDirectoryPage() {
  return <CreatorDirectory />;
}
