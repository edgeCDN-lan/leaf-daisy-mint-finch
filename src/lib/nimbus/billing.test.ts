import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyBillingEvent, verifyWebhookSecret, type BillingState } from "./billing.ts";

const free: BillingState = {
  plan: "free",
  plan_status: "active",
  plan_interval: null,
  plan_renews_at: null,
  canceled_at: null,
};

describe("billing webhooks", () => {
  it("activates pro on checkout.session.completed", () => {
    const next = applyBillingEvent(free, {
      type: "checkout.session.completed",
      interval: "month",
      at: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(next.plan, "pro");
    assert.equal(next.plan_status, "active");
    assert.equal(next.plan_interval, "month");
    assert.ok(next.plan_renews_at);
    assert.match(next.plan_renews_at!, /^2026-02-01/);
  });

  it("activates yearly pro", () => {
    const next = applyBillingEvent(free, {
      type: "checkout.session.completed",
      interval: "year",
      at: "2026-01-01T00:00:00.000Z",
    });
    assert.match(next.plan_renews_at!, /^2027-01-01/);
  });

  it("marks past_due on payment_failed", () => {
    const pro: BillingState = { ...free, plan: "pro", plan_interval: "month" };
    const next = applyBillingEvent(pro, { type: "invoice.payment_failed" });
    assert.equal(next.plan, "pro");
    assert.equal(next.plan_status, "past_due");
  });

  it("cancels on subscription.deleted without wiping data", () => {
    const pro: BillingState = { ...free, plan: "pro", plan_interval: "month" };
    const next = applyBillingEvent(pro, {
      type: "customer.subscription.deleted",
      at: "2026-03-01T00:00:00.000Z",
    });
    assert.equal(next.plan, "pro");
    assert.equal(next.plan_status, "canceled");
    assert.equal(next.canceled_at, "2026-03-01T00:00:00.000Z");
  });

  it("restores pro on payment_succeeded", () => {
    const pastDue: BillingState = {
      plan: "pro",
      plan_status: "past_due",
      plan_interval: "month",
      plan_renews_at: "2026-02-01T00:00:00.000Z",
      canceled_at: null,
    };
    const next = applyBillingEvent(pastDue, {
      type: "invoice.payment_succeeded",
      interval: "month",
      at: "2026-02-01T00:00:00.000Z",
    });
    assert.equal(next.plan_status, "active");
    assert.equal(next.canceled_at, null);
  });

  it("rejects unsigned webhooks", () => {
    assert.equal(verifyWebhookSecret(null, "whsec_test").ok, false);
    assert.equal(verifyWebhookSecret("bad", "whsec_test").ok, false);
    assert.equal(verifyWebhookSecret("whsec_test", "whsec_test").ok, true);
    assert.equal(verifyWebhookSecret("x", undefined).ok, false);
  });
});
