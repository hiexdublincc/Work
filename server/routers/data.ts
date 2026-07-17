import { asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { companies, contacts, leads, opportunities } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { ownerScope, requireDb, scopedWhere } from "../db";
import { activeProcedure, resolveOwnerId } from "./common";

const entitySchema = z.enum(["companies", "contacts", "leads", "opportunities"]);
const nullableText = z.preprocess(value => (value === "" || value === undefined ? null : value), z.string().trim().nullable());
const nullablePositiveInt = z.preprocess(
  value => (value === "" || value === undefined || value === null ? null : Number(value)),
  z.number().int().positive().nullable(),
);
const nonNegativeInt = z.preprocess(value => Number(value ?? 0), z.number().int().min(0));

const importSchemas = {
  companies: z.object({
    name: z.string().trim().min(1).max(240),
    legalName: nullableText.optional(),
    website: nullableText.optional(),
    email: nullableText.optional(),
    phone: nullableText.optional(),
    industry: nullableText.optional(),
    status: z.enum(["Prospect", "Active", "Inactive"]).default("Prospect"),
    city: nullableText.optional(),
    country: nullableText.optional(),
    ownerId: nullablePositiveInt.optional(),
  }),
  contacts: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: nullableText.optional(),
    phone: nullableText.optional(),
    mobile: nullableText.optional(),
    jobTitle: nullableText.optional(),
    department: nullableText.optional(),
    companyId: nullablePositiveInt.optional(),
    status: z.enum(["Active", "Inactive"]).default("Active"),
    ownerId: nullablePositiveInt.optional(),
  }),
  leads: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    companyName: nullableText.optional(),
    email: nullableText.optional(),
    phone: nullableText.optional(),
    source: nullableText.optional(),
    status: z.enum(["New", "Contacted", "Qualified", "Nurturing", "Disqualified"]).default("New"),
    estimatedValueCents: nonNegativeInt.default(0),
    ownerId: nullablePositiveInt.optional(),
  }),
  opportunities: z.object({
    name: z.string().trim().min(1).max(240),
    companyId: nullablePositiveInt.optional(),
    contactId: nullablePositiveInt.optional(),
    stage: z.enum(["Prospecting", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]).default("Prospecting"),
    valueCents: nonNegativeInt.default(0),
    probability: z.preprocess(value => Number(value ?? 10), z.number().int().min(0).max(100)),
    expectedCloseDate: z.preprocess(value => (value ? new Date(String(value)) : null), z.date().nullable()),
    ownerId: nullablePositiveInt.optional(),
  }),
} as const;

const templates = {
  companies: ["name", "legalName", "website", "email", "phone", "industry", "status", "city", "country", "ownerId"],
  contacts: ["firstName", "lastName", "email", "phone", "mobile", "jobTitle", "department", "companyId", "status", "ownerId"],
  leads: ["firstName", "lastName", "companyName", "email", "phone", "source", "status", "estimatedValueCents", "ownerId"],
  opportunities: ["name", "companyId", "contactId", "stage", "valueCents", "probability", "expectedCloseDate", "ownerId"],
} as const;

export const dataRouter = router({
  templates: activeProcedure.query(() => templates),

  importRows: activeProcedure
    .input(
      z.object({
        entity: entitySchema,
        rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const valid: Array<Record<string, unknown>> = [];
      const errors: Array<{ row: number; message: string }> = [];
      const schema = importSchemas[input.entity];

      input.rows.forEach((row, index) => {
        const result = schema.safeParse(row);
        if (!result.success) {
          errors.push({ row: index + 2, message: result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
          return;
        }
        try {
          const ownerId = resolveOwnerId(ctx.user, result.data.ownerId ?? undefined);
          valid.push({ ...result.data, ownerId, createdById: ctx.user.id });
        } catch (error) {
          errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid owner assignment." });
        }
      });

      if (errors.length) return { imported: 0, errors, ready: false };
      await db.transaction(async tx => {
        const chunkSize = 250;
        for (let index = 0; index < valid.length; index += chunkSize) {
          const chunk = valid.slice(index, index + chunkSize);
          if (input.entity === "companies") await tx.insert(companies).values(chunk as typeof companies.$inferInsert[]);
          if (input.entity === "contacts") await tx.insert(contacts).values(chunk as typeof contacts.$inferInsert[]);
          if (input.entity === "leads") await tx.insert(leads).values(chunk as typeof leads.$inferInsert[]);
          if (input.entity === "opportunities") await tx.insert(opportunities).values(chunk as typeof opportunities.$inferInsert[]);
        }
      });
      return { imported: valid.length, errors: [], ready: true };
    }),

  exportCsv: activeProcedure.input(z.object({ entity: entitySchema })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    let rows: Array<Record<string, unknown>> = [];
    if (input.entity === "companies") {
      rows = await db
        .select({
          id: companies.id,
          name: companies.name,
          legalName: companies.legalName,
          website: companies.website,
          email: companies.email,
          phone: companies.phone,
          industry: companies.industry,
          status: companies.status,
          city: companies.city,
          country: companies.country,
          ownerId: companies.ownerId,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
        })
        .from(companies)
        .where(scopedWhere(isNull(companies.archivedAt), ownerScope(companies.ownerId, ctx.user)))
        .orderBy(asc(companies.name));
    }
    if (input.entity === "contacts") {
      rows = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
          mobile: contacts.mobile,
          jobTitle: contacts.jobTitle,
          department: contacts.department,
          companyId: contacts.companyId,
          status: contacts.status,
          ownerId: contacts.ownerId,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .where(scopedWhere(isNull(contacts.archivedAt), ownerScope(contacts.ownerId, ctx.user)))
        .orderBy(asc(contacts.lastName), asc(contacts.firstName));
    }
    if (input.entity === "leads") {
      rows = await db
        .select({
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
          email: leads.email,
          phone: leads.phone,
          source: leads.source,
          status: leads.status,
          estimatedValueCents: leads.estimatedValueCents,
          ownerId: leads.ownerId,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .where(scopedWhere(isNull(leads.archivedAt), ownerScope(leads.ownerId, ctx.user)))
        .orderBy(asc(leads.lastName), asc(leads.firstName));
    }
    if (input.entity === "opportunities") {
      rows = await db
        .select({
          id: opportunities.id,
          name: opportunities.name,
          companyId: opportunities.companyId,
          contactId: opportunities.contactId,
          stage: opportunities.stage,
          valueCents: opportunities.valueCents,
          probability: opportunities.probability,
          expectedCloseDate: opportunities.expectedCloseDate,
          ownerId: opportunities.ownerId,
          createdAt: opportunities.createdAt,
          updatedAt: opportunities.updatedAt,
        })
        .from(opportunities)
        .where(scopedWhere(isNull(opportunities.archivedAt), ownerScope(opportunities.ownerId, ctx.user)))
        .orderBy(asc(opportunities.name));
    }

    return {
      filename: `jmk-${input.entity}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: toCsv(rows),
      count: rows.length,
    };
  }),
});

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const encode = (value: unknown) => {
    const normalized = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
    return `"${normalized.replaceAll('"', '""')}"`;
  };
  return [headers.map(encode).join(","), ...rows.map(row => headers.map(header => encode(row[header])).join(","))].join("\n");
}
