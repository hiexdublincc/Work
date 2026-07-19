import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { activities, ACTIVITY_ENTITY_TYPES, ACTIVITY_TYPES, companies, contacts, HOTEL_ACTIVITY_SUBTYPES, leads, opportunities, properties, users } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import { activeProcedure, assertEntityAccess, assertOwnerPropertyCompatibility, resolveOwnerId, resolvePropertyId } from "./common";

const entitySchema = z.enum(["companies", "contacts", "leads", "opportunities", "activities"]);
const nullableText = z.preprocess(value => (value === "" || value === undefined ? null : value), z.string().trim().nullable());
const nullablePositiveInt = z.preprocess(
  value => (value === "" || value === undefined || value === null ? null : Number(value)),
  z.number().int().positive().nullable(),
);
const nonNegativeInt = z.preprocess(value => Number(value ?? 0), z.number().int().min(0));

const importSchemas = {
  companies: z.object({
    name: z.string().trim().min(1).max(240),
    legalName: nullableText.optional(),
    website: nullableText.optional(),
    email: nullableText.optional(),
    phone: nullableText.optional(),
    industry: nullableText.optional(),
    status: z.enum(["Prospect", "Active", "Inactive"]).default("Prospect"),
    city: nullableText.optional(),
    country: nullableText.optional(),
    ownerId: nullablePositiveInt.optional(),
  }),
  contacts: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: nullableText.optional(),
    phone: nullableText.optional(),
    mobile: nullableText.optional(),
    jobTitle: nullableText.optional(),
    department: nullableText.optional(),
    companyId: nullablePositiveInt.optional(),
    status: z.enum(["Active", "Inactive"]).default("Active"),
    ownerId: nullablePositiveInt.optional(),
  }),
  leads: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    companyName: nullableText.optional(),
    email: nullableText.optional(),
    phone: nullableText.optional(),
    source: nullableText.optional(),
    status: z.enum(["New", "Contacted", "Qualified", "Nurturing", "Disqualified"]).default("New"),
    estimatedValueCents: nonNegativeInt.default(0),
    ownerId: nullablePositiveInt.optional(),
    propertyId: nullablePositiveInt.optional(),
  }),
  opportunities: z.object({
    name: z.string().trim().min(1).max(240),
    companyId: nullablePositiveInt.optional(),
    contactId: nullablePositiveInt.optional(),
    stage: z.enum(["Prospecting", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]).default("Prospecting"),
    valueCents: nonNegativeInt.default(0),
    probability: z.preprocess(value => Number(value ?? 10), z.number().int().min(0).max(100)),
    expectedCloseDate: z.preprocess(value => (value ? new Date(String(value)) : null), z.date().nullable()),
    ownerId: nullablePositiveInt.optional(),
    propertyId: nullablePositiveInt.optional(),
  }),
  activities: z.object({
    type: z.enum(ACTIVITY_TYPES).default("note"),
    subtype: z.enum(HOTEL_ACTIVITY_SUBTYPES).default("General"),
    title: z.string().trim().min(1).max(240),
    description: nullableText.optional(),
    entityType: z.preprocess(value => (value === "" ? undefined : value), z.enum(ACTIVITY_ENTITY_TYPES).optional()),
    entityId: nullablePositiveInt.optional(),
    dueAt: z.preprocess(value => (value ? new Date(String(value)) : null), z.date().nullable()),
    ownerId: nullablePositiveInt.optional(),
    propertyId: nullablePositiveInt.optional(),
  }),
} as const;

const templates = {
  companies: ["name", "legalName", "website", "email", "phone", "industry", "status", "city", "country", "ownerId"],
  contacts: ["firstName", "lastName", "email", "phone", "mobile", "jobTitle", "department", "companyId", "status", "ownerId"],
  leads: ["firstName", "lastName", "companyName", "email", "phone", "source", "status", "estimatedValueCents", "propertyId", "ownerId"],
  opportunities: ["name", "companyId", "contactId", "stage", "valueCents", "probability", "expectedCloseDate", "propertyId", "ownerId"],
  activities: ["type", "subtype", "title", "description", "entityType", "entityId", "dueAt", "propertyId", "ownerId"],
} as const;

