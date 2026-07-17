# JMK Group Hotel Commercial CRM

## Product Requirements and MVP Definition

**Author:** Manus AI  
**Status:** Build baseline  
**Product:** JMK Group Commercial CRM

## 1. Product vision

JMK Group Commercial CRM is a focused, multi-property sales workspace for hotel commercial teams. It replaces the broad, configuration-heavy experience of a generic CRM with a faster operating system for daily account development, hotel enquiries, relationship activity, pipeline management, follow-ups, weekly commercial updates, and group-level visibility.

The application must be useful during the working day, not merely at reporting time. Common actions—logging a call, creating a follow-up, updating an opportunity, recording a win, or submitting a weekly update—must be reachable within one or two interactions from the relevant view. Structured fields provide reliable reporting, while concise notes and timelines preserve the context salespeople need.

## 2. Confirmed operating structure

The initial operating model contains five named sales users and seven named properties. These names may be configured as the initial organisation structure, but the application must not invent customer records, performance data, achievements, activities, testimonials, or pipeline entries.

| User | Responsibility | Access intent |
|---|---|---|
| Laura Gornet | Holiday Inn Express Dublin City Centre | Assigned property |
| Aideen O'Flynn | Moxy Cork; Residence Inn Cork | Assigned properties |
| Danielle McGinley | Aloft Belfast; Residence Inn Belfast | Assigned properties |
| Diana Riquel | Hampton by Hilton Dublin City Centre; Home2 Suites Dublin City Centre | Assigned properties |
| Wendy White | Group Director of Sales | All properties and group reporting |

The two application roles remain exactly **Admin** and **User**. Property assignments provide the finer operational boundary. The Group Director is represented by the Admin role and all-property visibility; salespeople are Users assigned to one or more properties.

## 3. Requirement reconciliation

The original platform brief fixed six opportunity pipeline stages and four dashboard KPI cards. The hotel-commercial brief introduced additional operational milestones and dashboard modules. The build resolves these requirements without replacing either intent.

| Area | Fixed product rule | Hotel-specific implementation |
|---|---|---|
| Pipeline stage | Exactly Prospecting, Qualified, Proposal, Negotiation, Closed Won, Closed Lost | Additional milestones such as RFP submitted, on option, contracted, and rate loaded are represented by **commercial status**, activity types, and next action—not extra pipeline stages. |
| Primary KPI row | Exactly open leads, pipeline value, won deals, overdue tasks | Personal, Property, and Group dashboards retain this exact four-card row, then provide hotel-specific operational sections below it. |
| Roles | Exactly Admin and User | Property assignments and read/edit scopes add hotel-level control without adding a third role. |
| Core activities | Tasks, calls, meetings, notes | Hotel action templates classify fast logging more specifically while each event remains a task, call, meeting, or note at the core activity layer. |
| Core records | Companies, Contacts, Leads, Opportunities | Properties, Weekly Updates, Achievements, and Calendar views specialise the CRM for hotel commercial work. |

## 4. Product goals

The product must improve **speed**, **visibility**, **accountability**, and **reporting consistency**. It should reduce duplicate weekly reporting work by deriving summaries from structured activity, opportunity, achievement, and update records. It should make ownership and next actions visible at account and opportunity level, highlight overdue work, and give the Group Director a reliable cross-property view without allowing users to modify records outside their assigned properties.

## 5. Access and permission model

| Capability | User | Admin / Group Director |
|---|---|---|
| View assigned-property records | Yes | Yes |
| Create and edit assigned-property records | Yes | Yes |
| View records for unassigned properties | No, except designated group-visible updates | Yes |
| Edit records for unassigned properties | No | Yes |
| View personal dashboard | Yes | Yes |
| View assigned property dashboard | Yes | Yes |
| View group summary | Read-only selected updates where enabled | Full |
| Manage users and assignments | No | Yes |
| Manage properties and system settings | No | Yes |
| Import and export | Assigned scope | Group or filtered scope |

All record access must be enforced on the server. Hiding interface controls is not sufficient. Every create, read, update, delete, conversion, import, export, dashboard, and report procedure must apply role and property scope before returning or changing data.

## 6. Core information architecture

