import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { activities, companies, contacts, opportunities, properties, users } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import {
  activeProcedure,
  assertEntityAccess,
  assertOwnerPropertyCompatibility,
  idInput,
  listInput,
  resolveOwnerId,
  resolvePropertyId,
} from "./common";

const nullableText = (max: number) => z.string().trim().max(max).nullish();
const contactFields = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  preferredName: nullableText(120),
  email: nullableText(320),
  phone: nullableText(80),
  mobile: nullableText(80),
  jobTitle: nullableText(160),
  department: nullableText(160),
  companyId: z.number().int().positive().nullish(),
  propertyId: z.number().int().positive().optional(),
  relationshipStatus: nullableText(120),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  addressLine1: nullableText(240),
  addressLine2: nullableText(240),
  city: nullableText(120),
  region: nullableText(120),
  postalCode: nullableText(40),
  country: nullableText(120),
  notes: nullableText(20000),
  ownerId: z.number().int().positive().optional(),
});

export const contactsRouter = router({
  list: activeProcedure
    .input(listInput.extend({
      status: z.enum(["Active", "Inactive"]).optional(),
      companyId: z.number().int().positive().optional(),
      sort: z.enum(["updated", "name", "created"]).default("updated"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const propertyIds = await getAuthorizedPropertyIds(ctx.user);
      const search = input.search ? `%${input.search}%` : undefined;
      const where = scopedWhere(
        isNull(contacts.archivedAt),
        propertyScope(contacts.propertyId, propertyIds),
        input.propertyId ? eq(contacts.propertyId, input.propertyId) : undefined,
        input.ownerId ? eq(contacts.ownerId, input.ownerId) : undefined,
        input.status ? eq(contacts.status, input.status) : undefined,
        input.companyId ? eq(contacts.companyId, input.companyId) : undefined,
        search ? or(
          like(contacts.firstName, search), like(contacts.lastName, search), like(contacts.preferredName, search),
          like(contacts.email, search), like(contacts.phone, search), like(contacts.mobile, search),
          like(contacts.jobTitle, search), like(contacts.relationshipStatus, search), like(companies.name, search),
        ) : undefined,
      );
      const order = input.sort === "name" ? asc(contacts.lastName)
        : input.sort === "created" ? desc(contacts.createdAt) : desc(contacts.updatedAt);
      const [rows, totals] = await Promise.all([
        db.select({
          id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, preferredName: contacts.preferredName,
          email: contacts.email, phone: contacts.phone, mobile: contacts.mobile, jobTitle: contacts.jobTitle,
          relationshipStatus: contacts.relationshipStatus, status: contacts.status,
          companyId: contacts.companyId, companyName: companies.name, propertyId: contacts.propertyId,
          propertyName: properties.name, ownerId: contacts.ownerId, ownerName: users.name,
          updatedAt: contacts.updatedAt, createdAt: contacts.createdAt,
        }).from(contacts)
          .leftJoin(companies, eq(contacts.companyId, companies.id))
          .leftJoin(properties, eq(contacts.propertyId, properties.id))
          .leftJoin(users, eq(contacts.ownerId, users.id))
          .where(where).orderBy(order).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
        db.select({ count: sql<number>`count(*)` }).from(contacts)
          .leftJoin(companies, eq(contacts.companyId, companies.id)).where(where),
      ]);
      return { items: rows, total: Number(totals[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
    }),

  get: activeProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "contact", input.id);
    const rows = await db.select({ contact: contacts, companyName: companies.name, ownerName: users.name, propertyName: properties.name })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .leftJoin(users, eq(contacts.ownerId, users.id))
      .leftJoin(properties, eq(contacts.propertyId, properties.id))
      .where(and(eq(contacts.id, input.id), isNull(contacts.archivedAt))).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found." });
    const [relatedOpportunities, relatedActivities] = await Promise.all([
      db.select().from(opportunities).where(and(eq(opportunities.contactId, input.id), isNull(opportunities.archivedAt))).orderBy(desc(opportunities.updatedAt)),
      db.select().from(activities).where(and(eq(activities.contactId, input.id), isNull(activities.archivedAt))).orderBy(desc(activities.createdAt)),
    ]);
    return { ...rows[0], opportunities: relatedOpportunities, activities: relatedActivities };
  }),

  duplicateCheck: activeProcedure.input(z.object({
    propertyId: z.number().int().positive().optional(),
    companyId: z.number().int().positive().nullish(),
    excludeId: z.number().int().positive().optional(),
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    email: z.string().trim().max(320).optional(),
    phone: z.string().trim().max(80).optional(),
    mobile: z.string().trim().max(80).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const signals = [
      input.email ? sql`lower(${contacts.email}) = lower(${input.email})` : undefined,
      input.phone ? eq(contacts.phone, input.phone) : undefined,
      input.mobile ? eq(contacts.mobile, input.mobile) : undefined,
      input.firstName && input.lastName ? and(
        sql`lower(${contacts.firstName}) = lower(${input.firstName})`,
        sql`lower(${contacts.lastName}) = lower(${input.lastName})`,
        input.companyId ? eq(contacts.companyId, input.companyId) : undefined,
      ) : undefined,
    ].filter(Boolean);
    if (!signals.length) return { matches: [] };
    const rows = await db.select({
      id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
      email: contacts.email, phone: contacts.phone, mobile: contacts.mobile,
      companyId: contacts.companyId, companyName: companies.name,
      propertyId: contacts.propertyId, propertyName: properties.name,
    }).from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .leftJoin(properties, eq(contacts.propertyId, properties.id))
      .where(scopedWhere(
        isNull(contacts.archivedAt),
        propertyScope(contacts.propertyId, propertyIds),
        input.propertyId ? eq(contacts.propertyId, input.propertyId) : undefined,
        input.excludeId ? sql`${contacts.id} <> ${input.excludeId}` : undefined,
        or(...signals as [NonNullable<(typeof signals)[number]>, ...NonNullable<(typeof signals)[number]>[]]),
      )).limit(8);
    return { matches: rows };
  }),

  create: activeProcedure.input(contactFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const linkedCompany = input.companyId ? await assertEntityAccess(ctx.user, "company", input.companyId) : null;
    const propertyId = linkedCompany?.propertyId ?? await resolvePropertyId(ctx.user, input.propertyId);
    if (input.propertyId && input.propertyId !== propertyId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contact and company must belong to the same property." });
    }
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const result = await db.insert(contacts).values({ ...input, propertyId, ownerId, createdById: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(contactFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertEntityAccess(ctx.user, "contact", input.id);
    const linkedCompany = input.companyId ? await assertEntityAccess(ctx.user, "company", input.companyId) : null;
    const { id, ownerId: requestedOwnerId, propertyId: requestedPropertyId, ...changes } = input;
    const propertyId = linkedCompany?.propertyId ?? (requestedPropertyId === undefined ? existing.propertyId : await resolvePropertyId(ctx.user, requestedPropertyId));
    if (linkedCompany && requestedPropertyId && linkedCompany.propertyId !== requestedPropertyId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contact and company must belong to the same property." });
    }
    const ownerId = requestedOwnerId === undefined ? existing.ownerId : resolveOwnerId(ctx.user, requestedOwnerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    await db.update(contacts).set({ ...changes, propertyId, ownerId }).where(eq(contacts.id, id));
    return { success: true };
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "contact", input.id);
    await db.update(contacts).set({ archivedAt: new Date() }).where(eq(contacts.id, input.id));
    return { success: true };
  }),
});