const PROPERTY_SCOPED_ENTITIES = new Set(["leads", "opportunities", "activities"]);

function entityLinks(entityType: string | null | undefined, entityId: number | null | undefined) {
  return {
    companyId: entityType === "company" ? entityId : null,
    contactId: entityType === "contact" ? entityId : null,
    leadId: entityType === "lead" ? entityId : null,
    opportunityId: entityType === "opportunity" ? entityId : null,
  };
}

export const dataRouter = router({
  templates: activeProcedure.query(() => templates),

  importRows: activeProcedure
    .input(
      z.object({
        entity: entitySchema,
        rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const valid: Array<Record<string, unknown>> = [];
      const errors: Array<{ row: number; message: string }> = [];
      const schema = importSchemas[input.entity];
      const propertyScoped = PROPERTY_SCOPED_ENTITIES.has(input.entity);

      for (let index = 0; index < input.rows.length; index++) {
        const row = input.rows[index];
        const result = schema.safeParse(row);
        if (!result.success) {
          errors.push({ row: index + 2, message: result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
          continue;
        }
        try {
          const data = result.data as Record<string, unknown>;
          const ownerId = resolveOwnerId(ctx.user, (data.ownerId as number | null) ?? undefined);
          if (propertyScoped) {
            const propertyId = await resolvePropertyId(ctx.user, (data.propertyId as number | null) ?? undefined);
            await assertOwnerPropertyCompatibility(ownerId, propertyId);
            const { propertyId: _rowPropertyId, ...rest } = data;
            if (input.entity === "activities") {
              const { entityType, entityId, ...activityRest } = rest as { entityType?: string; entityId?: number | null };
              if (!entityType !== !entityId) throw new Error("Provide both entityType and entityId, or leave both blank.");
              if (entityType && entityId) await assertEntityAccess(ctx.user, entityType as "company" | "contact" | "lead" | "opportunity", entityId);
              valid.push({ ...activityRest, entityType: entityType ?? null, entityId: entityId ?? null, ...entityLinks(entityType, entityId), propertyId, ownerId, createdById: ctx.user.id });
            } else {
              valid.push({ ...rest, propertyId, ownerId, createdById: ctx.user.id });
            }
          } else {
            if (input.entity === "contacts" && data.companyId) await assertEntityAccess(ctx.user, "company", data.companyId as number);
            valid.push({ ...data, ownerId, createdById: ctx.user.id });
          }
        } catch (error) {
          errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid owner, property, or linked record." });
        }
      }

      if (errors.length) return { imported: 0, errors, ready: false };
      await db.transaction(async tx => {
        const chunkSize = 250;
        for (let index = 0; index < valid.length; index += chunkSize) {
          const chunk = valid.slice(index, index + chunkSize);
          if (input.entity === "companies") await tx.insert(companies).values(chunk as typeof companies.$inferInsert[]);
          if (input.entity === "contacts") await tx.insert(contacts).values(chunk as typeof contacts.$inferInsert[]);
          if (input.entity === "leads") await tx.insert(leads).values(chunk as typeof leads.$inferInsert[]);
          if (input.entity === "opportunities") await tx.insert(opportunities).values(chunk as typeof opportunities.$inferInsert[]);
          if (input.entity === "activities") await tx.insert(activities).values(chunk as typeof activities.$inferInsert[]);
        }
      });
      return { imported: valid.length, errors: [], ready: true };
    }),

  exportCsv: activeProcedure.input(z.object({
    entity: entitySchema,
    propertyId: z.number().int().positive().optional(),
    ownerId: z.number().int().positive().optional(),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    let rows: Array<Record<string, unknown>> = [];
    if (input.entity === "companies") {
      rows = await db
        .select({
          id: companies.id,
          name: companies.name,
          legalName: companies.legalName,
          website: companies.website,
          email: companies.email,
          phone: companies.phone,
          industry: companies.industry,
          status: companies.status,
          city: companies.city,
          country: companies.country,
          ownerId: companies.ownerId,
          ownerName: users.name,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
        })
        .from(companies)
        .leftJoin(users, eq(companies.ownerId, users.id))
        .where(and(isNull(companies.archivedAt), input.ownerId ? eq(companies.ownerId, input.ownerId) : undefined))
        .orderBy(asc(companies.name));
    }
    if (input.entity === "contacts") {
      rows = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
          mobile: contacts.mobile,
          jobTitle: contacts.jobTitle,
          department: contacts.department,
          companyId: contacts.companyId,
          status: contacts.status,
          ownerId: contacts.ownerId,
          ownerName: users.name,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .leftJoin(users, eq(contacts.ownerId, users.id))
        .where(and(isNull(contacts.archivedAt), input.ownerId ? eq(contacts.ownerId, input.ownerId) : undefined))
        .orderBy(asc(contacts.lastName), asc(contacts.firstName));
    }
    if (input.entity === "leads") {
      rows = await db
        .select({
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
          email: leads.email,
          phone: leads.phone,
          source: leads.source,
          status: leads.status,
          estimatedValueCents: leads.estimatedValueCents,
          propertyId: leads.propertyId,
          propertyName: properties.name,
          ownerId: leads.ownerId,
          ownerName: users.name,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .leftJoin(users, eq(leads.ownerId, users.id))
        .where(scopedWhere(
          isNull(leads.archivedAt), propertyScope(leads.propertyId, propertyIds),
          input.propertyId ? eq(leads.propertyId, input.propertyId) : undefined,
          input.ownerId ? eq(leads.ownerId, input.ownerId) : undefined,
        ))
        .orderBy(asc(leads.lastName), asc(leads.firstName));
    }
    if (input.entity === "opportunities") {
      rows = await db
        .select({
          id: opportunities.id,
          name: opportunities.name,
          companyId: opportunities.companyId,
          contactId: opportunities.contactId,
          stage: opportunities.stage,
          valueCents: opportunities.valueCents,
          probability: opportunities.probability,
          expectedCloseDate: opportunities.expectedCloseDate,
          propertyId: opportunities.propertyId,
          propertyName: properties.name,
          ownerId: opportunities.ownerId,
          ownerName: users.name,
          createdAt: opportunities.createdAt,
          updatedAt: opportunities.updatedAt,
        })
        .from(opportunities)
        .leftJoin(properties, eq(opportunities.propertyId, properties.id))
        .leftJoin(users, eq(opportunities.ownerId, users.id))
        .where(scopedWhere(
          isNull(opportunities.archivedAt), propertyScope(opportunities.propertyId, propertyIds),
          input.propertyId ? eq(opportunities.propertyId, input.propertyId) : undefined,
          input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
        ))
        .orderBy(asc(opportunities.name));
    }
    if (input.entity === "activities") {
      rows = await db
        .select({
          id: activities.id,
          type: activities.type,
          subtype: activities.subtype,
          title: activities.title,
          description: activities.description,
          entityType: activities.entityType,
          entityName: sql<string>`coalesce(${companies.name}, concat(${contacts.firstName}, ' ', ${contacts.lastName}), concat(${leads.firstName}, ' ', ${leads.lastName}), ${opportunities.name})`,
          propertyName: properties.name,
          ownerName: users.name,
          dueAt: activities.dueAt,
          completedAt: activities.completedAt,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
        })
        .from(activities)
        .leftJoin(companies, eq(activities.companyId, companies.id))
        .leftJoin(contacts, eq(activities.contactId, contacts.id))
        .leftJoin(leads, eq(activities.leadId, leads.id))
        .leftJoin(opportunities, eq(activities.opportunityId, opportunities.id))
        .leftJoin(properties, eq(activities.propertyId, properties.id))
        .leftJoin(users, eq(activities.ownerId, users.id))
        .where(scopedWhere(
          isNull(activities.archivedAt), propertyScope(activities.propertyId, propertyIds),
          input.propertyId ? eq(activities.propertyId, input.propertyId) : undefined,
          input.ownerId ? eq(activities.ownerId, input.ownerId) : undefined,
        ))
        .orderBy(desc(activities.createdAt));
    }

    return {
      filename: `jmk-${input.entity}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: toCsv(rows),
      count: rows.length,
    };
  }),
});

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const encode = (value: unknown) => {
    const normalized = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
    return `"${normalized.replaceAll('"', '""')}"`;
  };
  return [headers.map(encode).join(","), ...rows.map(row => headers.map(header => encode(row[header])).join(","))].join("\n");
}