| Navigation area | Purpose |
|---|---|
| My dashboard | Personal KPIs, appointments, follow-ups, opportunities, activity, and calendar highlights |
| Group dashboard | Cross-property summaries, movement, wins, weekly updates, and selected activity |
| Calendar | Shared commercial schedule with user, property, type, and date filters |
| Accounts | Companies, agencies, corporate accounts, and other customer organisations |
| Contacts | People linked to accounts and properties |
| Leads | Early-stage corporate and commercial enquiries with conversion workflow |
| Opportunities | Hotel-commercial pipeline and forecastable business |
| Activities | Searchable timeline and fast logging for sales work |
| Weekly updates | Structured commercial reporting by property and week |
| Achievements | Dedicated wins and commercial achievements tracker |
| Reports | User, property, group, segment, activity, pipeline, revenue, and room-night analysis |
| Data studio | CSV templates, validation, preview, import, and export |
| Administration | Users, property assignments, properties, and organisation settings |

## 7. Core records

### 7.1 Properties and assignments

A Property represents a hotel in the JMK Group portfolio. It stores name, brand, city, country, code, active state, and timestamps. A many-to-many User Property Assignment grants Users access to one or more properties. Admins have group access independently of assignment.

### 7.2 Accounts and contacts

Companies represent corporate accounts, agencies, government organisations, tour operators, TMCs, event organisers, crew clients, extended-stay clients, meeting-room clients, and conference leads. Alongside core identity and address data, the hotel profile includes segment, property, destination city, lead source, preferred rate type, production history, potential room nights, potential revenue, relationship status, last activity, and next follow-up.

Contacts remain people linked to accounts. They include role, department, communication details, relationship notes, owner, property, status, and timestamps.

### 7.3 Leads and opportunities

Leads capture unqualified or early-stage enquiries. Conversion creates or links an Account, creates or links a Contact when appropriate, and creates an Opportunity in one transaction. Duplicate conversion is blocked and conversion history is retained.

Every Opportunity must have an owner, property, pipeline stage, and next action. It also stores account, contact, originating lead, business type, hotel-commercial status, start and end dates, room nights, ADR/rate, value, probability, source, expected close date, notes, and timestamps.

The opportunity types are Corporate account, Group booking, LNR, RFP, Tour series, Crew, Long stay, Meeting room booking, and Conference or event.

### 7.4 Activities, tasks, and calendar

Activities use the four core types task, call, meeting, and note. A hotel action subtype records the practical sales event, including call made, email sent, meeting held, appointment booked, site visit/showaround, webinar attended, sales trip, event attended, follow-up completed, proposal sent, RFP received/submitted, contract signed, achievement/win logged, and weekly update logged.

Each Activity links to an owner and property, with optional account, contact, lead, and opportunity references. Tasks include due date, reminder, priority, status, and completion details. Calendar-compatible activity records include start and end times. Every account detail view shows last activity and next follow-up; every account and opportunity timeline is chronological.

### 7.5 Weekly updates and achievements

Weekly Updates are structured by property, owner, and week commencing date. Sections cover key wins, business potential, key activity, corporate updates, group updates, event/trade activity, completed commercial actions, and priorities for next week. Updates support draft and submitted states plus a group-visible flag. Submitted records feed Property and Group summaries.

Achievements store month, organisation/activity, potential value, average rate, property, city, notes, owner, and status. Supported statuses include Confirmed, RFP accepted, Declined, Contracted, Proposal sent, and On option.

## 8. Dashboard model

Every dashboard scope begins with the same exact KPI row: **open leads**, **pipeline value**, **won deals**, and **overdue tasks**. Values are calculated from the viewer’s authorised scope and any selected property filter.

| Dashboard | Additional sections |
|---|---|
| Personal | Today’s appointments, upcoming calls and meetings, follow-ups due, recent activity, owned opportunity movement, calendar highlights |
| Property | Open enquiries, pipeline by exact stage, key wins, business potential, achievements, weekly property summary |
| Group | Cross-property pipeline movement, selected activity summaries, key wins, achievements, weekly commercial summaries, property comparison |

The sales funnel uses exactly Prospecting, Qualified, Proposal, Negotiation, Closed Won, and Closed Lost in that order.

## 9. Reporting requirements

Reports must support filters for user, property, group, month, segment, opportunity type, stage/status, and date range where applicable. Visibility always follows the same permission service as operational screens.

| Report family | Measures |
|---|---|
| Pipeline and forecast | Opportunities by stage/type, gross value, weighted value, confirmed revenue, potential revenue, wins/losses |
| Hotel production potential | Potential and confirmed room nights, ADR/rate, value by property and business type |
| Activity | Calls, emails, meetings, site visits, events, RFPs received/submitted, task completion, overdue follow-ups |
| Performance | Achievements by property, user activity levels, account coverage, inactive accounts, pipeline movement |
| Weekly commercial | Property update completeness, wins, business potential, actions, and next-week priorities |

