import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  companies,
  crossPropertyReferrals,
  opportunities,
  properties,
  REFERRAL_STATUSES,
  users,
} from "../../drizzle/schema";
import { getAuthorizedPropertyIds, requireDb, scopedWhere } from "../db";
import { router } from "../_core/trpc";
import {
  activeProcedure,
  assertEntityAccess,
  assertOwnerPropertyCompatibility,
  assertPropertyAccess,
  idInput,
  resolveOwnerId,
} from "./common";

const referralFields = z.object({
  companyId: z.number().int().positive().nullish(),
  opportunityId: z.number().int().positive().nullish(),
  referringPropertyId: z.number().int().positive(),
  receivingPropertyId: z.number().int().positive(),
  status: z.enum(REFERRAL_STATUSES).default("New"),
  valueCents: z.number().int().min(0).default(0),
  roomNights: z.number().int().min(0).default(0),
  notes: z.string().trim().max(10000).nullish(),
  originalOwnerId: z.number().int().positive().optional(),
  currentOwnerId: z.number().int().positive().optional(),
});

function referralAccess(propertyIds: number[] | null) {
  if (propertyIds === null) return undefined;
  if (propertyIds.length === 0) return sql`1 = 0`;
  return or(
    inArray(crossPropertyReferrals.referringPropertyId, propertyIds),
    inArray(crossPropertyReferrals.receivingPropertyId, propertyIds),
  );
}

async function assertReceivingProperty(propertyId: number) {
  const db = await requireDb();
  const row = await db.select({ id: properties.id, isActive: properties.isActive })
    .from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!row[0] || !row[0].isActive) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active receiving property." });
  }
}

