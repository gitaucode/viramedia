# Vira Editorial Design System

Status: **Source of truth for all ViraMedia UI work**

This document defines the visual language, component rules, theme behavior, spacing, typography, and implementation constraints for ViraMedia. New UI should follow this system instead of introducing page-specific visual conventions.

## 1. Design principle

Vira has two expressions of one brand:

- **Public Vira:** bold, social-first, energetic, creator-led.
- **Vira Workspace:** calm, editorial, warm, professional.

The guiding principle is:

> **Vira outside = attention. Vira inside = clarity.**

Public marketing pages can be expressive. Vira Ops, Client Portal, and Creator Portal should reduce cognitive load and help people understand what to do next.

## 2. Product surfaces

### Public Vira

Routes outside `/admin`, `/client`, and `/portal`.

Goals:
- strong brand expression
- creator imagery
- large editorial headlines
- confident motion and contrast
- clear conversion paths

The public site remains primarily dark unless a future public-site redesign explicitly changes that direction.

### Vira Workspace

Includes:
- Vira Ops
- Client Portal
- Creator Portal

Goals:
- calm, readable, approachable
- lower visual noise
- clear hierarchy
- progressive disclosure
- action-oriented dashboards
- accessible light and dark themes

## 3. Typography

### Space Grotesk

Primary product typeface.

Use for:
- workspace navigation
- page titles
- section headings
- body copy
- forms
- tables
- buttons
- cards

### Anton

Marketing display typeface only.

Use for:
- public hero headlines
- campaign statements
- selective promotional headings

Do not use Anton as a normal Vira Workspace heading font.

### JetBrains Mono

Use sparingly for technical data only.

Appropriate uses:
- IDs
- code-like values
- selected timestamps
- technical metadata

Do not use monospace for routine labels, navigation, or every section eyebrow.

## 4. Writing style inside the product

Use sentence case by default.

Preferred:
- Campaign details
- Needs attention
- Client access
- In review
- Start date

Avoid:
- CAMPAIGN DETAILS
- NEEDS ATTENTION
- CLIENT ACCESS
- IN_REVIEW

Uppercase may be used selectively for the small VIRA OPS / VIRA NETWORK brand tag, not as the default interface language.

## 5. Brand colours

### Brand accents

- Vira Orange: `#FF5A1F`
- Vira Cyan: `#25D9D4`

Orange is the primary workspace action colour.

Use orange for:
- primary actions
- selected emphasis
- important brand moments
- limited attention indicators

Use cyan for:
- creator/network contexts
- informational highlights
- selected links
- secondary brand accents

Do not use accent colours as general decoration.

## 6. Workspace themes

### Theme modes

Supported modes:
- System
- Light
- Dark

Default: **System**.

The theme control is one icon button that cycles:

`System → Light → Dark → System`

Icons:
- System: monitor/device icon
- Light: sun icon
- Dark: moon icon

The button must expose an accessible `aria-label` and tooltip/title describing the current mode.

### Light theme

- Background: `#F6F6F2`
- Surface: `#FFFFFF`
- Soft surface: `#F1F1EC`
- Raised/selected surface: `#E9E9E2`
- Primary text: `#1D1D1A`
- Secondary text: `#686861`
- Tertiary text: `#8A8A82`
- Border: `rgba(24,24,20,.08)`
- Strong border: `rgba(24,24,20,.14)`

Light mode should feel warm and editorial, not sterile white.

### Dark theme

- Background: `#11120F`
- Surface: `#181915`
- Soft surface: `#20211C`
- Raised/selected surface: `#272821`
- Primary text: `#F5F3EC`
- Secondary text: `#A4A39B`
- Tertiary text: `#7F7E77`
- Border: `rgba(245,243,236,.08)`
- Strong border: `rgba(245,243,236,.13)`

Avoid pure black as the main application background.

## 7. Shape language

Use one consistent radius system:

- Cards: `12px`
- Dense cards: `10px`
- Inputs/selects/textareas: `9px`
- Buttons: `9px`
- Drawers/modals: `16px`
- Pills/statuses: `999px`

Avoid both extremes:
- sharp rectangular control-room UI
- overly rounded/bubbly consumer SaaS UI

Vira should remain editorial and professional.

## 8. Spacing system

Use this spacing scale:

- `4px`
- `8px`
- `12px`
- `16px`
- `24px`
- `32px`
- `48px`
- `64px`

Do not introduce arbitrary spacing values unless a component genuinely requires one.

Defaults:
- Standard card padding: `24px`
- Dense card padding: `16px`
- Form field gap: `16px`
- Related content gap: `12px` or `16px`
- Section gap: `32px`
- Major section gap: `48px`
- Workspace page top/bottom: `48–64px`

## 9. Hierarchy

A workspace page should answer:

> **What should I understand or do next?**

Prefer contextual information over raw database counts.

For dashboards:
1. Page purpose / greeting
2. What needs attention
3. Current work
4. Upcoming work
5. Secondary statistics

Do not make every metric equally prominent.

## 10. Cards and borders

Cards represent meaningful groups, not every piece of information.

