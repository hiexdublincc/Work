import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { ACCOUNT_CATEGORIES, ACCOUNT_TIERS, activities, companies, contacts, opportunities, users } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { requireDb } from "../db";
import {
  activeProcedure,
  assertEntityAccess,
  idInput,
  listInput,
  resolveOwnerId,
} from "./common";

const nullableText = (max: number) => z.string().trim().max(max).nullish();
const nullableDate = z.coerce.date().nullish();
const companyFields = z.object({
  name: z.string().trim().min(1).max(240),
  legalName: nullableText(240), website: nullableText(500), email: nullableText(320), phone: nullableText(80),
  industry: nullableText(160), category: z.enum(ACCOUNT_CATEGORIES).default("Corporate"), tier: z.enum(ACCOUNT_TIERS).default("Standard"), segment: nullableText(160),
  destinationCity: nullableText(120), leadSource: nullableText(160),
  preferredRateType: nullableText(120), productionHistory: nullableText(20000),
  potentialRoomNights: z.number().int().min(0).default(0), potentialRevenueCents: z.number().int().min(0).default(0),
  relationshipStatus: nullableText(120), lastActivityAt: z.coerce.date().nullish(), nextFollowUpAt: z.coerce.date().nullish(),
  contractStartDate: nullableDate, contractExpiryDate: nullableDate,
  status: z.enum(["Prospect", "Active", "Inactive"]).default("Prospect"), employeeCount: z.number().int().min(0).nullish(),
  annualRevenueCents: z.number().int().min(0).nullish(), addressLine1: nullableText(240), addressLine2: nullableText(240),
  city: nullableText(120), region: nullableText(120), postalCode: nullableText(40), country: nullableText(120),
  description: nullableText(10000), notes: nullableText(20000), ownerId: z.number().int().positive().optional(),
});

type HealthSource = {
  status: "Prospect" | "Active" | "Inactive";
  lastActivityAt: Date | null;
  nextFollowUpAt: Date | null;
  contractExpiryDate: Date | null;
};

export function calculateAccountHealth(company: HealthSource) {
  const now = Date.now();
  const day = 86_400_000;
  const reasons: string[] = [];
  let risk = 0;

  if (company.status === "Inactive") return { state: "At Risk" as const, reasons: ["Account is inactive"] };
  if (!company.lastActivityAt) { reasons.push("No activity has been recorded"); risk += 2; }
  else {
    const inactiveDays = Math.floor((now - company.lastActivityAt.getTime()) / day);
    if (inactiveDays >= 60) { reasons.push(`No activity for ${inactiveDays} days`); risk += 3; }
    else if (inactiveDays >= 30) { reasons.push(`No activity for ${inactiveDays} days`); risk += 2; }
  }
  if (company.nextFollowUpAt && company.nextFollowUpAt.getTime() < now) {
    const overdueDays = Math.max(1, Math.floor((now - company.nextFollowUpAt.getTime()) / day));
    reasons.push(`Follow-up is ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`);
    risk += overdueDays >= 7 ? 3 : 2;
  } else if (company.status === "Active" && !company.nextFollowUpAt) {
    reasons.push("No next follow-up is scheduled");
    risk += 1;
  }
  if (company.contractExpiryDate) {
    const daysToExpiry = Math.ceil((company.contractExpiryDate.getTime() - now) / day);
    if (daysToExpiry < 0) { reasons.push("Contract has expired"); risk += 4; }
    else if (daysToExpiry <= 14) { reasons.push(`Contract expires in ${daysToExpiry} days`); risk += 3; }
    else if (daysToExpiry <= 45) { reasons.push(`Contract expires in ${daysToExpiry} days`); risk += 2; }
  }

  if (risk >= 3) return { state: "At Risk" as const, reasons };
  if (risk >= 1) return { state: "Needs Attention" as const, reasons };
  return { state: "Healthy" as const, reasons: ["Recent activity and follow-up coverage are on track"] };
}

