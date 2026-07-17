import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { resolveOwnerId } from "./common";

describe("resolveOwnerId", () => {
  const admin = { id: 1, role: "admin" as const, isActive: true };
  const user = { id: 42, role: "user" as const, isActive: true };

  it("defaults an admin to themselves when no owner is requested", () => {
    expect(resolveOwnerId(admin, undefined)).toBe(1);
  });

  it("lets an admin assign a record to any other user", () => {
    expect(resolveOwnerId(admin, 99)).toBe(99);
  });

  it("defaults a regular user to themselves", () => {
    expect(resolveOwnerId(user, undefined)).toBe(42);
  });

  it("lets a regular user assign a record to themselves explicitly", () => {
    expect(resolveOwnerId(user, 42)).toBe(42);
  });

  it("forbids a regular user from assigning a record to someone else", () => {
    expect(() => resolveOwnerId(user, 7)).toThrow(TRPCError);
    try {
      resolveOwnerId(user, 7);
      throw new Error("expected resolveOwnerId to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});
