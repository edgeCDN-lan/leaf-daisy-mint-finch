export type PlanId = "free" | "pro";
export type PlanStatus = "active" | "past_due" | "canceled";

export type PlanLimits = {
  maxMembers: number;
  maxActiveProjects: number;
  maxClients: number;
  maxInvoicesPerMonth: number;
  maxStorageBytes: number;
  maxAiPerMonth: number;
  customInvoiceLogo: boolean;
  advancedAnalytics: boolean;
};

export const FREE_LIMITS: PlanLimits = {
  maxMembers: 1,
  maxActiveProjects: 3,
  maxClients: 5,
  maxInvoicesPerMonth: 5,
  maxStorageBytes: 500 * 1024 * 1024,
  maxAiPerMonth: 20,
  customInvoiceLogo: false,
  advancedAnalytics: false,
};

export const PRO_LIMITS: PlanLimits = {
  maxMembers: 10,
  maxActiveProjects: Number.POSITIVE_INFINITY,
  maxClients: Number.POSITIVE_INFINITY,
  maxInvoicesPerMonth: Number.POSITIVE_INFINITY,
  maxStorageBytes: 50 * 1024 * 1024 * 1024,
  maxAiPerMonth: 500,
  customInvoiceLogo: true,
  advancedAnalytics: true,
};

export const PRO_PRICE_MONTH_CENTS = 900;
export const PRO_PRICE_YEAR_CENTS = 9000;

export function limitsFor(plan: PlanId, status: PlanStatus, renewsAt: string | null, now = Date.now()) {
  const stillPro =
    plan === "pro" &&
    (status === "active" ||
      (status === "canceled" && renewsAt != null && new Date(renewsAt).getTime() > now));
  return stillPro ? PRO_LIMITS : FREE_LIMITS;
}

export function effectivePlan(
  plan: PlanId,
  status: PlanStatus,
  renewsAt: string | null,
  now = Date.now(),
): PlanId {
  return limitsFor(plan, status, renewsAt, now) === PRO_LIMITS ? "pro" : "free";
}

export function shouldExpireToFree(
  plan: PlanId,
  status: PlanStatus,
  renewsAt: string | null,
  now = Date.now(),
) {
  if (plan !== "pro") return false;
  if (status === "past_due") return true;
  if (status === "canceled" && (!renewsAt || new Date(renewsAt).getTime() <= now)) return true;
  return false;
}

export function editableSlice<T>(items: T[], max: number, effective: PlanId): { item: T; locked: boolean }[] {
  if (effective === "pro" || !Number.isFinite(max)) {
    return items.map((item) => ({ item, locked: false }));
  }
  return items.map((item, i) => ({ item, locked: i >= max }));
}

export function canCreate(count: number, max: number) {
  if (!Number.isFinite(max)) return true;
  return count < max;
}

export function usagePercent(used: number, max: number) {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export type UsageSnapshot = {
  members: number;
  activeProjects: number;
  clients: number;
  invoicesThisMonth: number;
  storageBytes: number;
  aiThisMonth: number;
};

export function overFreeCaps(usage: UsageSnapshot) {
  return (
    usage.members > FREE_LIMITS.maxMembers ||
    usage.activeProjects > FREE_LIMITS.maxActiveProjects ||
    usage.clients > FREE_LIMITS.maxClients ||
    usage.invoicesThisMonth > FREE_LIMITS.maxInvoicesPerMonth ||
    usage.storageBytes > FREE_LIMITS.maxStorageBytes
  );
}
