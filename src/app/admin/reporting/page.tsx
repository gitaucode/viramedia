import type { Metadata } from "next";
import ReportingAdmin from "@/components/admin/ReportingAdmin";
import "../admin.css";
import "../ops.css";
import "./reporting.css";
export const metadata:Metadata={title:"Reporting | Vira Ops",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function ReportingPage(){return <ReportingAdmin/>}
