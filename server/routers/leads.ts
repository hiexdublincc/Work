import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { companies, contacts, leads, OPPORTUNITY_TYPES, opportunities, properties, users } from "../../drizzle/schema";
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
const optionalDate = z.coerce.date().nullish();
const leadFields = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  companyName: nullableText(240),
  jobTitle: nullableText(160),
  email: nullableText(320),
  phone: nullableText(80),
  source: nullableText(120),
  propertyId: z.number().int().positive().optional(),
  businessType: z.enum(OPPORTUNITY_TYPES).default("Corporate account"),
  potentialRoomNights: z.number().int().min(0).default(0),
  status: z.enum(["New", "Contacted", "Qualified", "Nurturing", "Converted", "Disqualified"]).default("New"),
  estimatedValueCents: z.number().int().min(0).default(0),
  notes: nullableText(20000),
  ownerId: z.number().int().positive().optional(),
});

export const leadsRouter = router({
  list: activeProcedure.input(listInput.extend({
    status: z.enum(["New", "Contacted", "Qualified", "Nurturing", "Converted", "Disqualified"]).optional(),
    source: z.string().trim().max(120).optional(),
    businessType: z.enum(OPPORTUNITY_TYPES).optional(),
    sort: z.enum(["updated", "name", "value", "created"]).default("updated"),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const search = input.search ? `%${input.search}%` : undefined;
    const where = scopedWhere(
      isNull(leads.archivedAt),
      propertyScope(leads.propertyId, propertyIds),
      input.propertyId ? eq(leads.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(leads.ownerId, input.ownerId) : undefined,
      input.status ? eq(leads.status, input.status) : undefined,
      input.businessType ? eq(leads.businessType, input.businessType) : undefined,
      input.source ? like(leads.source, `%${input.source}%`) : undefined,
      search ? or(
        like(leads.firstName, search), like(leads.lastName, search), like(leads.companyName, search),
        like(leads.email, search), like(leads.phone, search), like(leads.source, search),
      ) : undefined,
    );
    const order = input.sort === "name" ? asc(leads.lastName)
      : input.sort === "value" ? desc(leads.estimatedValueCents)
        : input.sort === "created" ? desc(leads.createdAt) : desc(leads.updatedAt);
    const [rows, totals] = await Promise.all([
      db.select({
        id: leads.id, firstName: leads.firstName, lastName: leads.lastName, companyName: leads.companyName,
        jobTitle: leads.jobTitle, email: leads.email, phone: leads.phone, source: leads.source,
        status: leads.status, businessType: leads.businessType, potentialRoomNights: leads.potentialRoomNights,
        estimatedValueCents: leads.estimatedValueCents, propertyId: leads.propertyId, propertyName: properties.name,
        ownerId: leads.ownerId, ownerName: users.name, convertedOpportunityId: leads.convertedOpportunityId,
        updatedAt: leads.updatedAt, createdAt: leads.createdAt,
      }).from(leads)
        .leftJoin(users, eq(leads.ownerId, users.id))
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(where).orderBy(order).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
    ]);
    return { items: rows, total: Number(totals[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),

  get: activeProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "lead", input.id);
    const rows = await db.select({ lead: leads, ownerName: users.name, propertyName: properties.name })
      .from(leads).leftJoin(users, eq(leads.ownerId, users.id)).leftJoin(properties, eq(leads.propertyId, properties.id))
      .where(and(eq(leads.id, input.id), isNull(leads.archivedAt))).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
    return rows[0];
  }),

  create: activeProcedure.input(leadFields.omit({ status: true }).extend({ status: leadFields.shape.status.optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolvePropertyId(ctx.user, input.propertyId);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const result = await db.insert(leads).values({ ...input, propertyId, ownerId, createdById: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(leadFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await db.select().from(leads)
      .where(and(eq(leads.id, input.id), isNull(leads.archivedAt))).limit(1);
    await assertEntityAccess(ctx.user, "lead", input.id);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
    if (input.status === "Converted" && !existing[0].convertedAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Use the conversion workflow to convert a lead." });
    }
    const { id, ownerId: requestedOwnerId, propertyId: requestedPropertyId, ...changes } = input;
    const propertyId = requestedPropertyId === undefined ? existing[0].propertyId : await resolvePropertyId(ctx.user, requestedPropertyId);
    const ownerId = requestedOwnerId === undefined ? existing[0].ownerId : resolveOwnerId(ctx.user, requestedOwnerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    await db.update(leads).set({ ...changes, propertyId, ownerId }).where(eq(leads.id, id));
    return { success: true };
  }),

  convert: activeProcedure.input(z.object({
    id: z.number().int().positive(),
    opportunityName: z.string().trim().min(1).max(240),
    valueCents: z.number().int().min(0),
    probability: z.number().int().min(0).max(100).default(10),
    expectedCloseDate: optionalDate,
    nextStep: z.string().trim().min(1).max(500),
    nextActionAt: z.coerce.date().nullish(),
    companyId: z.number().int().positive().nullish(),
    contactId: z.number().int().positive().nullish(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "lead", input.id);
    const visible = await db.select().from(leads)
      .where(and(eq(leads.id, input.id), isNull(leads.archivedAt))).limit(1);
    if (!visible[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
    if (visible[0].convertedAt) throw new TRPCError({ code: "CONFLICT", message: "This lead has already been converted." });

    if (input.companyId) {
      const company = await assertEntityAccess(ctx.user, "company", input.companyId);
      if (company.propertyId !== visible[0].propertyId) throw new TRPCError({ code: "BAD_REQUEST", message: "Company and lead must belong to the same property." });
    }
    if (input.contactId) {
      const contact = await assertEntityAccess(ctx.user, "contact", input.contactId);
      if (contact.propertyId !== visible[0].propertyId) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact and lead must belong to the same property." });
    }

    return db.transaction(async tx => {
      const lead = visible[0];
      let companyId = input.companyId ?? null;
      let contactId = input.contactId ?? null;
      if (!companyId && lead.companyName) {
        const created = await tx.insert(companies).values({
          name: lead.companyName, status: "Prospect", propertyId: lead.propertyId,
          potentialRoomNights: lead.potentialRoomNights, potentialRevenueCents: lead.estimatedValueCents,
          leadSource: lead.source, ownerId: lead.ownerId, createdById: ctx.user.id,
        });
        companyId = Number(created[0].insertId);
      }
      if (!contactId) {
        const created = await tx.insert(contacts).values({
          firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone,
          jobTitle: lead.jobTitle, companyId, propertyId: lead.propertyId,
          ownerId: lead.ownerId, createdById: ctx.user.id,
        });
        contactId = Number(created[0].insertId);
      }
      const createdOpportunity = await tx.insert(opportunities).values({
        name: input.opportunityName, companyId, contactId, leadId: lead.id, propertyId: lead.propertyId,
        ownerId: lead.ownerId, createdById: ctx.user.id, stage: "Prospecting",
        businessType: lead.businessType, commercialStatus: "New lead", valueCents: input.valueCents,
        probability: input.probability, roomNights: lead.potentialRoomNights,
        expectedCloseDate: input.expectedCloseDate ?? null, nextStep: input.nextStep,
        nextActionAt: input.nextActionAt ?? null,
      });
      const opportunityId = Number(createdOpportunity[0].insertId);
      const updated = await tx.update(leads).set({
        status: "Converted", convertedAt: new Date(), convertedCompanyId: companyId,
        convertedContactId: contactId, convertedOpportunityId: opportunityId,
      }).where(and(eq(leads.id, lead.id), isNull(leads.convertedAt)));
      if (!updated[0].affectedRows) throw new TRPCError({ code: "CONFLICT", message: "This lead was converted by another request." });
      return { opportunityId, companyId, contactId };
    });
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "lead", input.id);
    await db.update(leads).set({ archivedAt: new Date() }).where(eq(leads.id, input.id));
    return { success: true };
  }),
});
