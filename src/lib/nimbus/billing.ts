import type { PlanId, PlanStatus } from "./limits";

export type BillingState = {
  plan: PlanId;
  plan_status: PlanStatus;
  plan_interval: "month" | "year" | null;
  plan_renews_at: string | null;
  canceled_at: string | null;
};

export type BillingEventType =
  | "checkout.session.completed"
  | "customer.subscription.deleted"
  | "invoice.payment_failed"
  | "invoice.payment_succeeded"
  | "customer.subscription.updated";

export type BillingEvent = {
  type: BillingEventType;
  interval?: "month" | "year";
  at?: string;
};

function addPeriod(from: Date, interval: "month" | "year") {
  const d = new Date(from);
  if (interval === "year") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

export function applyBillingEvent(state: BillingState, event: BillingEvent): BillingState {
  const at = event.at ? new Date(event.at) : new Date();
  switch (event.type) {
    case "checkout.session.completed":
    case "invoice.payment_succeeded": {
      const interval = event.interval ?? state.plan_interval ?? "month";
      return {
        plan: "pro",
        plan_status: "active",
        plan_interval: interval,
        plan_renews_at: addPeriod(at, interval),
        canceled_at: null,
      };
    }
    case "invoice.payment_failed":
      return { ...state, plan_status: "past_due" };
    case "customer.subscription.deleted":
      return {
        ...state,
        plan_status: "canceled",
        canceled_at: at.toISOString(),
      };
    case "customer.subscription.updated":
      if (event.interval) {
        return { ...state, plan_interval: event.interval };
      }
      return state;
    default:
      return state;
  }
}

export function verifyWebhookSecret(provided: string | null, expected: string | undefined) {
  if (!expected) return { ok: false as const, reason: "missing_secret" };
  if (!provided) return { ok: false as const, reason: "missing_signature" };
  if (provided !== expected) return { ok: false as const, reason: "invalid_signature" };
  return { ok: true as const };
}
