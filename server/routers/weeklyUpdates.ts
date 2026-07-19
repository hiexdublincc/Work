import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { achievements, activities, companies, contacts, leads, opportunities, properties, users, weeklyUpdates } from "../../drizzle/schema";
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

  generateDraft: activeProcedure.input(z.object({
    propertyId: z.number().int().positive().optional(),
    ownerId: z.number().int().positive().optional(),
    weekCommencing: z.coerce.date(),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolvePropertyId(ctx.user, input.propertyId);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);

    const weekStart = input.weekCommencing;
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
    const nextWeekEnd = new Date(weekEnd.getTime() + 7 * 86_400_000);

    const [weekActivities, movedOpportunities, weekAchievements, upcomingTasks] = await Promise.all([
      db.select({
        id: activities.id, type: activities.type, subtype: activities.subtype, title: activities.title,
        description: activities.description,
        entityName: sql<string>`coalesce(${companies.name}, concat(${contacts.firstName}, ' ', ${contacts.lastName}), concat(${leads.firstName}, ' ', ${leads.lastName}), ${opportunities.name})`,
        startedAt: activities.startedAt, completedAt: activities.completedAt, dueAt: activities.dueAt,
      }).from(activities)
        .leftJoin(companies, eq(activities.companyId, companies.id))
        .leftJoin(contacts, eq(activities.contactId, contacts.id))
        .leftJoin(leads, eq(activities.leadId, leads.id))
        .leftJoin(opportunities, eq(activities.opportunityId, opportunities.id))
        .where(scopedWhere(
          isNull(activities.archivedAt), eq(activities.propertyId, propertyId), eq(activities.ownerId, ownerId),
          gte(activities.createdAt, weekStart), lt(activities.createdAt, weekEnd),
        )).orderBy(asc(activities.createdAt)),
      db.select({
        id: opportunities.id, name: opportunities.name, stage: opportunities.stage, valueCents: opportunities.valueCents,
        companyName: companies.name,
      }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .where(scopedWhere(
          isNull(opportunities.archivedAt), eq(opportunities.propertyId, propertyId), eq(opportunities.ownerId, ownerId),
          gte(opportunities.stageChangedAt, weekStart), lt(opportunities.stageChangedAt, weekEnd),
        )).orderBy(asc(opportunities.stageChangedAt)),
      db.select({
        id: achievements.id, organizationActivity: achievements.organizationActivity, status: achievements.status,
        potentialValueCents: achievements.potentialValueCents, eventDate: achievements.eventDate,
        nights: achievements.nights, roomNights: achievements.roomNights, companyName: companies.name,
      }).from(achievements)
        .leftJoin(companies, eq(achievements.companyId, companies.id))
        .where(scopedWhere(
          isNull(achievements.archivedAt), eq(achievements.propertyId, propertyId), eq(achievements.ownerId, ownerId),
          gte(achievements.createdAt, weekStart), lt(achievements.createdAt, weekEnd),
        )).orderBy(desc(achievements.potentialValueCents)),
      db.select({ id: activities.id, title: activities.title, dueAt: activities.dueAt })
        .from(activities)
        .where(scopedWhere(
          isNull(activities.archivedAt), eq(activities.propertyId, propertyId), eq(activities.ownerId, ownerId),
          isNotNull(activities.dueAt), isNull(activities.completedAt),
          gte(activities.dueAt, weekEnd), lt(activities.dueAt, nextWeekEnd),
        )).orderBy(asc(activities.dueAt)),
    ]);

    const eventSubtypes = new Set(["Event attended", "Webinar attended", "Sales trip"]);
    const corporateSubtypes = new Set(["RFP received", "RFP submitted", "Contract signed", "Proposal sent"]);
    const money = (cents: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(cents / 100);
    const date = (value: Date | string) => new Date(value).toLocaleDateString("en-GB");
    const bullet = (lines: string[]) => (lines.length ? lines.map(line => `- ${line}`).join("\n") : "");

    const wonOpportunities = movedOpportunities.filter(item => item.stage === "Closed Won");
    const openMoved = movedOpportunities.filter(item => item.stage !== "Closed Won" && item.stage !== "Closed Lost");
    const completedActivities = weekActivities.filter(item => item.completedAt);

    // Top 5 wins ranked by potential value, formatted to match the group's weekly reporting template:
    // "Company - £value | date | N night | M rooms – Status"
    const topWins = weekAchievements.slice(0, 5).map(item => {
      const parts = [
        `**${item.companyName || item.organizationActivity}**`,
        item.potentialValueCents ? money(item.potentialValueCents) : null,
        item.eventDate ? date(item.eventDate) : null,
        item.nights ? `${item.nights} night${item.nights === 1 ? "" : "s"}` : null,
        item.roomNights ? `${item.roomNights} rooms` : null,
      ].filter(Boolean);
      return `${parts.join(" | ")} – ${item.status}`;
    });

    const activityVerb: Record<string, string> = {
      "Call made": "Had a call with",
      "Email sent": "Sent a proposal to",
      "Meeting held": "Met with",
      "Appointment booked": "Had a catch-up with",
      "Site visit/showaround": "Conducted a show-around for",
      "Webinar attended": "Attended a webinar hosted by",
      "Sales trip": "Attended a sales trip meeting with",
      "Event attended": "Attended an event with",
      "Follow-up completed": "Completed a follow-up with",
      "Proposal sent": "Sent a proposal to",
      "RFP received": "Received an RFP from",
      "RFP submitted": "Submitted an RFP response to",
      "Contract signed": "Signed a contract with",
    };
    const narrativeActivity = (item: (typeof weekActivities)[number]) => {
      const verb = activityVerb[item.subtype];
      const subject = item.entityName ? `**${item.entityName}**` : null;
      const lead = verb && subject ? `${verb} ${subject}` : subject ? `${item.subtype} with ${subject}` : item.title;
      const detail = item.description?.trim();
      return `${lead}${detail ? `, ${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : ""}.`;
    };

    return {
      weekLabel: `${date(weekStart)} - ${date(new Date(weekEnd.getTime() - 86_400_000))}`,
      keyWins: bullet(topWins),
      businessPotential: bullet([
        ...openMoved.map(item => `${item.name}${item.companyName ? ` (${item.companyName})` : ""} — ${item.stage}, ${money(item.valueCents)}`),
        ...wonOpportunities.map(item => `Closed Won: ${item.name}${item.companyName ? ` (${item.companyName})` : ""} — ${money(item.valueCents)}`),
      ]),
      keyActivity: bullet(weekActivities.map(narrativeActivity)),
      corporateUpdates: bullet(weekActivities.filter(item => corporateSubtypes.has(item.subtype)).map(item => `${item.subtype}: ${item.title}${item.entityName ? ` (${item.entityName})` : ""}`)),
      groupUpdates: "",
      eventTradeActivity: bullet(weekActivities.filter(item => eventSubtypes.has(item.subtype)).map(item => `${item.subtype}: ${item.title}`)),
      completedActions: bullet(completedActivities.map(item => item.title)),
      nextWeekPriorities: bullet(upcomingTasks.map(item => `${item.title}${item.dueAt ? ` (due ${item.dueAt.toISOString().slice(0, 10)})` : ""}`)),
    };
  }),
});
