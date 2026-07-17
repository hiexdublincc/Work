# JMK Group CRM — Project TODO

## Product foundation

- [x] Define a refined light visual system with premium typography, spacing, colors, surfaces, shadows, focus states, and motion tokens.
- [x] Configure a responsive authenticated dashboard shell with persistent navigation and mobile behavior.
- [ ] Add polished loading, empty, error, confirmation, and success states for all primary workflows.
- [ ] Ensure all primary pages and dialogs are keyboard accessible and responsive.

## Access control and administration

- [x] Implement exactly two roles: Admin and User.
- [x] Enforce server-side role and record-ownership authorization on every protected CRM operation.
- [x] Allow Admin users to view and manage users, assignments, and system settings.
- [x] Restrict User accounts to records assigned to them.
- [x] Add an Admin-only user management view with role and active-status controls.
- [x] Add an Admin-only system settings view for organization defaults.

## Companies and contacts

- [x] Add archive actions and confirmation states to the existing Company and Contact detail workflows so their full CRUD checklists can close.
- [x] Add visible user-selectable, server-backed sort controls to Companies and Contacts and verify them in the desktop filter bars.

- [x] Implement Company records with full profile, ownership, contact details, address, industry, status, notes, and timestamps.
- [x] Implement Contact records with full profile, ownership, communication details, job details, address, status, notes, and timestamps.
- [x] Link Contacts to Companies and expose the relationship in list and detail views.
- [x] Add Company list, create, edit, detail, delete/archive, search, filter, sort, and pagination workflows.
- [x] Add Contact list, create, edit, detail, delete/archive, search, filter, sort, and pagination workflows.

## Leads

- [x] Implement Lead records with identity, source, company, contact details, owner, value, status, notes, and timestamps.
- [x] Add Lead capture/create and edit forms with validation.
- [x] Add Lead list, detail, search, filter, sort, and status tracking workflows.
- [x] Implement atomic Lead conversion into linked Company/Contact records as applicable and an Opportunity.
- [x] Preserve conversion history and prevent accidental duplicate conversion.

## Opportunities and pipeline

- [x] Implement Opportunity records with owner, linked company/contact/lead, value, probability, expected close date, stage, notes, and timestamps.
- [x] Use the exact pipeline stages: Prospecting, Qualified, Proposal, Negotiation, Closed Won, and Closed Lost.
- [x] Add Opportunity list, create, edit, detail, search, filter, sort, and stage controls.
- [x] Build a visual sales pipeline grouped by the exact stages with aggregate values.
- [x] Keep opportunity value and probability tracking consistent across pipeline, dashboard, and reports.

## Activities

- [x] Implement Activities supporting exactly tasks, calls, meetings, and notes.
- [x] Allow each Activity to attach to a Company, Contact, Lead, or Opportunity.
- [x] Support activity owner, title, description, due/start time, completion state, and timestamps.
- [x] Add Activity list, create, edit, detail, filters, overdue state, and completion controls.
- [x] Show related activities on every supported CRM record detail view.

## Dashboard and reporting

- [x] Build exactly four dashboard KPI cards: open leads, pipeline value, won deals, and overdue tasks.
- [x] Ensure KPI values honor Admin visibility and User assignment restrictions.
- [x] Add a sales funnel chart based on the exact opportunity stages.
- [ ] Add a Leads by Status reporting view.
- [ ] Add an Opportunities by Stage reporting view.
- [ ] Add an Activity Summary reporting view.
- [ ] Add a Revenue Forecasting reporting view using opportunity value and probability.
- [ ] Add meaningful reporting filters and clear no-data states.

## Data import and export

- [ ] Implement CSV import for Companies, Contacts, Leads, and Opportunities.
- [ ] Add CSV template guidance, validation, preview, row-level error reporting, and safe import confirmation.
- [ ] Enforce role and ownership rules during import.
- [ ] Implement CSV export for Companies, Contacts, Leads, and Opportunities.
- [ ] Ensure exports respect the current user's role, assignments, and applied filters.

## Quality and delivery

