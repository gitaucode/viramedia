import type { Metadata } from "next";
import OpportunitiesAdmin from "@/components/admin/OpportunitiesAdmin";
import "./opportunities.css";
export const metadata:Metadata={title:"Opportunities | Vira Ops",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function OpportunitiesPage(){return <OpportunitiesAdmin/>}
