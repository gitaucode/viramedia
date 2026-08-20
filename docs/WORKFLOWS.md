# Vira Media Workflows

## 1. Lead to campaign

1. A brand submits a campaign enquiry through the public contact form.
2. The enquiry is stored as a lead and can also be delivered by email.
3. Vira reviews and updates the lead status.
4. A qualified lead can be converted into a campaign.
5. Campaign details include name, client, objective, budget, dates, creator-facing brief and internal notes.

Recommended lead states:
- `new`
- `contacted`
- `qualified`
- `converted`
- `lost`

## 2. Creator application and approval

1. A creator submits the multi-step creator application.
2. The creator record enters the directory with a review status.
3. Vira reviews the profile, social handles, audience data, niches, formats, rate expectations and experience.
4. Creator status is moved to approved when they are accepted into Vira Network.
5. Only approved creators may authenticate into the creator portal and be assigned to campaigns.

## 3. Client account setup

1. Vira creates a client account with company, contact name, email and phone.
2. The client is linked to one or more campaigns through `campaign_clients`.
3. Linking a client may trigger a portal-access notification.
4. The client signs in using an emailed one-time code.
5. Client access must always be scoped to linked campaigns only.

## 4. Creator assignment

1. Vira opens a campaign.
2. One or more approved creators are assigned.
3. Assignment is recorded in the campaign-creator join table.
4. A newly assigned creator receives an email notification.
5. Removing a creator also unassigns that creator from campaign deliverables.

## 5. Deliverable creation

For each required piece of work Vira creates a deliverable with:
- title;
- assigned creator;
- due date;
- instructions;
- status;
- creator fee;
- payment status.

Recommended lifecycle:

`pending → in_progress → submitted → changes_requested → submitted → approved → done`

A deliverable may skip `changes_requested` if the first submission is approved.

## 6. Creator submission

Current model stores:
- submission URL;
- submission note;
- submitted timestamp.

Planned improvement: move to versioned `deliverable_submissions` so resubmissions do not overwrite history.

## 7. Internal review

1. Creator submits content.
2. Vira reviews it before the client sees it.
3. Vira either:
   - requests changes with feedback; or
   - approves internally.
4. Status change emails notify the creator.

Important rule: content should not be shared with a client before it is internally approved or marked done.

## 8. Client review

1. Vira explicitly shares an internally approved deliverable with the client.
2. Client sees only content in a client-visible approval state.
3. Client can approve or request changes.
4. Client feedback is stored separately from internal creator feedback.
5. Client review timestamps should be retained for campaign history.

Client approval states:
- `not_ready`
- `awaiting_client`
- `approved`
- `changes_requested`

## 9. Performance reporting

1. Vira records performance metrics per deliverable.
2. Metrics may include views, reach, impressions, likes, comments, shares, saves, clicks, conversions and spend.
3. Campaign reporting aggregates shared/approved content only where appropriate.
4. Vira adds narrative reporting:
   - client objective;
   - executive summary;
   - insights;
   - recommendations.
5. A PDF report may be generated for client delivery.

Planned improvement: add metric snapshots over time rather than one mutable metric row per deliverable.

## 10. Creator payment

Current model tracks payment information on each deliverable:
- creator fee;
- payment status;
- payment date;
- payment reference.

Current states:
- `not_set`
- `pending`
- `paid`

Planned improvement: introduce payout records so one payment can settle multiple deliverables.

## 11. Deadline reminders

A Cloudflare scheduled job checks deliverables due the following day. Eligible creators receive a deadline reminder email. A notification log prevents duplicate sends for the same deliverable/deadline combination.

## 12. Campaign completion

A campaign is ready to complete when:
- required deliverables are approved/done;
- client approvals are resolved;
- required performance data is captured;
- creator payments are resolved or explicitly tracked;
- report narrative is complete;
- final report is generated/delivered.

Recommended final campaign state: `complete`.
