import { and, asc, desc, eq, gte, isNotNull, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  achievements,
  activities,
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
  companies,
  contacts,
  HOTEL_ACTIVITY_SUBTYPES,
  leads,
  opportunities,
  properties,
  users,
} from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import {
  activeProcedure,
  assertActivityAccess,
  assertEntityAccess,
  assertOwnerPropertyCompatibility,
  assertPropertyAccess,
  idInput,
  listInput,
  resolveOwnerId,
  resolvePropertyId,
} from "./common";

const activityFields = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subtype: z.enum(HOTEL_ACTIVITY_SUBTYPES).default("General"),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20000).nullish(),
  entityType: z.enum(ACTIVITY_ENTITY_TYPES).nullish(),
  entityId: z.number().int().positive().nullish(),
  propertyId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  priority: z.enum(["Low", "Normal", "High"]).default("Normal"),
  dueAt: z.coerce.date().nullish(),
  startedAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  reminderAt: z.coerce.date().nullish(),
});

function entityLinks(entityType: typeof ACTIVITY_ENTITY_TYPES[number] | null | undefined, entityId: number | null | undefined) {
  return {
    companyId: entityType === "company" ? entityId : null,
    contactId: entityType === "contact" ? entityId : null,
    leadId: entityType === "lead" ? entityId : null,
    opportunityId: entityType === "opportunity" ? entityId : null,
  };
}

// Keeps Companies' account-health scoring honest: a logged activity (direct, via a contact, or
// via an opportunity) refreshes the company's lastActivityAt instead of relying on manual upkeep.
async function touchCompanyLastActivity(
  db: Awaited<ReturnType<typeof requireDb>>,
  entityType: typeof ACTIVITY_ENTITY_TYPES[number] | null | undefined,
  entityId: number | null | undefined,
  at: Date,
) {
  if (!entityType || !entityId) return;
  let companyId: number | null = null;
  if (entityType === "company") companyId = entityId;
  else if (entityType === "contact") {
    const rows = await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, entityId)).limit(1);
    companyId = rows[0]?.companyId ?? null;
  } else if (entityType === "opportunity") {
    const rows = await db.select({ companyId: opportunities.companyId }).from(opportunities).where(eq(opportunities.id, entityId)).limit(1);
    companyId = rows[0]?.companyId ?? null;
  }
  if (companyId) await db.update(companies).set({ lastActivityAt: at }).where(eq(companies.id, companyId));
}

// Companies/contacts are shared across the group and have no property of their own, so only a
// linked lead/opportunity can pin an activity to a property; otherwise fall back to the user's own.
async function resolveActivityProperty(
  ctx: { user: Parameters<typeof resolvePropertyId>[0] },
  entityType: typeof ACTIVITY_ENTITY_TYPES[number] | null | undefined,
  entityId: number | null | undefined,
  requestedPropertyId: number | undefined,
) {
  if (!entityType !== !entityId) {
    throw new Error("Select both a record type and a record to link, or leave both empty.");
  }
  if (!entityType || !entityId) {
    return resolvePropertyId(ctx.user, requestedPropertyId);
  }
  const entity = await assertEntityAccess(ctx.user, entityType, entityId);
  if ((entityType === "lead" || entityType === "opportunity") && entity.propertyId !== undefined) {
    if (requestedPropertyId && requestedPropertyId !== entity.propertyId) {
      throw new Error("Activity and linked record must belong to the same property.");
    }
    return entity.propertyId;
  }
  return resolvePropertyId(ctx.user, requestedPropertyId);
}

const activitySelection = {
  id: activities.id,
  type: activities.type,
  subtype: activities.subtype,
  title: activities.title,
  description: activities.description,
  entityType: activities.entityType,
  entityId: activities.entityId,
  entityName: sql<string>`coalesce(${companies.name}, concat(${contacts.firstName}, ' ', ${contacts.lastName}), concat(${leads.firstName}, ' ', ${leads.lastName}), ${opportunities.name})`,
  companyId: activities.companyId,
  contactId: activities.contactId,
  leadId: activities.leadId,
  opportunityId: activities.opportunityId,
  propertyId: activities.propertyId,
  propertyName: properties.name,
  ownerId: activities.ownerId,
  ownerName: users.name,
  priority: activities.priority,
  dueAt: activities.dueAt,
  startedAt: activities.startedAt,
  endsAt: activities.endsAt,
  reminderAt: activities.reminderAt,
  completedAt: activities.completedAt,
  updatedAt: activities.updatedAt,
  createdAt: activities.createdAt,
};

