import type { Metadata } from "next";
import CampaignsAdmin from "@/components/admin/CampaignsAdmin";
import "../admin.css";
import "../ops.css";
export const metadata:Metadata={title:"Campaigns | Vira Ops",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function CampaignsPage(){return <CampaignsAdmin/>}