Use cards for:
- campaign summaries
- creator summaries
- grouped workflow information
- primary dashboard groups

Avoid nested card-on-card-on-card layouts.

Within a card, prefer:
- whitespace
- typography
- subtle dividers

rather than another bordered box.

Borders should be subtle and structural. Spacing should do most of the separation work.

## 11. Status system

Use one semantic status language across Ops, Client, and Creator surfaces.

### Green
Completed / Approved / Paid / Ready

### Amber
Planning / Pending / In progress

### Blue or cyan
Submitted / In review / Awaiting client

### Red
Changes requested / Failed / Overdue / Cancelled

### Grey
Draft / Not started / Neutral

Status text is always sentence case.

Examples:
- Planning
- In progress
- In review
- Awaiting client
- Changes requested
- Paid

## 12. Navigation

### Public site

Keep marketing navigation simple and conversion-focused.

### Vira Workspace

Current top navigation is appropriate while the number of primary sections remains manageable.

Vira Ops primary sections:
- Overview
- Leads
- Campaigns
- Reporting
- Clients
- Creators

Utility actions belong on the right:
- theme icon
- View site
- Log out

Theme controls must stay visually quiet.

A sidebar should only be introduced when information architecture genuinely outgrows the top navigation.

## 13. Core reusable components

New workspace UI should compose shared primitives rather than creating new one-off visual systems.

Target component set:

- AppHeader
- PageHeader
- SectionHeader
- Card
- MetricCard
- StatusPill
- Button
- IconButton
- Input
- Select
- Textarea
- Tabs
- EmptyState
- DataTable
- Drawer
- Modal
- Toast
- ThemeButton
- Avatar

A new screen should not invent a new card, input, status, or tab style if a shared primitive already exists.

## 14. Campaign Workspace rules

Campaign Workspace should feel like an operating document, not a database console.

Preferred hierarchy:

1. Campaign title, client, dates, status
2. Progress and immediate operational summary
3. Needs attention
4. Campaign brief
5. Client access
6. Creator and deliverable workflows
7. Performance / finance / reporting

Tabs use sentence case and a soft selected surface rather than heavy underline treatments.

Avoid showing every possible detail at equal visual weight.

## 15. Empty states

Empty states should explain what belongs in the area and, where useful, provide a next action.

Preferred:

> Your campaigns will appear here once you create or convert a lead.

Avoid purely technical emptiness where a short explanation would help.

## 16. Buttons

### Primary
Orange background, white text.

Use only for the main action in a context.

### Secondary
Soft surface, normal text, subtle border.

### Ghost/text
For low-priority actions such as View all, Back, Remove when appropriate.

Do not create several equally loud primary buttons in one view.

## 17. Forms

Forms should feel calm and readable.

Rules:
- sentence-case labels
- labels above controls
- minimum comfortable input height
- supporting text only when useful
- clear focus ring
- errors near the relevant control
- group related fields visually
- avoid dense spreadsheet-style forms unless the task truly requires it

## 18. Responsive behavior

Desktop should not be treated as the only design target.

Workspace rules:
- navigation remains usable at tablet widths
- grids collapse intentionally, not accidentally
- controls remain at least touch-friendly
- tables may hide secondary columns or switch representation
- tabs may scroll horizontally
- no clipped financial/date fields

## 19. CSS architecture

### Public marketing

`globals.css` owns the public Vira marketing design.

### Workspace

`workspace.css` is the canonical theme/design layer for:
- `/admin`
- `/client`
- `/portal`

Legacy route CSS may retain layout- or feature-specific selectors during migration, but it must not introduce new hard-coded theme colours or a competing spacing/radius system.

### Forbidden going forward

Do not create additional files such as:
- `*-polish.css`
- `*-fix.css`
- `*-soft.css`
- page-specific theme override sheets

If the design system needs a change, update the canonical tokens/components instead.

## 20. Implementation rule

Every UI decision should pass this test:

> **Does this look like Vira Editorial, or did we only make this one page look good?**

If the answer is the latter, do not ship it.

## 21. Migration plan

1. Consolidate experimental workspace overrides into `workspace.css`.
2. Replace segmented System/Light/Dark control with the single cycling ThemeButton.
3. Keep public site visuals separate from workspace visuals.
4. Migrate Vira Ops screens to shared components/tokens.
5. Migrate Campaign Workspace.
6. Migrate Client Portal.
7. Migrate Creator Portal.
8. Refine public site using the public expression of Vira Editorial.
9. Remove obsolete CSS only after affected routes are verified.

## 22. Design review checklist

Before shipping a UI change, verify:

- Uses Space Grotesk inside workspaces
- Sentence-case labels
- Uses semantic theme tokens, not hard-coded black/white UI colours
- Uses spacing scale
- Uses standard radii
- No unnecessary nested cards
- Primary action is obvious
- Status colour and copy are semantic
- Light and dark modes both work
- System mode follows OS preference
- Mobile/tablet layout is usable
- No clipped controls or text
- Empty state is understandable
- New styles belong to the design system rather than a local patch