## 10. MVP definition

The MVP is the smallest release that can support daily selling and replace the main manual reporting workflow. It includes secure login; Admin and User roles; property assignments; Accounts, Contacts, Leads, Opportunities, Activities, and Tasks; exact stages; exact KPI row; personal and group-aware dashboards; fast activity logging; shared calendar; Weekly Updates; Achievements; core reports; CSV import/export; Admin user/property management; responsive design; and audited server-side permission checks.

Advanced automation, email/calendar synchronisation, automatic reminders, document generation, revenue-management integrations, and duplicate intelligence are valuable future capabilities, but they must not delay reliable core workflows.

## 11. Key workflows

### Account development

A salesperson creates or finds an account, links it to an assigned property, adds contacts, logs an interaction, and sets a next follow-up. The account timeline immediately shows the event and the record’s last-activity date. The salesperson can create an Opportunity without leaving the account context.

### Enquiry to won business

A salesperson captures a Lead, qualifies it, and converts it transactionally into an Account, Contact, and Opportunity. The Opportunity is assigned to a property and owner, begins in one of the exact stages, and requires a next action. Stage, probability, value, room nights, rate, status, and timeline activity are updated as work progresses.

### Fast activity logging

A salesperson selects Quick add from any workspace, chooses the practical hotel action, links the property and relevant account/opportunity, adds a short outcome, and optionally schedules the next task. The flow should minimise required typing and preselect the user’s current property where unambiguous.

### Weekly reporting

A salesperson opens the current property/week update, reviews relevant activities and achievements, completes the structured narrative fields, and submits. Property and Group dashboard summaries refresh from submitted content. The Group Director can compare properties and review missing updates.

## 12. Suggested future automations

| Automation | Trigger | Outcome |
|---|---|---|
| Follow-up creation | Activity logged with next action | Create an owned task with due date |
| Stale-account alert | No activity within configured period | Surface account on dashboard and notify owner |
| Weekly update reminder | Configured weekday and incomplete update | Notify assigned salesperson |
| RFP deadline reminder | Opportunity commercial status is RFP and deadline approaches | Escalate on personal and property dashboard |
| Pipeline hygiene | Opportunity has no next action or overdue next action | Flag record and include in weekly summary |
| Calendar sync | Future integration | Synchronise appointments and meetings with Microsoft 365 or Google Workspace |

Scheduled or integration-backed automation is intentionally a future phase unless separately configured. The MVP models the data needed for these automations without introducing unreliable background behavior.

## 13. Future enhancements

Future releases may add Microsoft 365 or Google calendar and email synchronisation, automatic email capture, proposal and contract document storage, electronic signature, rate-loading integrations, PMS/CRS/RMS data connections, account production feeds, saved views, territory planning, duplicate detection, AI-assisted weekly summaries, mobile push reminders, and richer audit history.

## 14. Acceptance principles

The product is acceptable when a User can only modify records belonging to assigned properties; the Admin can manage users, assignments, properties, and group reporting; every Opportunity has an owner, property, exact stage, and next action; account and opportunity timelines accurately reflect activity; the four exact dashboard KPIs remain prominent; weekly property updates roll into group visibility; CSV import/export respects scope; and the key workflows are usable on desktop and mobile with clear loading, empty, validation, success, and error states.

## 15. Adoption-first interaction model

Every workspace must prioritise the action a hotel salesperson is most likely to take in the next thirty seconds. The authenticated shell therefore provides a persistent **Quick Add** control for calls, emails, meetings, site visits, Opportunities, Companies, Contacts, and tasks. The create experience begins with essential fields and uses progressive disclosure for commercial details, additional notes, and less-frequently used profile data. Saved filters, search, recent selections, practical templates, quick note capture, and clear next actions reduce repetitive administration.

| Interaction principle | Required behaviour |
|---|---|
| One- or two-action entry | Common logging and create actions open directly from global or contextual controls. |
| Progressive disclosure | Identity, ownership, property, stage/status, and next action appear first; secondary details remain accessible without blocking save. |
| Duplicate prevention | Company and Contact forms check likely matches and warn before save without hiding legitimate multi-property relationships. |
| Context preservation | Record timelines, related Contacts, Opportunities, tasks, and next actions remain visible from Account and Opportunity profiles. |
| Mobile practicality | Primary actions, filters, detail sheets, and calendar views remain usable at narrow viewport widths. |

## 16. Account health and smart attention

