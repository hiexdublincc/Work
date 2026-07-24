import { and, asc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import {
  ACCOUNT_CATEGORIES,
  ACCOUNT_TIERS,
  ACTIVITY_TYPES,
  companies,
  COMMERCIAL_STATUSES,
  contacts,
  HOTEL_ACTIVITY_SUBTYPES,
  leads,
  LEAD_STATUSES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  opportunities,
  properties,
  userPropertyAssignments,
  users,
} from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import { activeProcedure } from "./common";

export const metadataRouter = router({
  references: activeProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const assigneeQuery = db
      .selectDistinct({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .leftJoin(userPropertyAssignments, eq(users.id, userPropertyAssignments.userId))
      .where(scopedWhere(
        eq(users.isActive, true),
        propertyIds ? inArray(userPropertyAssignments.propertyId, propertyIds.length ? propertyIds : [-1]) : undefined,
      ))
      .orderBy(asc(users.name));

    const [assignees, propertyRows, companyRows, contactRows, leadRows, opportunityRows] = await Promise.all([
      assigneeQuery,
      db.select({ id: properties.id, name: properties.name, city: properties.city, code: properties.code })
        .from(properties)
        .where(scopedWhere(eq(properties.isActive, true), propertyScope(properties.id, propertyIds)))
        .orderBy(asc(properties.name)),
      db.select({ id: companies.id, label: companies.name, ownerId: companies.ownerId })
        .from(companies)
        .where(isNull(companies.archivedAt))
        .orderBy(asc(companies.name)).limit(1000),
      db.select({
        id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
        companyId: contacts.companyId, ownerId: contacts.ownerId,
      }).from(contacts)
        .where(isNull(contacts.archivedAt))
        .orderBy(asc(contacts.lastName), asc(contacts.firstName)).limit(1000),
      db.select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, ownerId: leads.ownerId, propertyId: leads.propertyId })
        .from(leads)
        .where(scopedWhere(isNull(leads.archivedAt), propertyScope(leads.propertyId, propertyIds)))
        .orderBy(asc(leads.lastName), asc(leads.firstName)).limit(1000),
      db.select({ id: opportunities.id, label: opportunities.name, ownerId: opportunities.ownerId, propertyId: opportunities.propertyId })
        .from(opportunities)
        .where(scopedWhere(isNull(opportunities.archivedAt), propertyScope(opportunities.propertyId, propertyIds)))
        .orderBy(asc(opportunities.name)).limit(1000),
    ]);

    return {
      assignees,
      properties: propertyRows,
      companies: companyRows,
      contacts: contactRows.map(contact => ({ ...contact, label: `${contact.firstName} ${contact.lastName}` })),
      leads: leadRows.map(lead => ({ ...lead, label: `${lead.firstName} ${lead.lastName}` })),
      opportunities: opportunityRows,
      taxonomy: {
        accountCategories: ACCOUNT_CATEGORIES,
        accountTiers: ACCOUNT_TIERS,
        opportunityTypes: OPPORTUNITY_TYPES,
        opportunityStages: OPPORTUNITY_STAGES,
        commercialStatuses: COMMERCIAL_STATUSES,
        leadStatuses: LEAD_STATUSES,
        activityTypes: ACTIVITY_TYPES,
        activitySubtypes: HOTEL_ACTIVITY_SUBTYPES,
      },
    };
  }),

  // Backs the ⌘K global search palette — finds a record from anywhere in the app, regardless of
  // which page is currently open.
  globalSearch: activeProcedure.input(z.object({ query: z.string().trim().min(1).max(120) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const term = `%${input.query}%`;

    const [companyRows, contactRows, leadRows, opportunityRows] = await Promise.all([
      db.select({ id: companies.id, name: companies.name, segment: companies.segment, industry: companies.industry })
        .from(companies)
        .where(and(isNull(companies.archivedAt), like(companies.name, term)))
        .orderBy(asc(companies.name)).limit(6),
      db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, jobTitle: contacts.jobTitle, companyId: contacts.companyId })
        .from(contacts)
        .where(and(isNull(contacts.archivedAt), or(like(contacts.firstName, term), like(contacts.lastName, term), like(contacts.email, term))))
        .orderBy(asc(contacts.lastName)).limit(6),
      db.select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, companyName: leads.companyName })
        .from(leads)
        .where(scopedWhere(
          isNull(leads.archivedAt), propertyScope(leads.propertyId, propertyIds),
          or(like(leads.firstName, term), like(leads.lastName, term), like(leads.companyName, term)),
        ))
        .orderBy(asc(leads.lastName)).limit(6),
      db.select({ id: opportunities.id, name: opportunities.name, businessType: opportunities.businessType })
        .from(opportunities)
        .where(scopedWhere(isNull(opportunities.archivedAt), propertyScope(opportunities.propertyId, propertyIds), like(opportunities.name, term)))
        .orderBy(asc(opportunities.name)).limit(6),
    ]);

    return {
      companies: companyRows.map(row => ({ id: row.id, label: row.name, subtitle: row.segment || row.industry || "Company" })),
      contacts: contactRows.map(row => ({ id: row.id, label: `${row.firstName} ${row.lastName}`, subtitle: row.jobTitle || "Contact" })),
      leads: leadRows.map(row => ({ id: row.id, label: `${row.firstName} ${row.lastName}`, subtitle: row.companyName || "Lead" })),
      opportunities: opportunityRows.map(row => ({ id: row.id, label: row.name, subtitle: row.businessType || "Opportunity" })),
    };
  }),
});
