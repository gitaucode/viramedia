import type { Metadata } from "next";
import LeadsAdmin from "@/components/admin/LeadsAdmin";
import "../admin.css";
import "../ops.css";
export const metadata:Metadata={title:"Brand Leads | Vira Ops",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function LeadsPage(){return <LeadsAdmin/>}
