import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, isNull, like, lte, or } from "drizzle-orm";
import { z } from "zod";
import {
  ACHIEVEMENT_STATUSES,
  achievements,
  companies,
  opportunities,
  properties,
  users,
} from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import {
  activeProcedure,
  assertEntityAccess,
  assertOwnerPropertyCompatibility,
  assertPropertyAccess,
  resolveOwnerId,
  resolvePropertyId,
} from "./common";

const achievementFields = z.object({
  propertyId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  month: z.coerce.date(),
  organizationActivity: z.string().trim().min(1).max(300),
  potentialValueCents: z.number().int().min(0).default(0),
  averageRateCents: z.number().int().min(0).default(0),
  city: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(10000).nullish(),
  status: z.enum(ACHIEVEMENT_STATUSES).default("Confirmed"),
  companyId: z.number().int().positive().nullish(),
  opportunityId: z.number().int().positive().nullish(),
});

async function assertAchievementAccess(user: Parameters<typeof assertPropertyAccess>[0], id: number) {
  const db = await requireDb();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const rows = await db.select().from(achievements)
    .where(scopedWhere(eq(achievements.id, id), isNull(achievements.archivedAt), propertyScope(achievements.propertyId, propertyIds)))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Achievement not found." });
  return rows[0];
}

async function validateLinks(
  user: Parameters<typeof assertPropertyAccess>[0],
  propertyId: number,
  companyId?: number | null,
  opportunityId?: number | null,
) {
  if (companyId) {
    const company = await assertEntityAccess(user, "company", companyId);
    if (company.propertyId !== propertyId) throw new TRPCError({ code: "BAD_REQUEST", message: "The Company belongs to a different property." });
  }
  if (opportunityId) {
    const opportunity = await assertEntityAccess(user, "opportunity", opportunityId);
    if (opportunity.propertyId !== propertyId) throw new TRPCError({ code: "BAD_REQUEST", message: "The Opportunity belongs to a different property." });
  }
}

export const achievementsRouter = router({
  list: activeProcedure.input(z.object({
    search: z.string().trim().max(200).default(""),
    propertyId: z.number().int().positive().optional(),
    ownerId: z.number().int().positive().optional(),
    status: z.enum(ACHIEVEMENT_STATUSES).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).default({ search: "" })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    if (input.propertyId) await assertPropertyAccess(ctx.user, input.propertyId);
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const search = input.search ? `%${input.search}%` : undefined;
    return db.select({
      id: achievements.id, propertyId: achievements.propertyId, propertyName: properties.name,
      ownerId: achievements.ownerId, ownerName: users.name, month: achievements.month,
      organizationActivity: achievements.organizationActivity,
      potentialValueCents: achievements.potentialValueCents, averageRateCents: achievements.averageRateCents,
      city: achievements.city, notes: achievements.notes, status: achievements.status,
      companyId: achievements.companyId, companyName: companies.name,
      opportunityId: achievements.opportunityId, opportunityName: opportunities.name,
      updatedAt: achievements.updatedAt,
    }).from(achievements)
      .leftJoin(properties, eq(achievements.propertyId, properties.id))
      .leftJoin(users, eq(achievements.ownerId, users.id))
      .leftJoin(companies, eq(achievements.companyId, companies.id))
      .leftJoin(opportunities, eq(achievements.opportunityId, opportunities.id))
      .where(scopedWhere(
        isNull(achievements.archivedAt), propertyScope(achievements.propertyId, propertyIds),
        input.propertyId ? eq(achievements.propertyId, input.propertyId) : undefined,
        input.ownerId ? eq(achievements.ownerId, input.ownerId) : undefined,
        input.status ? eq(achievements.status, input.status) : undefined,
        input.from ? gte(achievements.month, input.from) : undefined,
        input.to ? lte(achievements.month, input.to) : undefined,
        search ? or(like(achievements.organizationActivity, search), like(achievements.city, search), like(achievements.notes, search)) : undefined,
      )).orderBy(desc(achievements.month), desc(achievements.updatedAt));
  }),

  get: activeProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    return assertAchievementAccess(ctx.user, input.id);
  }),

  create: activeProcedure.input(achievementFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolvePropertyId(ctx.user, input.propertyId);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    await validateLinks(ctx.user, propertyId, input.companyId, input.opportunityId);
    const result = await db.insert(achievements).values({ ...input, propertyId, ownerId });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(achievementFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertAchievementAccess(ctx.user, input.id);
    const propertyId = input.propertyId === undefined ? existing.propertyId : await resolvePropertyId(ctx.user, input.propertyId);
    const ownerId = input.ownerId === undefined ? existing.ownerId : resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    await validateLinks(
      ctx.user, propertyId,
      input.companyId === undefined ? existing.companyId : input.companyId,
      input.opportunityId === undefined ? existing.opportunityId : input.opportunityId,
    );
    const { id, ...changes } = input;
    await db.update(achievements).set({ ...changes, propertyId, ownerId }).where(eq(achievements.id, id));
    return { success: true };
  }),

  archive: activeProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertAchievementAccess(ctx.user, input.id);
    await db.update(achievements).set({ archivedAt: new Date() }).where(eq(achievements.id, input.id));
    return { success: true };
  }),
});
