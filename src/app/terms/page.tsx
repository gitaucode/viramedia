import type { Metadata } from "next";
import { contact } from "@/data/site";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <article className="legal">
      <h1>Website Terms</h1>
      <p className="updated">LAST UPDATED: 20 AUGUST 2026</p>
      <p>These are basic website terms for the Vira Media site and should be reviewed against the agency&apos;s final legal entity, contracting process and launch configuration before publication.</p>
      <h2>Website content</h2>
      <p>Information on this site describes Vira&apos;s intended services and creator-network model. Specific campaign deliverables, prices, creator fees, media spend, timelines and usage rights are governed by the proposal or agreement issued for a project.</p>
      <h2>Creator applications</h2>
      <p>Submitting a creator application does not create an employment relationship, representation agreement, guarantee of enrollment, or guarantee of paid work. Campaign participation is subject to separate agreed terms.</p>
      <h2>Portfolio and examples</h2>
      <p>Where the website identifies an item as a representative concept, it should not be interpreted as a claim that the concept was a completed client campaign or achieved a stated performance result.</p>
      <h2>Intellectual property</h2>
      <p>Website branding, copy and original design elements belong to their respective rights holders. Client and creator content remains subject to the ownership and usage terms agreed for each project.</p>
      <h2>Contact</h2>
      <p>Questions can be sent to <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
    </article>
  );
}
