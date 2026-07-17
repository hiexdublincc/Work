import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import { z } from "zod";
import { properties, users, weeklyUpdates } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import {
  activeProcedure,
  assertOwnerPropertyCompatibility,
  assertPropertyAccess,
  resolveOwnerId,
  resolvePropertyId,
} from "./common";

const updateFields = z.object({
  propertyId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  weekCommencing: z.coerce.date(),
  keyWins: z.string().trim().max(10000).nullish(),
  businessPotential: z.string().trim().max(10000).nullish(),
  keyActivity: z.string().trim().max(10000).nullish(),
  corporateUpdates: z.string().trim().max(10000).nullish(),
  groupUpdates: z.string().trim().max(10000).nullish(),
  eventTradeActivity: z.string().trim().max(10000).nullish(),
  completedActions: z.string().trim().max(10000).nullish(),
  nextWeekPriorities: z.string().trim().max(10000).nullish(),
  isGroupVisible: z.boolean().default(true),
});

async function assertWeeklyUpdateAccess(user: Parameters<typeof assertPropertyAccess>[0], id: number, write = false) {
  const db = await requireDb();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const rows = await db.select().from(weeklyUpdates)
    .where(scopedWhere(eq(weeklyUpdates.id, id), propertyScope(weeklyUpdates.propertyId, propertyIds)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Weekly update not found." });
  if (write && user.role !== "admin" && row.ownerId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the update owner can edit or submit it." });
  }
  return row;
}

export const weeklyUpdatesRouter = router({
  list: activeProcedure.input(z.object({
    propertyId: z.number().int().positive().optional(),
    ownerId: z.number().int().positive().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: z.enum(["Draft", "Submitted"]).optional(),
  }).default({})).query(async ({ ctx, input }) => {
    const db = await requireDb();
    if (input.propertyId) await assertPropertyAccess(ctx.user, input.propertyId);
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    return db.select({
      id: weeklyUpdates.id, propertyId: weeklyUpdates.propertyId, propertyName: properties.name,
      ownerId: weeklyUpdates.ownerId, ownerName: users.name, weekCommencing: weeklyUpdates.weekCommencing,
      keyWins: weeklyUpdates.keyWins, businessPotential: weeklyUpdates.businessPotential,
      keyActivity: weeklyUpdates.keyActivity, corporateUpdates: weeklyUpdates.corporateUpdates,
      groupUpdates: weeklyUpdates.groupUpdates, eventTradeActivity: weeklyUpdates.eventTradeActivity,
      completedActions: weeklyUpdates.completedActions, nextWeekPriorities: weeklyUpdates.nextWeekPriorities,
      status: weeklyUpdates.status, isGroupVisible: weeklyUpdates.isGroupVisible,
      submittedAt: weeklyUpdates.submittedAt, updatedAt: weeklyUpdates.updatedAt,
    }).from(weeklyUpdates)
      .leftJoin(properties, eq(weeklyUpdates.propertyId, properties.id))
      .leftJoin(users, eq(weeklyUpdates.ownerId, users.id))
      .where(scopedWhere(
        propertyScope(weeklyUpdates.propertyId, propertyIds),
        input.propertyId ? eq(weeklyUpdates.propertyId, input.propertyId) : undefined,
        input.ownerId ? eq(weeklyUpdates.ownerId, input.ownerId) : undefined,
        input.from ? gte(weeklyUpdates.weekCommencing, input.from) : undefined,
        input.to ? lte(weeklyUpdates.weekCommencing, input.to) : undefined,
        input.status ? eq(weeklyUpdates.status, input.status) : undefined,
        ctx.user.role === "admin" ? undefined : or(
          eq(weeklyUpdates.ownerId, ctx.user.id),
          and(eq(weeklyUpdates.status, "Submitted"), eq(weeklyUpdates.isGroupVisible, true)),
        ),
      )).orderBy(desc(weeklyUpdates.weekCommencing), desc(weeklyUpdates.updatedAt));
  }),

  get: activeProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const row = await assertWeeklyUpdateAccess(ctx.user, input.id);
    if (ctx.user.role !== "admin" && row.ownerId !== ctx.user.id && (row.status !== "Submitted" || !row.isGroupVisible)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This draft is private to its owner." });
    }
    return row;
  }),

  create: activeProcedure.input(updateFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolvePropertyId(ctx.user, input.propertyId);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const existing = await db.select({ id: weeklyUpdates.id }).from(weeklyUpdates)
      .where(and(eq(weeklyUpdates.propertyId, propertyId), eq(weeklyUpdates.weekCommencing, input.weekCommencing))).limit(1);
    if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "A weekly update already exists for this property and week." });
    const result = await db.insert(weeklyUpdates).values({ ...input, propertyId, ownerId, status: "Draft" });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(updateFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertWeeklyUpdateAccess(ctx.user, input.id, true);
    if (existing.status === "Submitted" && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Submitted updates are locked. Ask an Administrator to amend them." });
    }
    const propertyId = input.propertyId === undefined ? existing.propertyId : await resolvePropertyId(ctx.user, input.propertyId);
    const ownerId = input.ownerId === undefined ? existing.ownerId : resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const { id, ...changes } = input;
    await db.update(weeklyUpdates).set({ ...changes, propertyId, ownerId }).where(eq(weeklyUpdates.id, id));
    return { success: true };
  }),

  submit: activeProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertWeeklyUpdateAccess(ctx.user, input.id, true);
    const hasNarrative = [existing.keyWins, existing.businessPotential, existing.keyActivity, existing.nextWeekPriorities]
      .some(value => Boolean(value?.trim()));
    if (!hasNarrative) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one substantive update before submission." });
    }
    await db.update(weeklyUpdates).set({ status: "Submitted", submittedAt: new Date() }).where(eq(weeklyUpdates.id, input.id));
    return { success: true };
  }),
});