export const companiesRouter = router({
  list: activeProcedure.input(listInput.extend({
    status: z.enum(["Prospect", "Active", "Inactive"]).optional(), category: z.enum(ACCOUNT_CATEGORIES).optional(),
    tier: z.enum(ACCOUNT_TIERS).optional(),
    industry: z.string().trim().max(160).optional(), sort: z.enum(["updated", "name", "created", "potential"]).default("updated"),
  })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const search = input.search ? `%${input.search}%` : undefined;
    const where = and(
      isNull(companies.archivedAt),
      input.ownerId ? eq(companies.ownerId, input.ownerId) : undefined,
      input.status ? eq(companies.status, input.status) : undefined,
      input.category ? eq(companies.category, input.category) : undefined,
      input.tier ? eq(companies.tier, input.tier) : undefined,
      input.industry ? like(companies.industry, `%${input.industry}%`) : undefined,
      search ? or(like(companies.name, search), like(companies.legalName, search), like(companies.email, search),
        like(companies.phone, search), like(companies.industry, search), like(companies.segment, search), like(companies.destinationCity, search)) : undefined,
    );
    const order = input.sort === "name" ? asc(companies.name) : input.sort === "created" ? desc(companies.createdAt)
      : input.sort === "potential" ? desc(companies.potentialRevenueCents) : desc(companies.updatedAt);
    const [rows, totals] = await Promise.all([
      db.select({
        id: companies.id, name: companies.name, legalName: companies.legalName, email: companies.email, phone: companies.phone,
        industry: companies.industry, category: companies.category, tier: companies.tier, segment: companies.segment, status: companies.status,
        city: companies.city, destinationCity: companies.destinationCity,
        ownerId: companies.ownerId, ownerName: users.name, potentialRoomNights: companies.potentialRoomNights,
        potentialRevenueCents: companies.potentialRevenueCents, relationshipStatus: companies.relationshipStatus,
        lastActivityAt: companies.lastActivityAt, nextFollowUpAt: companies.nextFollowUpAt,
        contractStartDate: companies.contractStartDate, contractExpiryDate: companies.contractExpiryDate,
        updatedAt: companies.updatedAt, createdAt: companies.createdAt,
      }).from(companies).leftJoin(users, eq(companies.ownerId, users.id))
        .where(where).orderBy(order).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)` }).from(companies).where(where),
    ]);
    return { items: rows.map(company => ({ ...company, accountHealth: calculateAccountHealth(company) })), total: Number(totals[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
  }),

  get: activeProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "company", input.id);
    const rows = await db.select({ company: companies, ownerName: users.name })
      .from(companies).leftJoin(users, eq(companies.ownerId, users.id))
      .where(and(eq(companies.id, input.id), isNull(companies.archivedAt))).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
    const [relatedContacts, relatedOpportunities, relatedActivities] = await Promise.all([
      db.select().from(contacts).where(and(eq(contacts.companyId, input.id), isNull(contacts.archivedAt))).orderBy(desc(contacts.updatedAt)),
      db.select().from(opportunities).where(and(eq(opportunities.companyId, input.id), isNull(opportunities.archivedAt))).orderBy(desc(opportunities.updatedAt)),
      db.select().from(activities).where(and(eq(activities.companyId, input.id), isNull(activities.archivedAt))).orderBy(desc(activities.createdAt)),
    ]);
    return { ...rows[0], accountHealth: calculateAccountHealth(rows[0].company), contacts: relatedContacts, opportunities: relatedOpportunities, activities: relatedActivities };
  }),

  duplicateCheck: activeProcedure.input(z.object({
    excludeId: z.number().int().positive().optional(),
    name: z.string().trim().max(240).optional(), email: z.string().trim().max(320).optional(),
    phone: z.string().trim().max(80).optional(), website: z.string().trim().max(500).optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const signals = [
      input.name ? sql`lower(${companies.name}) = lower(${input.name})` : undefined,
      input.email ? sql`lower(${companies.email}) = lower(${input.email})` : undefined,
      input.phone ? eq(companies.phone, input.phone) : undefined,
      input.website ? sql`lower(${companies.website}) = lower(${input.website})` : undefined,
    ].filter(Boolean);
    if (!signals.length) return { matches: [] };
    const rows = await db.select({ id: companies.id, name: companies.name, email: companies.email, phone: companies.phone, website: companies.website })
      .from(companies)
      .where(and(isNull(companies.archivedAt),
        input.excludeId ? sql`${companies.id} <> ${input.excludeId}` : undefined,
        or(...signals as [NonNullable<(typeof signals)[number]>, ...NonNullable<(typeof signals)[number]>[]])))
      .limit(8);
    return { matches: rows };
  }),

  create: activeProcedure.input(companyFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const ownerId = resolveOwnerId(ctx.user, input.ownerId);
    const result = await db.insert(companies).values({ ...input, ownerId, createdById: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),

  update: activeProcedure.input(companyFields.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = await assertEntityAccess(ctx.user, "company", input.id);
    const { id, ownerId: requestedOwnerId, ...changes } = input;
    const ownerId = requestedOwnerId === undefined ? existing.ownerId : resolveOwnerId(ctx.user, requestedOwnerId);
    await db.update(companies).set({ ...changes, ownerId }).where(eq(companies.id, id));
    return { success: true };
  }),

  archive: activeProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertEntityAccess(ctx.user, "company", input.id);
    await db.update(companies).set({ archivedAt: new Date() }).where(eq(companies.id, input.id));
    return { success: true };
  }),
});
