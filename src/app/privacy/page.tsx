import type { Metadata } from "next";
import { contact } from "@/data/site";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <article className="legal">
      <h1>Privacy</h1>
      <p className="updated">LAST UPDATED: 20 AUGUST 2026</p>
      <p>This page describes the information Vira Media may receive through this website and how it may be used. It should be reviewed before public launch and updated if Vira changes how applications, analytics or customer data are handled.</p>
      <h2>Information you submit</h2>
      <p>Brand enquiry forms may include your name, company, contact details, budget range and project information. Creator applications may include contact details, location, social profiles, audience information, content niches, rates, prior brand work and campaign preferences.</p>
      <h2>How submissions are used</h2>
      <p>Submitted information is used to review enquiries or creator applications, respond to you, plan potential campaigns and maintain internal business records. In the initial version of this website, form submissions are designed to be delivered to Vira by email rather than stored in a public creator marketplace.</p>
      <h2>Creator applications</h2>
      <p>Applying does not guarantee acceptance into Vira Network or paid work. Information supplied in an application may be used to assess fit for present or future campaign opportunities.</p>
      <h2>Third-party services</h2>
      <p>The site may rely on infrastructure or email-delivery providers to operate forms and host the website. Their processing is subject to the services Vira actually configures for production.</p>
      <h2>Your choices</h2>
      <p>You may contact Vira to ask about information you previously submitted or request an update or deletion where appropriate.</p>
      <h2>Contact</h2>
      <p>Privacy questions can be sent to <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
    </article>
  );
}
