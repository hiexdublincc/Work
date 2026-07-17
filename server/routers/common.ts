import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  activities,
  companies,
  contacts,
  leads,
  opportunities,
  properties,
  userPropertyAssignments,
  users,
  type User,
} from "../../drizzle/schema";
import { adminProcedure, protectedProcedure } from "../_core/trpc";
import {
  getAuthorizedPropertyIds,
  propertyScope,
  requireDb,
  scopedWhere,
} from "../db";

export const activeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This account is inactive." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const activeAdminProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This account is inactive." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const idInput = z.object({ id: z.number().int().positive() });
export const listInput = z.object({
  search: z.string().trim().max(200).default(""),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  ownerId: z.number().int().positive().optional(),
  propertyId: z.number().int().positive().optional(),
});

export type RequestUser = Pick<User, "id" | "role" | "isActive">;

export function resolveOwnerId(user: RequestUser, requestedOwnerId?: number) {
  if (user.role === "admin") return requestedOwnerId ?? user.id;
  if (requestedOwnerId && requestedOwnerId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Users may only assign records to themselves." });
  }
  return user.id;
}

export async function assertPropertyAccess(user: RequestUser, propertyId: number) {
  const db = await requireDb();
  const property = await db.select({ id: properties.id, name: properties.name, isActive: properties.isActive })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  if (!property[0] || !property[0].isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Property not found or inactive." });
  }
  if (user.role === "admin") return property[0];

  const assignment = await db.select({ id: userPropertyAssignments.id })
    .from(userPropertyAssignments)
    .where(and(eq(userPropertyAssignments.userId, user.id), eq(userPropertyAssignments.propertyId, propertyId)))
    .limit(1);
  if (!assignment[0]) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this property." });
  }
  return property[0];
}

export async function resolvePropertyId(user: RequestUser, requestedPropertyId?: number) {
  if (requestedPropertyId) {
    await assertPropertyAccess(user, requestedPropertyId);
    return requestedPropertyId;
  }
  if (user.role === "admin") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a property." });
  }
  const ids = await getAuthorizedPropertyIds(user);
  if (ids?.length === 1) return ids[0];
  throw new TRPCError({ code: "BAD_REQUEST", message: "Choose one of your assigned properties." });
}

export async function assertOwnerPropertyCompatibility(ownerId: number, propertyId: number) {
  const db = await requireDb();
  const owner = await db.select({ role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  if (!owner[0] || !owner[0].isActive) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The selected owner is unavailable." });
  }
  if (owner[0].role === "admin") return;

  const assignment = await db.select({ id: userPropertyAssignments.id })
    .from(userPropertyAssignments)
    .where(and(eq(userPropertyAssignments.userId, ownerId), eq(userPropertyAssignments.propertyId, propertyId)))
    .limit(1);
  if (!assignment[0]) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The selected owner is not assigned to this property." });
  }
}

export async function entityAccessCondition(user: RequestUser, propertyColumn: Parameters<typeof propertyScope>[0]) {
  const ids = await getAuthorizedPropertyIds(user);
  return propertyScope(propertyColumn, ids);
}

export async function assertEntityAccess(
  user: RequestUser,
  entityType: "company" | "contact" | "lead" | "opportunity",
  entityId: number,
) {
  const db = await requireDb();
  const table = entityType === "company" ? companies : entityType === "contact" ? contacts : entityType === "lead" ? leads : opportunities;
  const propertyIds = await getAuthorizedPropertyIds(user);
  const rows = await db
    .select({ id: table.id, ownerId: table.ownerId, propertyId: table.propertyId })
    .from(table)
    .where(scopedWhere(eq(table.id, entityId), isNull(table.archivedAt), propertyScope(table.propertyId, propertyIds)))
    .limit(1);

  if (!rows[0]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The related record was not found or is not accessible." });
  }
  return rows[0];
}

export async function assertActivityAccess(user: RequestUser, activityId: number) {
  const db = await requireDb();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const rows = await db
    .select()
    .from(activities)
    .where(scopedWhere(eq(activities.id, activityId), isNull(activities.archivedAt), propertyScope(activities.propertyId, propertyIds)))
    .limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found." });
  return rows[0];
}

export function combineFilters(...conditions: Parameters<typeof and>) {
  return and(...conditions.filter(Boolean));
}