- [ ] Add or update Vitest coverage for authorization, CRUD validation, lead conversion, dashboard KPI calculations, reports, and CSV import/export.
- [x] Apply the CRM database migration and verify schema parity.
- [ ] Run the full TypeScript check, production build, and Vitest suite successfully.
- [ ] Verify the primary workflows in the live preview without critical browser or network errors.
- [ ] Visually review dashboard, lists, details, forms, pipeline, reports, imports, Admin pages, and mobile layouts.
- [ ] Review the full todo list and mark every completed item accurately.
- [ ] Create one final project checkpoint for the first complete delivery.

## Hotel group commercial CRM expansion

- [x] Preserve the exact required opportunity stages—Prospecting, Qualified, Proposal, Negotiation, Closed Won, and Closed Lost—while mapping hotel-specific process milestones through opportunity type, commercial status, and activity fields.
- [x] Preserve exactly four primary KPI cards labelled open leads, pipeline value, won deals, and overdue tasks on the principal dashboard.
- [x] Add a Property model for all JMK Group hotels and support one user being assigned to one or multiple properties.
- [x] Seed only the explicitly supplied JMK Group property names and user-property assignment structure without inventing business records, activity, pipeline, achievements, or performance data.
- [x] Add property-scoped authorization so Users can edit assigned-property records and the Admin/Group Director can view and report across all properties.
- [x] Add property and group-level read visibility for designated commercial updates without granting edit rights outside assignments.
- [x] Add hotel account categories: Corporate, Agency, Government, Tour operator, TMC, Event organiser, Crew, Extended stay, Meeting room client, and Conference lead.
- [x] Add hotel account fields for segment, property, destination city, lead source, preferred rate type, production history, potential room nights, potential revenue, relationship status, last activity, and next follow-up.
- [x] Add hotel opportunity types: Corporate account, Group booking, LNR, RFP, Tour series, Crew, Long stay, Meeting room booking, and Conference or event.
- [x] Add hotel opportunity fields for property, stay/event dates, room nights, ADR/rate, source, hotel-commercial status, and mandatory next action.
- [x] Enforce that every Opportunity has an owner, property, exact pipeline stage, and next action.
- [x] Expand fast activity logging for calls, emails, meetings, appointments, site visits/showarounds, webinars, sales trips, events, proposals, RFP actions, contracts, achievements, weekly updates, and follow-ups.
- [x] Add a chronological activity timeline linked to user, property, account/contact, and optional opportunity.
- [x] Add a shared commercial calendar with user, property, activity-type, and date-range filters.
- [x] Add Personal, Property, and Group dashboard scopes with permission-aware visibility.
- [x] Add dashboard sections for today’s appointments, upcoming calls and meetings, follow-ups, open enquiries, key wins, business potential, recent activity, achievements, calendar highlights, and weekly property summaries.
- [x] Add structured Weekly Commercial Updates covering key wins, business potential, key activity, corporate updates, group updates, events/trade activity, completed actions, and next-week priorities.
- [ ] Roll weekly updates into property-level reports and a group-level commercial summary.
- [x] Add an Achievements tracker with month, organisation/activity, potential value, average rate, property, city, notes, and supplied achievement statuses.
- [x] Build the responsive Achievements list, filters, create/edit form, detail sheet, status controls, and archive action against the existing property-scoped API.
- [ ] Add hotel reports by user, property, group, month, segment, opportunity type, and status.
- [ ] Add hotel commercial metrics for calls, emails, meetings, site visits, events, RFPs, wins/losses, potential and confirmed revenue, potential and confirmed room nights, achievements by property, and user activity levels.
- [ ] Make the most common activity, task, opportunity, weekly-update, and achievement actions reachable within one or two interactions.
- [ ] Produce an in-project product handover covering the full requirements, MVP definition, database schema, permissions, workflows, screens, reports, suggested automations, and future enhancements.

## Advanced hotel sales intelligence and adoption requirements

