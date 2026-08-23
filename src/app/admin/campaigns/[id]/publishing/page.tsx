import PublishingPanel from "@/components/admin/PublishingPanel";

export default async function CampaignPublishingPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <PublishingPanel campaignId={Number(id)}/>;
}
