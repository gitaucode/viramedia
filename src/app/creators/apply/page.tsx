import type { Metadata } from "next";import CreatorWizard from "@/components/CreatorWizard";
export const metadata:Metadata={title:"Creator Application",description:"Apply to join the Vira Network."};
export default function Apply(){return <div className="form-shell"><div className="form-head"><span className="page-kicker">// Creator Application</span><h1>Join Vira Network.</h1><p>This is an application, not automatic enrollment. We review creators manually and contact suitable profiles when relevant opportunities come up.</p></div><CreatorWizard/></div>}
