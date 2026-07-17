import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { companies } from "../drizzle/schema";
import { ownerScope, propertyScope, scopedWhere } from "./db";

function describeSql(condition: unknown) {
  return inspect(condition, { depth: 8 });
}

type ScopeUser = { id: number; role: "admin" | "user"; isActive: boolean };

const adminUser: ScopeUser = { id: 1, role: "admin", isActive: true };
const regularUser: ScopeUser = { id: 42, role: "user", isActive: true };

describe("ownerScope", () => {
  it("does not restrict admins", () => {
    expect(ownerScope(companies.ownerId, adminUser)).toBeUndefined();
  });

  it("restricts a user to their own owned records", () => {
    const condition = ownerScope(companies.ownerId, regularUser);
    expect(condition).toBeDefined();
    expect(describeSql(condition)).toContain("42");
  });
});

describe("propertyScope", () => {
  it("does not restrict when propertyIds is null (admin/group scope)", () => {
    expect(propertyScope(companies.propertyId, null)).toBeUndefined();
  });

  it("excludes every row when the user has no property assignments", () => {
    const condition = propertyScope(companies.propertyId, []);
    expect(condition).toBeDefined();
    // A user with zero assignments must never fall through to unrestricted access.
    expect(describeSql(condition)).toContain("1 = 0");
  });

  it("restricts to the user's assigned property ids", () => {
    const condition = propertyScope(companies.propertyId, [3, 7]);
    expect(condition).toBeDefined();
    const serialized = describeSql(condition);
    expect(serialized).toContain("3");
    expect(serialized).toContain("7");
  });
});

describe("scopedWhere", () => {
  it("drops undefined conditions and returns undefined when nothing remains", () => {
    expect(scopedWhere(undefined, undefined)).toBeUndefined();
  });

  it("returns the single condition unwrapped when only one is present", () => {
    const condition = propertyScope(companies.propertyId, [3]);
    expect(scopedWhere(undefined, condition)).toBe(condition);
  });

  it("combines multiple conditions with AND", () => {
    const a = propertyScope(companies.propertyId, [3]);
    const b = ownerScope(companies.ownerId, regularUser);
    const combined = scopedWhere(a, b);
    expect(combined).toBeDefined();
    expect(combined).not.toBe(a);
    expect(combined).not.toBe(b);
  });
});