export const activitiesRouter = router({
  list: activeProcedure.input(listInput.extend({
    type: z.enum(ACTIVITY_TYPES).optional(),
    subtype: z.enum(HOTEL_ACTIVITY_SUBTYPES).optional(),
    entityType: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
    entityId: z.number().int().positive().optional(),
    state: z.enum(["open", "completed", "overdue", "all"]).default("all"),
    sort: z.enum(["due", "updated", "created"]).default("due"),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const now = new Date();
    const stateCondition = input.state === "open" ? isNull(activities.completedAt)
      : input.state === "completed" ? isNotNull(activities.completedAt)
        : input.state === "overdue" ? and(isNotNull(activities.dueAt), isNull(activities.completedAt), lt(activities.dueAt, now))
          : undefined;
    const where = scopedWhere(
      isNull(activities.archivedAt), propertyScope(activities.propertyId, propertyIds),
      input.propertyId ? eq(activities.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(activities.ownerId, input.ownerId) : undefined,
      input.type ? eq(activities.type, input.type) : undefined,
      input.subtype ? eq(activities.subtype, input.subtype) : undefined,
      input.entityType ? eq(activities.entityType, input.entityType) : undefined,
      input.entityId ? eq(activities.entityId, input.entityId) : undefined,
      stateCondition,
      input.search ? or(like(activities.title, `%${input.search}%`), like(activities.description, `%${input.search}%`)) : undefined,
    );
    const order = input.sort === "updated" ? desc(activities.updatedAt)
      : input.sort === "created" ? desc(activities.createdAt) : asc(activities.dueAt);
    const base = db.select(activitySelection).from(activities)
      .leftJoin(companies, eq(activities.companyId, companies.id))
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .leftJoin(leads, eq(activities.leadId, leads.id))
      .leftJoin(opportunities, eq(activities.opportunityId, opportunities.id))
      .leftJoin(properties, eq(activities.propertyId, properties.id))
      .leftJoin(users, eq(activities.ownerId, users.id));
    const [rows, totals] = await Promise.all([
      base.where(where).orderBy(order).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(activities).where(where),
    ]);
    return { items: rows, total: Number(totals[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),

  calendar: activeProcedure.input(z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    propertyId: z.number().int().positive().optional(),
    ownerId: z.number().int().positive().optional(),
    type: z.enum(ACTIVITY_TYPES).optional(),
    subtype: z.enum(HOTEL_ACTIVITY_SUBTYPES).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    return db.select(activitySelection).from(activities)
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
        input.type ? eq(activities.type, input.type) : undefined,
        input.subtype ? eq(activities.subtype, input.subtype) : undefined,
        or(
          and(gte(activities.startedAt, input.from), lte(activities.startedAt, input.to)),
          and(gte(activities.dueAt, input.from), lte(activities.dueAt, input.to)),
        ),
      )).orderBy(asc(activities.startedAt), asc(activities.dueAt));
  }),

  get: activeProcedure.input(idInput).query(async ({ ctx, input }) => assertActivityAccess(ctx.user, input.id)),

  create: activeProcedure.input(activityFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyId = await resolveActivityProperty(ctx, input.entityType, input.entityId, input.propertyId);
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const result = await db.insert(activities).values({
      ...input,
      ...entityLinks(input.entityType, input.entityId),
      propertyId,
      ownerId,
      createdById: ctx.user.id,
    });
    await touchCompanyLastActivity(db, input.entityType, input.entityId, new Date());
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(activityFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertActivityAccess(ctx.user, input.id);
    const entityType = input.entityType === undefined ? existing.entityType : input.entityType;
    const entityId = input.entityId === undefined ? existing.entityId : input.entityId;
    const propertyId = await resolveActivityProperty(ctx, entityType, entityId, input.propertyId);
    const { id, ownerId: requestedOwnerId, propertyId: _ignored, ...changes } = input;
    const ownerId = requestedOwnerId === undefined ? existing.ownerId : resolveOwnerId(ctx.user, requestedOwnerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    await db.update(activities).set({
      ...changes,
      ...entityLinks(entityType, entityId),
      entityType,
      entityId,
      propertyId,
      ownerId,
    }).where(eq(activities.id, id));
    await touchCompanyLastActivity(db, entityType, entityId, new Date());
    return { success: true };
  }),

  setCompleted: activeProcedure.input(z.object({ id: z.number().int().positive(), completed: z.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertActivityAccess(ctx.user, input.id);
    await db.update(activities).set({ completedAt: input.completed ? new Date() : null }).where(eq(activities.id, input.id));
    return { success: true };
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertActivityAccess(ctx.user, input.id);
    await db.update(activities).set({ archivedAt: new Date() }).where(eq(activities.id, input.id));
    return { success: true };
  }),

  // A live report built directly from Activities + Achievements for one property over a chosen
  // date range — no separate drafted/submitted record, just what was actually logged by anyone
  // at that property.
  weeklyReport: activeProcedure.input(z.object({
    propertyId: z.number().int().positive(),
    from: z.coerce.date(),
    to: z.coerce.date(),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const property = await assertPropertyAccess(ctx.user, input.propertyId);

    const rangeStart = input.from;
    const rangeEnd = new Date(input.to.getTime() + 86_400_000);

    const [rangeActivities, rangeAchievements] = await Promise.all([
      db.select({
        id: activities.id, subtype: activities.subtype, title: activities.title, description: activities.description,
        entityName: sql<string>`coalesce(${companies.name}, concat(${contacts.firstName}, ' ', ${contacts.lastName}), concat(${leads.firstName}, ' ', ${leads.lastName}), ${opportunities.name})`,
      }).from(activities)
        .leftJoin(companies, eq(activities.companyId, companies.id))
        .leftJoin(contacts, eq(activities.contactId, contacts.id))
        .leftJoin(leads, eq(activities.leadId, leads.id))
        .leftJoin(opportunities, eq(activities.opportunityId, opportunities.id))
        .where(and(
          isNull(activities.archivedAt), eq(activities.propertyId, input.propertyId),
          gte(activities.createdAt, rangeStart), lt(activities.createdAt, rangeEnd),
        )).orderBy(asc(activities.createdAt)),
      db.select({
        id: achievements.id, organizationActivity: achievements.organizationActivity, status: achievements.status,
        potentialValueCents: achievements.potentialValueCents, eventDate: achievements.eventDate,
        nights: achievements.nights, roomNights: achievements.roomNights, companyName: companies.name,
      }).from(achievements)
        .leftJoin(companies, eq(achievements.companyId, companies.id))
        .where(and(
          isNull(achievements.archivedAt), eq(achievements.propertyId, input.propertyId),
          gte(achievements.createdAt, rangeStart), lt(achievements.createdAt, rangeEnd),
        )).orderBy(desc(achievements.potentialValueCents)),
    ]);

    const money = (cents: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(cents / 100);
    const date = (value: Date | string) => new Date(value).toLocaleDateString("en-GB");
    const bullet = (lines: string[]) => (lines.length ? lines.map(line => `- ${line}`).join("\n") : "");

    const topWins = rangeAchievements.slice(0, 5).map(item => {
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
    const narrativeActivity = (item: (typeof rangeActivities)[number]) => {
      const verb = activityVerb[item.subtype];
      const subject = item.entityName ? `**${item.entityName}**` : null;
      const lead = verb && subject ? `${verb} ${subject}` : subject ? `${item.subtype} with ${subject}` : item.title;
      const detail = item.description?.trim();
      return `${lead}${detail ? `, ${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : ""}.`;
    };

    return {
      propertyName: property.name,
      rangeLabel: `${date(rangeStart)} - ${date(input.to)}`,
      keyWins: bullet(topWins),
      keyActivity: bullet(rangeActivities.map(narrativeActivity)),
    };
  }),
});
