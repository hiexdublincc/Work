import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  activities,
  companies,
  contacts,
  leads,
  COMMERCIAL_STATUSES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  LOST_REASONS,
  opportunities,
  properties,
  users,
} from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
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

const stageSchema = z.enum(OPPORTUNITY_STAGES);
const nullableText = (max: number) => z.string().trim().max(max).nullish();
const optionalDate = z.coerce.date().nullish();
const opportunityFields = z.object({
  name: z.string().trim().min(1).max(240),
  companyId: z.number().int().positive().nullish(),
  contactId: z.number().int().positive().nullish(),
  leadId: z.number().int().positive().nullish(),
  propertyId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  businessType: z.enum(OPPORTUNITY_TYPES).default("Corporate account"),
  stage: stageSchema.default("Prospecting"),
  commercialStatus: z.enum(COMMERCIAL_STATUSES).default("New lead"),
  valueCents: z.number().int().min(0).default(0),
  probability: z.number().int().min(0).max(100).default(10),
  startDate: optionalDate,
  endDate: optionalDate,
  roomNights: z.number().int().min(0).default(0),
  adrCents: z.number().int().min(0).default(0),
  source: nullableText(160),
  referralSource: nullableText(240),
  competitorHotel: nullableText(240),
  lostReason: z.enum(LOST_REASONS).nullish(),
  lossComment: nullableText(5000),
  expectedCloseDate: optionalDate,
  nextStep: z.string().trim().min(1).max(500),
  nextActionAt: z.coerce.date().nullish(),
  notes: nullableText(20000),
});

type AuthUser = NonNullable<TrpcContext["user"]>;

async function resolveOpportunityProperty(
  user: AuthUser,
  requestedPropertyId: number | undefined,
  relations: { companyId?: number | null; contactId?: number | null; leadId?: number | null },
  fallbackPropertyId?: number,
) {
  // Companies and contacts are shared across the group and carry no property of their own,
  // so only a linked lead can constrain which property an opportunity belongs to.
  if (relations.companyId) await assertEntityAccess(user, "company", relations.companyId);
  if (relations.contactId) await assertEntityAccess(user, "contact", relations.contactId);
  let leadPropertyId: number | undefined;
  if (relations.leadId) {
    const lead = await assertEntityAccess(user, "lead", relations.leadId);
    leadPropertyId = lead.propertyId;
  }
  const propertyId = leadPropertyId ?? (requestedPropertyId === undefined && fallbackPropertyId
    ? fallbackPropertyId
    : await resolvePropertyId(user, requestedPropertyId));
  if (leadPropertyId !== undefined && requestedPropertyId && requestedPropertyId !== leadPropertyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Lead must belong to the opportunity property." });
  }
  return propertyId;
}

