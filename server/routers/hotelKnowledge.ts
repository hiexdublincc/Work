import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { propertyKnowledge, properties, propertyCollateral } from "../../drizzle/schema";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import { storagePut } from "../storage";
import { router } from "../_core/trpc";
import { activeAdminProcedure, activeProcedure, assertPropertyAccess, idInput } from "./common";

const knowledgeFields = z.object({
  propertyId: z.number().int().positive(),
  overview: z.string().trim().max(30000).nullish(),
  facilities: z.string().trim().max(30000).nullish(),
  meetingCapacity: z.string().trim().max(20000).nullish(),
  parkingInfo: z.string().trim().max(10000).nullish(),
  sellingPoints: z.string().trim().max(30000).nullish(),
  salesContacts: z.string().trim().max(20000).nullish(),
});

const acceptedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
]);

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "collateral";
}

export const propertyKnowledgeRouter = router({
  list: activeProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    return db.select({
      propertyId: properties.id,
      propertyName: properties.name,
      city: properties.city,
      code: properties.code,
      overview: propertyKnowledge.overview,
      facilities: propertyKnowledge.facilities,
      meetingCapacity: propertyKnowledge.meetingRoomCapacity,
      parkingInfo: propertyKnowledge.parking,
      sellingPoints: propertyKnowledge.sellingPoints,
      salesContacts: propertyKnowledge.salesContacts,
      updatedAt: propertyKnowledge.updatedAt,
    }).from(properties)
      .leftJoin(propertyKnowledge, eq(propertyKnowledge.propertyId, properties.id))
      .where(scopedWhere(eq(properties.isActive, true), propertyScope(properties.id, propertyIds)))
      .orderBy(asc(properties.name));
  }),

  get: activeProcedure.input(z.object({ propertyId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const property = await assertPropertyAccess(ctx.user, input.propertyId);
    const knowledge = await db.select().from(propertyKnowledge).where(eq(propertyKnowledge.propertyId, input.propertyId)).limit(1);
    const collateral = await db.select({
      id: propertyCollateral.id,
      label: propertyCollateral.name,
      category: propertyCollateral.category,
      filename: propertyCollateral.name,
      mimeType: propertyCollateral.mimeType,
      fileSize: propertyCollateral.fileSize,
      fileUrl: propertyCollateral.url,
      createdAt: propertyCollateral.createdAt,
    }).from(propertyCollateral).where(scopedWhere(
      eq(propertyCollateral.propertyId, input.propertyId),
      isNull(propertyCollateral.archivedAt),
    )).orderBy(asc(propertyCollateral.category), asc(propertyCollateral.name));
    return { property, knowledge: knowledge[0] ?? null, collateral };
  }),

  update: activeAdminProcedure.input(knowledgeFields).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertPropertyAccess(ctx.user, input.propertyId);
    const { propertyId, meetingCapacity, parkingInfo, ...rest } = input;
    const values = { ...rest, meetingRoomCapacity: meetingCapacity, parking: parkingInfo, updatedById: ctx.user.id };
    await db.insert(propertyKnowledge).values({ propertyId, ...values }).onDuplicateKeyUpdate({ set: values });
    return { success: true };
  }),

  uploadCollateral: activeAdminProcedure.input(z.object({
    propertyId: z.number().int().positive(),
    label: z.string().trim().min(1).max(240),
    category: z.string().trim().min(1).max(120),
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(160),
    base64Data: z.string().min(1).max(12_000_000),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await assertPropertyAccess(ctx.user, input.propertyId);
    if (!acceptedMimeTypes.has(input.mimeType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a PDF, Word, Excel, PowerPoint, JPEG, or PNG file." });
    }
    const cleanBase64 = input.base64Data.includes(",") ? input.base64Data.split(",").pop()! : input.base64Data;
    const bytes = Buffer.from(cleanBase64, "base64");
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The file must be between 1 byte and 8 MB." });
    }
    const filename = safeFileName(input.filename);
    const stored = await storagePut(`hotel-knowledge/${input.propertyId}/${filename}`, bytes, input.mimeType);
    const result = await db.insert(propertyCollateral).values({
      propertyId: input.propertyId,
      name: input.label,
      category: input.category,
      description: input.filename === input.label ? null : `Original filename: ${input.filename}`,
      mimeType: input.mimeType,
      fileSize: bytes.length,
      fileKey: stored.key,
      url: stored.url,
      uploadedById: ctx.user.id,
    });
    return { id: Number(result[0].insertId), url: stored.url };
  }),

  archiveCollateral: activeAdminProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const row = await db.select({ id: propertyCollateral.id }).from(propertyCollateral)
      .where(and(eq(propertyCollateral.id, input.id), isNull(propertyCollateral.archivedAt))).limit(1);
    if (!row[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Collateral not found." });
    await db.update(propertyCollateral).set({ archivedAt: new Date() }).where(eq(propertyCollateral.id, input.id));
    return { success: true };
  }),
});
