import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { properties, systemSettings, userPropertyAssignments, users } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import { activeAdminProcedure } from "./common";

const nullableText = (max: number) => z.string().trim().max(max).nullish();

export const adminRouter = router({
  users: activeAdminProcedure
    .input(z.object({
      search: z.string().trim().max(200).default(""),
      role: z.enum(["admin", "user"]).optional(),
      active: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [userRows, propertyRows, assignments] = await Promise.all([
        db.select({
          id: users.id, name: users.name, email: users.email, role: users.role,
          isActive: users.isActive, jobTitle: users.jobTitle, department: users.department,
          lastSignedIn: users.lastSignedIn, createdAt: users.createdAt,
        }).from(users)
          .where(input.search || input.role || input.active !== undefined
            ? and(
                input.search ? or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`)) : undefined,
                input.role ? eq(users.role, input.role) : undefined,
                input.active !== undefined ? eq(users.isActive, input.active) : undefined,
              )
            : undefined)
          .orderBy(asc(users.name)),
        db.select({ id: properties.id, name: properties.name, city: properties.city, code: properties.code, isActive: properties.isActive })
          .from(properties).orderBy(asc(properties.name)),
        db.select({ userId: userPropertyAssignments.userId, propertyId: userPropertyAssignments.propertyId })
          .from(userPropertyAssignments),
      ]);
      return {
        users: userRows.map(user => ({
          ...user,
          propertyIds: assignments.filter(item => item.userId === user.id).map(item => item.propertyId),
        })),
        properties: propertyRows,
      };
    }),

  updateUser: activeAdminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      role: z.enum(["admin", "user"]),
      isActive: z.boolean(),
      jobTitle: nullableText(160),
      department: nullableText(160),
      propertyIds: z.array(z.number().int().positive()).max(100).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      if (input.id === ctx.user.id && (input.role !== "admin" || !input.isActive)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own active Admin access." });
      }
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, input.id)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      const propertyIds = Array.from(new Set(input.propertyIds));
      if (input.role === "user" && input.isActive && propertyIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Active Users must be assigned to at least one property." });
      }
      if (propertyIds.length) {
        const valid = await db.select({ id: properties.id }).from(properties)
          .where(and(inArray(properties.id, propertyIds), eq(properties.isActive, true)));
        if (valid.length !== propertyIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected properties are unavailable." });
        }
      }
      await db.transaction(async tx => {
        await tx.update(users).set({
          role: input.role, isActive: input.isActive,
          jobTitle: input.jobTitle, department: input.department,
        }).where(eq(users.id, input.id));
        await tx.delete(userPropertyAssignments).where(eq(userPropertyAssignments.userId, input.id));
        if (propertyIds.length) {
          await tx.insert(userPropertyAssignments).values(propertyIds.map(propertyId => ({
            userId: input.id,
            propertyId,
            assignedById: ctx.user.id,
          })));
        }
      });
      return { success: true };
    }),

  properties: activeAdminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(properties).orderBy(asc(properties.name));
  }),

  updateProperty: activeAdminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(240),
      code: z.string().trim().min(1).max(32),
      city: z.string().trim().min(1).max(120),
      country: z.string().trim().min(1).max(120).default("United Kingdom"),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const existing = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, input.id)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
      await db.update(properties).set({
        name: input.name, code: input.code, city: input.city,
        country: input.country, isActive: input.isActive,
      }).where(eq(properties.id, input.id));
      return { success: true };
    }),

  settings: activeAdminProcedure.query(async () => {
    const db = await requireDb();
    const current = await db.select().from(systemSettings).limit(1);
    if (current[0]) return current[0];
    const created = await db.insert(systemSettings).values({ organizationName: "JMK Group" });
    const rows = await db.select().from(systemSettings).where(eq(systemSettings.id, Number(created[0].insertId))).limit(1);
    return rows[0];
  }),

  updateSettings: activeAdminProcedure
    .input(z.object({
      organizationName: z.string().trim().min(1).max(240),
      defaultCurrency: z.string().trim().length(3).transform(value => value.toUpperCase()),
      timezone: z.string().trim().min(1).max(120),
      fiscalYearStartMonth: z.number().int().min(1).max(12),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const current = await db.select({ id: systemSettings.id }).from(systemSettings).limit(1);
      if (current[0]) {
        await db.update(systemSettings).set({ ...input, updatedById: ctx.user.id }).where(eq(systemSettings.id, current[0].id));
      } else {
        await db.insert(systemSettings).values({ ...input, updatedById: ctx.user.id });
      }
      return { success: true };
    }),
});
