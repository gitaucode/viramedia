# Vira Media

Next.js website for **Vira Media**, a Kenya-focused creator marketing and short-form creative agency.

## Brand architecture

- **Vira Media**: B2B agency for brands
- **Vira Network**: vetted creator network for paid UGC and creator-led campaigns

V1 is intentionally manual. There is no CRM, marketplace, creator login, or database. Brand enquiries and creator applications are delivered by email for manual review.

## Routes

- `/` brand-focused homepage
- `/services` services for businesses
- `/work` short-form campaign concepts / future case studies
- `/creators` Vira Network landing page
- `/creators/apply` five-step creator application wizard
- `/about`
- `/contact` brand campaign brief
- `/privacy`
- `/terms`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Email forms

Both the brand enquiry form and creator application POST to Next.js Route Handlers and send a formatted email using Resend.

1. Copy `.env.example` to `.env.local`.
2. Add your Resend API key.
3. Set `VIRA_INBOX` to the inbox that should receive applications and briefs.
4. Set `VIRA_FROM_EMAIL` to an address on a domain verified in Resend.
5. Add the public phone, WhatsApp and email values.

```env
RESEND_API_KEY=
VIRA_INBOX=hello@viramedia.co.ke
VIRA_FROM_EMAIL="Vira Website <website@your-verified-domain.co.ke>"
NEXT_PUBLIC_VIRA_WHATSAPP=254700000000
NEXT_PUBLIC_VIRA_PHONE=+254700000000
NEXT_PUBLIC_VIRA_EMAIL=hello@viramedia.co.ke
```

The code also accepts the previous `NOMA_*` environment variable names as fallbacks so an existing local configuration does not immediately break during the rename.

## Creator workflow in V1

Creator applies → Vira receives the application by email → manual review → approved creators can be tracked in a Google Sheet until manual coordination becomes a bottleneck.

The wizard saves an unfinished draft in the browser's local storage and clears it after successful submission.

## Before launch

- Replace placeholder phone / WhatsApp values.
- Use an email/domain you actually control.
- Verify `VIRA_FROM_EMAIL` in Resend.
- Replace representative campaign concepts with verified client work as it becomes available.
- Have the privacy and terms pages reviewed for your final legal entity and production data practices.
