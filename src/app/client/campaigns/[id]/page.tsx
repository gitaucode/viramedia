import ClientCampaign from "@/components/client/ClientCampaign";
export const dynamic='force-dynamic';
export default async function ClientCampaignPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ClientCampaign campaignId={Number(id)}/>}