async function assertReferralAccess(user: { id: number; role: "admin" | "user"; isActive: boolean }, id: number) {
  const db = await requireDb();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const row = await db.select().from(crossPropertyReferrals).where(scopedWhere(
    eq(crossPropertyReferrals.id, id),
    isNull(crossPropertyReferrals.archivedAt),
    referralAccess(propertyIds),
  )).limit(1);
  if (!row[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Referral not found or unavailable." });
  return row[0];
}

export const referralsRouter = router({
  list: activeProcedure.input(z.object({
    search: z.string().trim().max(200).default(""),
    propertyId: z.number().int().positive().optional(),
    status: z.enum(REFERRAL_STATUSES).optional(),
    direction: z.enum(["all", "sent", "received"]).default("all"),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    if (input.propertyId && propertyIds !== null && !propertyIds.includes(input.propertyId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this property." });
    }
    const selectedProperty = input.propertyId;
    const directional = selectedProperty
      ? input.direction === "sent" ? eq(crossPropertyReferrals.referringPropertyId, selectedProperty)
        : input.direction === "received" ? eq(crossPropertyReferrals.receivingPropertyId, selectedProperty)
          : or(eq(crossPropertyReferrals.referringPropertyId, selectedProperty), eq(crossPropertyReferrals.receivingPropertyId, selectedProperty))
      : undefined;
    const search = input.search ? `%${input.search}%` : undefined;
    return db.select({
      id: crossPropertyReferrals.id,
      status: crossPropertyReferrals.status,
      valueCents: crossPropertyReferrals.valueCents,
      roomNights: crossPropertyReferrals.roomNights,
      notes: crossPropertyReferrals.notes,
      referringPropertyId: crossPropertyReferrals.referringPropertyId,
      referringPropertyName: sql<string>`referring.name`,
      receivingPropertyId: crossPropertyReferrals.receivingPropertyId,
      receivingPropertyName: sql<string>`receiving.name`,
      companyId: crossPropertyReferrals.companyId,
      companyName: companies.name,
      opportunityId: crossPropertyReferrals.opportunityId,
      opportunityName: opportunities.name,
      originalOwnerId: crossPropertyReferrals.originalOwnerId,
      originalOwnerName: sql<string | null>`originalOwner.name`,
      currentOwnerId: crossPropertyReferrals.currentOwnerId,
      currentOwnerName: sql<string | null>`currentOwner.name`,
      completedAt: crossPropertyReferrals.completedAt,
      createdAt: crossPropertyReferrals.createdAt,
      updatedAt: crossPropertyReferrals.updatedAt,
    }).from(crossPropertyReferrals)
      .leftJoin(sql`${properties} referring`, sql`referring.id = ${crossPropertyReferrals.referringPropertyId}`)
      .leftJoin(sql`${properties} receiving`, sql`receiving.id = ${crossPropertyReferrals.receivingPropertyId}`)
      .leftJoin(companies, eq(crossPropertyReferrals.companyId, companies.id))
      .leftJoin(opportunities, eq(crossPropertyReferrals.opportunityId, opportunities.id))
      .leftJoin(sql`${users} originalOwner`, sql`originalOwner.id = ${crossPropertyReferrals.originalOwnerId}`)
      .leftJoin(sql`${users} currentOwner`, sql`currentOwner.id = ${crossPropertyReferrals.currentOwnerId}`)
      .where(scopedWhere(
        isNull(crossPropertyReferrals.archivedAt), referralAccess(propertyIds), directional,
        input.status ? eq(crossPropertyReferrals.status, input.status) : undefined,
        search ? or(like(companies.name, search), like(opportunities.name, search), like(crossPropertyReferrals.notes, search)) : undefined,
      )).orderBy(desc(crossPropertyReferrals.updatedAt));
  }),

  create: activeProcedure.input(referralFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    if (input.referringPropertyId === input.receivingPropertyId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Referring and receiving properties must be different." });
    }
    await assertPropertyAccess(ctx.user, input.referringPropertyId);
    await assertReceivingProperty(input.receivingPropertyId);
    if (input.companyId) {
      const company = await assertEntityAccess(ctx.user, "company", input.companyId);
      if (company.propertyId !== input.referringPropertyId) throw new TRPCError({ code: "BAD_REQUEST", message: "The Company must belong to the referring property." });
    }
    if (input.opportunityId) {
      const opportunity = await assertEntityAccess(ctx.user, "opportunity", input.opportunityId);
      if (opportunity.propertyId !== input.referringPropertyId) throw new TRPCError({ code: "BAD_REQUEST", message: "The Opportunity must belong to the referring property." });
    }
    const originalOwnerId = resolveOwnerId(ctx.user, input.originalOwnerId);
    const currentOwnerId = input.currentOwnerId ?? originalOwnerId;
    await assertOwnerPropertyCompatibility(originalOwnerId, input.referringPropertyId);
    await assertOwnerPropertyCompatibility(currentOwnerId, input.receivingPropertyId);
    const result = await db.insert(crossPropertyReferrals).values({
      ...input,
      originalOwnerId,
      currentOwnerId,
      createdById: ctx.user.id,
      completedAt: input.status === "Won" || input.status === "Lost" ? new Date() : null,
    });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(referralFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertReferralAccess(ctx.user, input.id);
    const receivingPropertyId = input.receivingPropertyId ?? existing.receivingPropertyId;
    const currentOwnerId = input.currentOwnerId ?? existing.currentOwnerId;
    if (input.receivingPropertyId) await assertReceivingProperty(input.receivingPropertyId);
    if (input.currentOwnerId || input.receivingPropertyId) await assertOwnerPropertyCompatibility(currentOwnerId, receivingPropertyId);
    const { id, ...changes } = input;
    const resultingStatus = input.status ?? existing.status;
    await db.update(crossPropertyReferrals).set({
      ...changes,
      completedAt: resultingStatus === "Won" || resultingStatus === "Lost" ? existing.completedAt ?? new Date() : null,
    }).where(eq(crossPropertyReferrals.id, id));
    return { success: true };
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertReferralAccess(ctx.user, input.id);
    await db.update(crossPropertyReferrals).set({ archivedAt: new Date() }).where(eq(crossPropertyReferrals.id, input.id));
    return { success: true };
  }),
});