export const opportunitiesRouter = router({
  list: activeProcedure.input(listInput.extend({
    stage: stageSchema.optional(),
    businessType: z.enum(OPPORTUNITY_TYPES).optional(),
    companyId: z.number().int().positive().optional(),
    sort: z.enum(["updated", "name", "value", "closeDate", "created"]).default("updated"),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const search = input.search ? `%${input.search}%` : undefined;
    const where = scopedWhere(
      isNull(opportunities.archivedAt),
      propertyScope(opportunities.propertyId, propertyIds),
      input.propertyId ? eq(opportunities.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
      input.stage ? eq(opportunities.stage, input.stage) : undefined,
      input.businessType ? eq(opportunities.businessType, input.businessType) : undefined,
      input.companyId ? eq(opportunities.companyId, input.companyId) : undefined,
      search ? or(
        like(opportunities.name, search), like(opportunities.businessType, search), like(opportunities.commercialStatus, search),
        like(companies.name, search), like(contacts.firstName, search), like(contacts.lastName, search),
      ) : undefined,
    );
    const order = input.sort === "name" ? asc(opportunities.name)
      : input.sort === "value" ? desc(opportunities.valueCents)
        : input.sort === "closeDate" ? asc(opportunities.expectedCloseDate)
          : input.sort === "created" ? desc(opportunities.createdAt) : desc(opportunities.updatedAt);
    const [rows, totals] = await Promise.all([
      db.select({
        id: opportunities.id, name: opportunities.name, stage: opportunities.stage, stageChangedAt: opportunities.stageChangedAt,
        businessType: opportunities.businessType, commercialStatus: opportunities.commercialStatus,
        valueCents: opportunities.valueCents, probability: opportunities.probability,
        expectedCloseDate: opportunities.expectedCloseDate, startDate: opportunities.startDate,
        endDate: opportunities.endDate, roomNights: opportunities.roomNights, adrCents: opportunities.adrCents,
        source: opportunities.source, referralSource: opportunities.referralSource,
        competitorHotel: opportunities.competitorHotel, lostReason: opportunities.lostReason,
        lossComment: opportunities.lossComment, stageAtLoss: opportunities.stageAtLoss,
        nextStep: opportunities.nextStep, nextActionAt: opportunities.nextActionAt,
        companyId: opportunities.companyId, companyName: companies.name,
        contactId: opportunities.contactId, contactFirstName: contacts.firstName, contactLastName: contacts.lastName,
        propertyId: opportunities.propertyId, propertyName: properties.name,
        ownerId: opportunities.ownerId, ownerName: users.name,
        updatedAt: opportunities.updatedAt, createdAt: opportunities.createdAt,
      }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .leftJoin(contacts, eq(opportunities.contactId, contacts.id))
        .leftJoin(users, eq(opportunities.ownerId, users.id))
        .leftJoin(properties, eq(opportunities.propertyId, properties.id))
        .where(where).orderBy(order).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .leftJoin(contacts, eq(opportunities.contactId, contacts.id)).where(where),
    ]);
    return { items: rows, total: Number(totals[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),

  pipeline: activeProcedure.input(z.object({
    propertyId: z.number().int().positive().optional(),
    ownerId: z.number().int().positive().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const rows = await db.select({
      id: opportunities.id, name: opportunities.name, stage: opportunities.stage, stageChangedAt: opportunities.stageChangedAt,
      businessType: opportunities.businessType, valueCents: opportunities.valueCents,
      probability: opportunities.probability, expectedCloseDate: opportunities.expectedCloseDate,
      roomNights: opportunities.roomNights, nextStep: opportunities.nextStep,
      nextActionAt: opportunities.nextActionAt, companyName: companies.name,
      propertyId: opportunities.propertyId, propertyName: properties.name, ownerName: users.name,
    }).from(opportunities)
      .leftJoin(companies, eq(opportunities.companyId, companies.id))
      .leftJoin(users, eq(opportunities.ownerId, users.id))
      .leftJoin(properties, eq(opportunities.propertyId, properties.id))
      .where(scopedWhere(
        isNull(opportunities.archivedAt), propertyScope(opportunities.propertyId, propertyIds),
        input?.propertyId ? eq(opportunities.propertyId, input.propertyId) : undefined,
        input?.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
      )).orderBy(desc(opportunities.valueCents));
    return OPPORTUNITY_STAGES.map(stage => {
      const items = rows.filter(item => item.stage === stage);
      return { stage, items, count: items.length, valueCents: items.reduce((sum, item) => sum + item.valueCents, 0) };
    });
  }),

  get: activeProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "opportunity", input.id);
    const rows = await db.select({
      opportunity: opportunities, companyName: companies.name, contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName, ownerName: users.name, propertyName: properties.name,
    }).from(opportunities)
      .leftJoin(companies, eq(opportunities.companyId, companies.id))
      .leftJoin(contacts, eq(opportunities.contactId, contacts.id))
      .leftJoin(users, eq(opportunities.ownerId, users.id))
      .leftJoin(properties, eq(opportunities.propertyId, properties.id))
      .where(and(eq(opportunities.id, input.id), isNull(opportunities.archivedAt))).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
    const relatedActivities = await db.select().from(activities)
      .where(and(eq(activities.opportunityId, input.id), isNull(activities.archivedAt))).orderBy(desc(activities.createdAt));
    return { ...rows[0], activities: relatedActivities };
  }),

  create: activeProcedure.input(opportunityFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolveOpportunityProperty(ctx.user, input.propertyId, input);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    if (input.stage === "Closed Lost" && !input.lostReason) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Select a standard lost reason before closing this opportunity as lost." });
    }
    const closedAt = input.stage === "Closed Won" || input.stage === "Closed Lost" ? new Date() : null;
    const stageAtLoss = input.stage === "Closed Lost" ? "Prospecting" : null;
    const result = await db.insert(opportunities).values({ ...input, propertyId, ownerId, createdById: ctx.user.id, closedAt, stageAtLoss });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(opportunityFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "opportunity", input.id);
    const existing = await db.select().from(opportunities)
      .where(and(eq(opportunities.id, input.id), isNull(opportunities.archivedAt))).limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
    const { id, ownerId: requestedOwnerId, propertyId: requestedPropertyId, ...changes } = input;
    const propertyId = await resolveOpportunityProperty(ctx.user, requestedPropertyId, {
      companyId: input.companyId === undefined ? existing[0].companyId : input.companyId,
      contactId: input.contactId === undefined ? existing[0].contactId : input.contactId,
      leadId: input.leadId === undefined ? existing[0].leadId : input.leadId,
    }, existing[0].propertyId);
    const ownerId = requestedOwnerId === undefined ? existing[0].ownerId : resolveOwnerId(ctx.user, requestedOwnerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const resultingStage = input.stage ?? existing[0].stage;
    const resultingLostReason = input.lostReason === undefined ? existing[0].lostReason : input.lostReason;
    if (resultingStage === "Closed Lost" && !resultingLostReason) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Select a standard lost reason before closing this opportunity as lost." });
    }
    const closedAt = resultingStage === "Closed Won" || resultingStage === "Closed Lost"
      ? existing[0].closedAt ?? new Date()
      : input.stage ? null : existing[0].closedAt;
    const stageAtLoss = resultingStage === "Closed Lost"
      ? existing[0].stageAtLoss ?? (existing[0].stage === "Closed Lost" ? "Prospecting" : existing[0].stage)
      : null;
    const stageChangedAt = resultingStage !== existing[0].stage ? new Date() : existing[0].stageChangedAt;
    await db.update(opportunities).set({ ...changes, propertyId, ownerId, closedAt, stageAtLoss, stageChangedAt }).where(eq(opportunities.id, id));
    return { success: true };
  }),

  setStage: activeProcedure.input(z.object({
    id: z.number().int().positive(),
    stage: stageSchema,
    lostReason: z.enum(LOST_REASONS).optional(),
    lossComment: z.string().trim().max(5000).optional(),
    competitorHotel: z.string().trim().max(240).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "opportunity", input.id);
    const existing = await db.select().from(opportunities).where(eq(opportunities.id, input.id)).limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found." });
    const lostReason = input.lostReason ?? existing[0].lostReason;
    if (input.stage === "Closed Lost" && !lostReason) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Select a standard lost reason before closing this opportunity as lost." });
    }
    const closedAt = input.stage === "Closed Won" || input.stage === "Closed Lost" ? existing[0].closedAt ?? new Date() : null;
    const stageAtLoss = input.stage === "Closed Lost"
      ? existing[0].stageAtLoss ?? (existing[0].stage === "Closed Lost" ? "Prospecting" : existing[0].stage)
      : null;
    await db.update(opportunities).set({
      stage: input.stage, closedAt, stageAtLoss,
      stageChangedAt: input.stage !== existing[0].stage ? new Date() : existing[0].stageChangedAt,
      lostReason: input.stage === "Closed Lost" ? lostReason : null,
      lossComment: input.stage === "Closed Lost" ? input.lossComment ?? existing[0].lossComment : null,
      competitorHotel: input.competitorHotel ?? existing[0].competitorHotel,
    }).where(eq(opportunities.id, input.id));
    return { success: true };
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "opportunity", input.id);
    await db.update(opportunities).set({ archivedAt: new Date() }).where(eq(opportunities.id, input.id));
    return { success: true };
  }),
});
