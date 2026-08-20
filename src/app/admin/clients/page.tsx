import type { Metadata } from "next";
import ClientsAdmin from "@/components/admin/ClientsAdmin";
import "../admin.css";
import "../ops.css";
export const metadata:Metadata={title:"Clients | Vira Ops",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function ClientsPage(){return <ClientsAdmin/>}
