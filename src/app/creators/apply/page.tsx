import type { Metadata } from "next";import CreatorWizard from "@/components/CreatorWizard";
export const metadata:Metadata={title:"Creator Application",description:"Join the Vira Network."};
export default function Apply(){return <div className="form-shell"><div className="form-head"><span className="page-kicker">// Join Vira Network</span><h1>Show us what you make.</h1><p>Tell us about your content, audience and the kind of brand work you would love to do. If a campaign feels like a good fit, we will get in touch.</p></div><CreatorWizard/></div>}
