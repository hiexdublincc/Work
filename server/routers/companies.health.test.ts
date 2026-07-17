import { describe, expect, it } from "vitest";
import { calculateAccountHealth } from "./companies";

const day = 86_400_000;
const now = Date.now();

describe("calculateAccountHealth", () => {
  it("marks an inactive account At Risk regardless of other signals", () => {
    const result = calculateAccountHealth({
      status: "Inactive",
      lastActivityAt: new Date(),
      nextFollowUpAt: new Date(now + day),
      contractExpiryDate: null,
    });
    expect(result.state).toBe("At Risk");
  });

  it("is Healthy with recent activity, a future follow-up, and no expiring contract", () => {
    const result = calculateAccountHealth({
      status: "Active",
      lastActivityAt: new Date(now - 2 * day),
      nextFollowUpAt: new Date(now + 3 * day),
      contractExpiryDate: new Date(now + 200 * day),
    });
    expect(result.state).toBe("Healthy");
  });

  it("flags Needs Attention when a next follow-up is overdue by a few days", () => {
    const result = calculateAccountHealth({
      status: "Active",
      lastActivityAt: new Date(now - 2 * day),
      nextFollowUpAt: new Date(now - 2 * day),
      contractExpiryDate: null,
    });
    expect(result.state).toBe("Needs Attention");
    expect(result.reasons.some(reason => reason.includes("overdue"))).toBe(true);
  });

  it("flags At Risk when the contract has already expired", () => {
    const result = calculateAccountHealth({
      status: "Active",
      lastActivityAt: new Date(now - 2 * day),
      nextFollowUpAt: new Date(now + day),
      contractExpiryDate: new Date(now - day),
    });
    expect(result.state).toBe("At Risk");
    expect(result.reasons.some(reason => reason.includes("expired"))).toBe(true);
  });

  it("flags At Risk when there has been no activity for 60+ days and no follow-up is scheduled", () => {
    const result = calculateAccountHealth({
      status: "Active",
      lastActivityAt: new Date(now - 65 * day),
      nextFollowUpAt: null,
      contractExpiryDate: null,
    });
    expect(result.state).toBe("At Risk");
  });

  it("treats a missing last-activity date as a negative signal", () => {
    const result = calculateAccountHealth({
      status: "Active",
      lastActivityAt: null,
      nextFollowUpAt: new Date(now + day),
      contractExpiryDate: null,
    });
    expect(result.reasons).toContain("No activity has been recorded");
  });
});
