import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import {
  companies,
  competitorIntelligence,
  opportunities,
  properties,
  users,
} from "../../drizzle/schema";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import { router } from "../_core/trpc";
import {
  activeProcedure,
  assertEntityAccess,
  assertOwnerPropertyCompatibility,
  idInput,
  resolveOwnerId,
  resolvePropertyId,
} from "./common";

const intelligenceFields = z.object({
  competitorHotelName: z.string().trim().min(1).max(240),
  quotedRateCents: z.number().int().min(0).nullish(),
  clientFeedback: z.string().trim().max(10000).nullish(),
  strengths: z.string().trim().max(10000).nullish(),
  weaknesses: z.string().trim().max(10000).nullish(),
  notes: z.string().trim().max(20000).nullish(),
  capturedAt: z.coerce.date().optional(),
  propertyId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  companyId: z.number().int().positive().nullish(),
  opportunityId: z.number().int().positive().nullish(),
  isGroupVisible: z.boolean().default(true),
});

async function resolveIntelligenceProperty(
  user: { id: number; role: "admin" | "user"; isActive: boolean },
  requestedPropertyId: number | undefined,
  companyId?: number | null,
  opportunityId?: number | null,
  fallbackPropertyId?: number,
) {
  const linkedProperties: number[] = [];
  if (companyId) linkedProperties.push((await assertEntityAccess(user, "company", companyId)).propertyId);
  if (opportunityId) linkedProperties.push((await assertEntityAccess(user, "opportunity", opportunityId)).propertyId);
  if (linkedProperties.some(propertyId => propertyId !== linkedProperties[0])) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Linked records must belong to the same property." });
  }
  const propertyId = linkedProperties[0] ?? (requestedPropertyId === undefined && fallbackPropertyId
    ? fallbackPropertyId
    : await resolvePropertyId(user, requestedPropertyId));
  if (requestedPropertyId && requestedPropertyId !== propertyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Linked records must belong to the selected property." });
  }
  return propertyId;
}

async function assertIntelligenceAccess(user: { id: number; role: "admin" | "user"; isActive: boolean }, id: number) {
  const db = await requireDb();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const row = await db.select().from(competitorIntelligence).where(scopedWhere(
    eq(competitorIntelligence.id, id),
    isNull(competitorIntelligence.archivedAt),
    propertyScope(competitorIntelligence.propertyId, propertyIds),
  )).limit(1);
  if (!row[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Competitor intelligence record not found." });
  return row[0];
}

export const competitorIntelligenceRouter = router({
  list: activeProcedure.input(z.object({
    search: z.string().trim().max(200).default(""),
    propertyId: z.number().int().positive().optional(),
    companyId: z.number().int().positive().optional(),
    opportunityId: z.number().int().positive().optional(),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const search = input.search ? `%${input.search}%` : undefined;
    return db.select({
      id: competitorIntelligence.id,
      competitorHotelName: competitorIntelligence.competitorHotelName,
      quotedRateCents: competitorIntelligence.quotedRateCents,
      clientFeedback: competitorIntelligence.clientFeedback,
      strengths: competitorIntelligence.strengths,
      weaknesses: competitorIntelligence.weaknesses,
      notes: competitorIntelligence.notes,
      capturedAt: competitorIntelligence.capturedAt,
      isGroupVisible: competitorIntelligence.isGroupVisible,
      propertyId: competitorIntelligence.propertyId,
      propertyName: properties.name,
      ownerId: competitorIntelligence.ownerId,
      ownerName: users.name,
      companyId: competitorIntelligence.companyId,
      companyName: companies.name,
      opportunityId: competitorIntelligence.opportunityId,
      opportunityName: opportunities.name,
      updatedAt: competitorIntelligence.updatedAt,
    }).from(competitorIntelligence)
      .leftJoin(properties, eq(competitorIntelligence.propertyId, properties.id))
      .leftJoin(users, eq(competitorIntelligence.ownerId, users.id))
      .leftJoin(companies, eq(competitorIntelligence.companyId, companies.id))
      .leftJoin(opportunities, eq(competitorIntelligence.opportunityId, opportunities.id))
      .where(scopedWhere(
        isNull(competitorIntelligence.archivedAt),
        propertyScope(competitorIntelligence.propertyId, propertyIds),
        input.propertyId ? eq(competitorIntelligence.propertyId, input.propertyId) : undefined,
        input.companyId ? eq(competitorIntelligence.companyId, input.companyId) : undefined,
        input.opportunityId ? eq(competitorIntelligence.opportunityId, input.opportunityId) : undefined,
        search ? or(
          like(competitorIntelligence.competitorHotelName, search),
          like(competitorIntelligence.clientFeedback, search),
          like(competitorIntelligence.strengths, search),
          like(competitorIntelligence.weaknesses, search),
          like(competitorIntelligence.notes, search),
          like(companies.name, search),
        ) : undefined,
      )).orderBy(desc(competitorIntelligence.capturedAt));
  }),

  create: activeProcedure.input(intelligenceFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolveIntelligenceProperty(ctx.user, input.propertyId, input.companyId, input.opportunityId);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const result = await db.insert(competitorIntelligence).values({
      ...input,
      propertyId,
      ownerId,
      capturedAt: input.capturedAt ?? new Date(),
    });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(intelligenceFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertIntelligenceAccess(ctx.user, input.id);
    const propertyId = await resolveIntelligenceProperty(
      ctx.user,
      input.propertyId,
      input.companyId === undefined ? existing.companyId : input.companyId,
      input.opportunityId === undefined ? existing.opportunityId : input.opportunityId,
      existing.propertyId,
    );
    const ownerId = input.ownerId === undefined ? existing.ownerId : resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const { id, ...changes } = input;
    await db.update(competitorIntelligence).set({ ...changes, propertyId, ownerId }).where(eq(competitorIntelligence.id, id));
    return { success: true };
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertIntelligenceAccess(ctx.user, input.id);
    await db.update(competitorIntelligence).set({ archivedAt: new Date() }).where(eq(competitorIntelligence.id, input.id));
    return { success: true };
  }),
});
