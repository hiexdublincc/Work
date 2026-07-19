import { asc, eq, inArray, isNull } from "drizzle-orm";
import {
  ACCOUNT_CATEGORIES,
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
        opportunityTypes: OPPORTUNITY_TYPES,
        opportunityStages: OPPORTUNITY_STAGES,
        commercialStatuses: COMMERCIAL_STATUSES,
        leadStatuses: LEAD_STATUSES,
        activityTypes: ACTIVITY_TYPES,
        activitySubtypes: HOTEL_ACTIVITY_SUBTYPES,
      },
    };
  }),
});
