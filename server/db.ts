import { and, eq, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, type User, userPropertyAssignments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export type AccessUser = Pick<User, "id" | "role" | "isActive">;

export function ownerScope(ownerColumn: AnyColumn, user: AccessUser): SQL | undefined {
  return user.role === "admin" ? undefined : eq(ownerColumn, user.id);
}

export async function getAuthorizedPropertyIds(user: AccessUser): Promise<number[] | null> {
  if (user.role === "admin") return null;
  const db = await requireDb();
  const rows = await db
    .select({ propertyId: userPropertyAssignments.propertyId })
    .from(userPropertyAssignments)
    .where(eq(userPropertyAssignments.userId, user.id));
  return rows.map(row => row.propertyId);
}

export function propertyScope(propertyColumn: AnyColumn, propertyIds: number[] | null): SQL | undefined {
  if (propertyIds === null) return undefined;
  if (propertyIds.length === 0) return sql`1 = 0`;
  return inArray(propertyColumn, propertyIds);
}

export function scopedWhere(...conditions: Array<SQL | undefined>): SQL | undefined {
  const active = conditions.filter((condition): condition is SQL => Boolean(condition));
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  return and(...active);
}

export function assertActiveUser(user: AccessUser) {
  if (!user.isActive) throw new Error("This account is inactive");
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
