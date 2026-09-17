import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FREE_LIMITS,
  canCreate,
  effectivePlan,
  limitsFor,
  overFreeCaps,
  shouldExpireToFree,
  usagePercent,
} from "./limits.ts";

describe("plan limits", () => {
  it("treats active pro as unlimited projects", () => {
    const limits = limitsFor("pro", "active", new Date(Date.now() + 86400000).toISOString());
    assert.equal(limits.maxActiveProjects, Number.POSITIVE_INFINITY);
    assert.equal(canCreate(100, limits.maxActiveProjects), true);
  });

  it("caps free workspaces", () => {
    assert.equal(canCreate(3, FREE_LIMITS.maxActiveProjects), false);
    assert.equal(canCreate(2, FREE_LIMITS.maxActiveProjects), true);
    assert.equal(canCreate(5, FREE_LIMITS.maxClients), false);
    assert.equal(canCreate(4, FREE_LIMITS.maxInvoicesPerMonth), true);
  });

  it("expires canceled pro after renew date", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    assert.equal(shouldExpireToFree("pro", "canceled", past), true);
    assert.equal(effectivePlan("pro", "canceled", past), "free");
  });

  it("keeps canceled pro until period end", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    assert.equal(shouldExpireToFree("pro", "canceled", future), false);
    assert.equal(effectivePlan("pro", "canceled", future), "pro");
  });

  it("treats past_due as free", () => {
    assert.equal(shouldExpireToFree("pro", "past_due", null), true);
    assert.equal(effectivePlan("pro", "past_due", null), "free");
  });

  it("computes usage percent", () => {
    assert.equal(usagePercent(10, 20), 50);
    assert.equal(usagePercent(30, 20), 100);
    assert.equal(usagePercent(1, Number.POSITIVE_INFINITY), 0);
  });

  it("flags over-cap workspaces", () => {
    assert.equal(
      overFreeCaps({
        members: 1,
        activeProjects: 3,
        clients: 5,
        invoicesThisMonth: 5,
        storageBytes: 100,
        aiThisMonth: 20,
      }),
      false,
    );
    assert.equal(
      overFreeCaps({
        members: 2,
        activeProjects: 4,
        clients: 5,
        invoicesThisMonth: 5,
        storageBytes: 100,
        aiThisMonth: 20,
      }),
      true,
    );
  });
});
