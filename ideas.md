# JMK Group CRM — Product and Design Direction

## Product intent

JMK Group CRM is an authenticated internal workspace for managing relationships, sales progress, activities, and forecasting. The experience should feel calm, decisive, and premium rather than visually busy. Information density is appropriate for operational work, but hierarchy, whitespace, typography, and restrained color must keep every view readable.

## Visual system

The product uses a warm ivory canvas, crisp white elevated surfaces, deep ink typography, and a dark mineral-green primary accent. A muted brass accent is reserved for forecast and value emphasis, while semantic colors communicate positive, warning, overdue, and loss states. The visual language avoids generic bright-blue SaaS styling, heavy gradients, excessive borders, glass effects, and ornamental illustrations.

Typography pairs **Manrope** for interface text with **DM Serif Display** only for select page titles and headline numerals. Controls use a consistent 40-pixel height, cards use 16–20 pixel corner radii, and shadows remain soft and low-contrast. Motion is limited to brief opacity and transform transitions under 250 milliseconds, with reduced-motion support.

## Information architecture

The persistent navigation contains Dashboard, Companies, Contacts, Leads, Pipeline, Activities, Reports, and Data. Admin users additionally see Administration, containing Users and System Settings. Global search, quick-create, contextual filters, and the signed-in identity remain readily available without crowding the workspace.

## Access model

There are exactly two application roles: **Admin** and **User**. Admin users can access every CRM record, manage users, and change system settings. User accounts can read and change only records assigned to them. This restriction is enforced at the server boundary rather than relying on hidden interface elements. Activities inherit access from their attached CRM record and are additionally assigned to an owner.

## Core domain model

| Entity | Purpose | Principal relationships |
|---|---|---|
| User | Authenticated team member and assignment target | Owns Companies, Contacts, Leads, Opportunities, and Activities |
| Company | Organization account with profile and commercial context | Has many Contacts, Opportunities, and Activities |
| Contact | Individual relationship linked to an organization | Belongs to an optional Company; has Activities and Opportunities |
| Lead | Unqualified or developing prospect | Converts once into an Opportunity and, where needed, Company/Contact |
| Opportunity | Qualified sales deal with amount, probability, and stage | Links to Company, Contact, originating Lead, owner, and Activities |
| Activity | Task, call, meeting, or note | Attaches to exactly one Company, Contact, Lead, or Opportunity |
| System Setting | Organization-level defaults controlled by Admin | Stores organization name, currency, and operating preferences |

## Required sales vocabulary

The opportunity stages are immutable product vocabulary and appear in this exact order: **Prospecting**, **Qualified**, **Proposal**, **Negotiation**, **Closed Won**, and **Closed Lost**. The dashboard contains exactly four KPI cards labelled **Open leads**, **Pipeline value**, **Won deals**, and **Overdue tasks**.

## Primary workflows

Lead capture begins with a validated form and assignment. Conversion is a single server-side transaction that marks the Lead converted, links or creates the relevant Company and Contact, and creates an Opportunity. Opportunity movement updates stage, value, probability, and forecasting immediately. Activities can be created from a global action or from any supported record, and overdue task logic applies only to incomplete tasks whose due time is in the past.

CSV import is a deliberate three-step experience: select entity and file, validate and preview parsed rows with errors, then confirm import. Export mirrors active filters and always respects role visibility. Reports share the same server-side access restrictions and calculation definitions as the dashboard.

## Acceptance risks

The implementation is unacceptable if role restrictions exist only in the client, if stage labels differ from the required wording, if dashboard cards include other metrics, if lead conversion can duplicate a conversion, if activities can attach to unsupported records, if CSV imports bypass ownership checks, or if refined desktop presentation collapses into an unusable mobile layout.
