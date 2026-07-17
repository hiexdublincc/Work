import { and, asc, desc, eq, gte, isNotNull, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
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
  idInput,
  listInput,
  resolveOwnerId,
} from "./common";

const activityFields = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subtype: z.enum(HOTEL_ACTIVITY_SUBTYPES).default("General"),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20000).nullish(),
  entityType: z.enum(ACTIVITY_ENTITY_TYPES),
  entityId: z.number().int().positive(),
  propertyId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional(),
  priority: z.enum(["Low", "Normal", "High"]).default("Normal"),
  dueAt: z.coerce.date().nullish(),
  startedAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  reminderAt: z.coerce.date().nullish(),
});

function entityLinks(entityType: typeof ACTIVITY_ENTITY_TYPES[number], entityId: number) {
  return {
    companyId: entityType === "company" ? entityId : null,
    contactId: entityType === "contact" ? entityId : null,
    leadId: entityType === "lead" ? entityId : null,
    opportunityId: entityType === "opportunity" ? entityId : null,
  };
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
        : input.state === "overdue" ? and(eq(activities.type, "task"), isNull(activities.completedAt), lt(activities.dueAt, now))
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
    const entity = await assertEntityAccess(ctx.user, input.entityType, input.entityId);
    const propertyId = entity.propertyId;
    if (input.propertyId && input.propertyId !== propertyId) {
      throw new Error("Activity and linked record must belong to the same property.");
    }
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    await assertOwnerPropertyCompatibility(ownerId, propertyId);
    const result = await db.insert(activities).values({
      ...input,
      ...entityLinks(input.entityType, input.entityId),
      propertyId,
      ownerId,
      createdById: ctx.user.id,
    });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(activityFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertActivityAccess(ctx.user, input.id);
    const entityType = input.entityType ?? existing.entityType;
    const entityId = input.entityId ?? existing.entityId;
    const entity = await assertEntityAccess(ctx.user, entityType, entityId);
    const propertyId = entity.propertyId;
    if (input.propertyId && input.propertyId !== propertyId) throw new Error("Activity and linked record must belong to the same property.");
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
});
