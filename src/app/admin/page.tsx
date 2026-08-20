import type { Metadata } from "next";
import AdminOverview from "@/components/admin/AdminOverview";
import "./admin.css";
import "./ops.css";
export const metadata:Metadata={title:"Vira Ops | Admin",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function AdminPage(){return <AdminOverview/>}