- [x] Add automatic Company Account Health with exactly Healthy, Needs Attention, and At Risk states based on practical CRM signals.
- [x] Surface account-health reasons and prioritised accounts needing attention without requiring manual status maintenance.
- [x] Require a standard lost reason whenever an Opportunity moves to Closed Lost while preserving the exact required pipeline stages.
- [x] Add the supplied lost-reason taxonomy, optional loss comments, competitor context, and stage-at-loss audit data.
- [ ] Add lost-business analysis by property, segment, competitor, lost reason, opportunity type, and stage at loss.
- [x] Add a global Quick Add control visible throughout the authenticated app for calls, emails, meetings, site visits, Opportunities, Companies, Contacts, and tasks.
- [x] Make Quick Add and primary create flows lightweight, prefilled where safe, and reachable in one or two interactions.
- [ ] Convert long record forms to progressive disclosure with essential fields first and expandable commercial details, more details, and notes sections.
- [ ] Add a shared accessible progressive-form section and apply it to long Company, Contact, Lead, Opportunity, Activity, Weekly Update, and Achievement editors without hiding required fields.
- [x] Add duplicate Company and Contact checks with non-blocking warnings before save.
- [x] Add account contract start and expiry dates, Opportunity competitor hotel, referral source, and other confirmed hotel-commercial fields.
- [x] Add smart dashboard alerts for stale accounts, overdue follow-ups, stale Opportunities, expiring contracts, proposals awaiting response, at-risk accounts, and stages with excessive age.
- [ ] Add a Cross-Property Referral workflow tracking referring and receiving properties, status, revenue, room nights, notes, original owner, and current owner.
- [ ] Add a searchable Competitor Intelligence module linked to Companies and Opportunities with rate, client feedback, strengths, weaknesses, notes, and capture date.
- [ ] Add property Hotel Knowledge pages for overview, facilities, meeting capacity, parking, selling points, sales contacts, and approved collateral metadata.
- [x] Store uploaded hotel collateral in managed object storage rather than the application filesystem or database.
- [x] Add Day, Week, and Month commercial calendar views while retaining role-aware user, property, activity-type, and date-range filters.
- [ ] Add automatic Weekly Commercial Update draft generation from the user’s activities, Opportunities, and Achievements for the selected week.
- [ ] Add cross-property referral and competitor intelligence reporting dimensions.
- [ ] Add hotel-knowledge and group collaboration navigation without making daily CRM navigation feel crowded.
- [ ] Add safe remembered-recent selectors and activity templates where they materially reduce repeated data entry.

## JMK brand system and hotel identities

- [x] Establish a restrained JMK Group light-interface palette and component styling from the supplied corporate identity while preserving accessible contrast and the existing professional internal-tool hierarchy.
- [x] Upload the supplied JMK Group and hotel-brand logo files to managed web assets and reference only their durable deployment URLs.
- [x] Create a central property-to-brand identity map covering JMK Group, Home2 Suites by Hilton, Holiday Inn Express by IHG, Residence Inn by Marriott, Aloft Hotels, Hampton by Hilton, and Moxy Hotels.
- [x] Apply the JMK Group identity to authenticated navigation, mobile header, page-level identity areas, and sign-in/loading states with restrained logo sizing.
- [x] Apply relevant hotel logos and brand accents to the property-scoped dashboard, hotel-view identity areas, portfolio strip, and compact commercial cards without creating visual clutter.
- [x] Verify supplied logos on light and dark-tinted surfaces, normalize their visible bounds where necessary, and add accessible alt text and fallbacks.
- [x] Run desktop visual QA after branding to confirm a clean, modern, simple, professional internal-tool aesthetic.
- [x] Run mobile visual QA after branding and correct any responsive logo or identity issues.
- [x] Review captured 390×844 mobile screenshots for Dashboard, Companies, and Weekly Updates; verify logo legibility, header spacing, property-brand presentation, controls, and empty states.
- [x] Re-run mobile visual QA after replacing the text-only compact header with the supplied JMK Group mark and confirm no overlap with quick-add or Admin controls.

## Uniform hotel-logo refinement

- [x] Standardise all hotel-brand logos to the same fixed container dimensions, white background, border, corner radius, and internal padding.
- [x] Normalise each hotel logo’s visible artwork scale so no brand appears disproportionately large or small, using the supplied Moxy artwork as the reference.
- [x] Verify the uniform logo system on desktop and mobile portfolio, property-header, and commercial-card surfaces.
- [x] Re-run TypeScript, Vitest, and the production build after the logo refinement.
- [x] Run explicit desktop visual QA on Companies and Weekly Updates after the uniform-logo update; confirm current empty states remain clean and verify populated property headers, list rows, detail cards, and weekly-update cards all inherit the same shared PropertyLogo/PropertyIdentity tile without local sizing overrides.