Every Company receives an automatically calculated Account Health state of exactly **Healthy**, **Needs Attention**, or **At Risk**. The score is not a manually maintained vanity field. It derives from last activity, upcoming follow-up, open Opportunities, contract expiry, overdue tasks, and missing next actions. The interface exposes both the state and concise reasons so the salesperson can act immediately.

Smart attention items are calculated at request time for the authorised user and property scope. They include stale Accounts, overdue follow-ups, stale Opportunities, contracts approaching expiry, Proposals awaiting response, Accounts at risk, Opportunities with no next action, and Opportunities sitting in one exact pipeline stage beyond the configured threshold. These items appear on dashboards and relevant list views; scheduled outbound notifications remain a separately configurable automation.

## 17. Closed-lost discipline and analysis

When an Opportunity moves to the exact stage **Closed Lost**, the system requires a structured lost reason and permits an optional explanatory comment. The standard reasons are Lost on price, No availability, Competitor selected, Location, Facilities, Parking, Client cancelled, Budget, Timing, and Other. The system also records competitor context and the stage at loss for audit and analysis.

Lost-business reporting supports property, segment, competitor, lost reason, Opportunity type, owner, month, and stage-at-loss dimensions. This operational taxonomy does not create additional pipeline stages or weaken the fixed six-stage model.

## 18. Cross-property referrals

A Cross-Property Referral connects an originating Opportunity or Account with a referring property and a receiving property. It tracks referral status, estimated or generated revenue, generated room nights, notes, original owner, current owner, and timestamps. The referring and receiving teams receive appropriate read visibility, while edit rights remain bounded by property assignment and explicit ownership. Referral value and conversion are reportable by property and group.

## 19. Competitor intelligence

Competitor Intelligence is a lightweight, searchable team knowledge stream. Each entry records competitor hotel, quoted rate, client feedback, strengths, weaknesses, notes, capture date, property, owner, and optional links to an Account or Opportunity. Group visibility enables commercial collaboration without granting edit rights to unrelated property records.

## 20. Hotel knowledge base

Each Property has a central sales-information page containing overview, facilities, meeting-room capacities, parking, key selling points, sales contacts, and approved collateral metadata. Collateral files are stored in managed object storage, with database records retaining only keys, URLs, names, MIME types, ownership, and timestamps. The project must never rely on deployed local folders or database binary columns for file persistence.

## 21. Calendar and weekly-report automation

The shared commercial calendar supports **Day**, **Week**, and **Month** views. It retains user, property, activity-type, subtype, and date-range filters, defaulting to the signed-in salesperson’s authorised working scope.

Weekly Commercial Updates support a server-generated draft assembled from the user’s authorised Activities, Opportunity changes, and Achievements for the selected property and week. Generated content remains editable and is never submitted automatically. The salesperson reviews, refines, and submits the structured update; submitted content feeds Property and Group rollups.

## 22. Delivery phasing

| Delivery boundary | Included capabilities |
|---|---|
| Operational MVP | Authentication, Admin/User roles, property assignments, Accounts, Contacts, Leads, exact-stage Opportunities, Activities, tasks, dashboards with the exact four KPI cards, shared calendar, Weekly Updates, Achievements, core reports, CSV import/export, Admin settings, responsive interface, and server-side scope enforcement. |
| Advanced commercial release | Account Health, smart attention, progressive forms, duplicate warnings, global Quick Add, lost-business discipline, Day/Week/Month calendar, automated weekly drafts, referrals, Competitor Intelligence, hotel knowledge pages, and expanded hotel reporting. |
| Integration phase | Microsoft 365 or Google synchronisation, automatic email capture, PMS/CRS/RMS feeds, e-signature, production feeds, outbound scheduled notifications, and other connector-backed automations. |

## 23. Final screen structure

The product includes Login, My/Property/Group Dashboard scopes, Calendar, Accounts, Contacts, Leads, Opportunities, Activities and Tasks, Weekly Updates, Achievements, Competitor Intelligence, Referrals, Reports, Data Studio, Hotel Knowledge, and Admin/Settings. Daily-selling destinations remain in the primary navigation; lower-frequency collaboration, data, and administration destinations are grouped to avoid visual overload.

## 24. Technology approach

The application uses React and TypeScript for the responsive web interface, a typed tRPC service boundary, Express for the server runtime, Drizzle ORM with a managed MySQL-compatible database, OAuth-backed authentication, Tailwind-based design tokens, Recharts for analytical views, Vitest for executable verification, and managed object storage for collateral. Role and property permissions are enforced in server procedures and shared query scopes rather than only in the interface.
