import type { Metadata } from "next";
import CampaignWorkspace from "@/components/admin/CampaignWorkspace";
import "../../admin.css";
import "../../ops.css";
import "../campaigns.css";

export const metadata:Metadata={title:"Campaign Workspace | Vira Ops",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function CampaignWorkspacePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <CampaignWorkspace campaignId={Number(id)}/>;
}
