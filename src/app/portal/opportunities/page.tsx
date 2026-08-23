import type { Metadata } from "next";
import PortalOpportunities from "@/components/portal/PortalOpportunities";
export const metadata:Metadata={title:"Opportunities | Vira Network",robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function OpportunitiesPage(){return <PortalOpportunities/>}
