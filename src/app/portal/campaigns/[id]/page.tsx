import PortalCampaign from "@/components/portal/PortalCampaign";
export const dynamic='force-dynamic';
export default async function PortalCampaignPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PortalCampaign campaignId={Number(id)}/>}
