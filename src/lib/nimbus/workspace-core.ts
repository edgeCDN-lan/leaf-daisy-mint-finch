import { getSql } from "@/lib/db";
import { nid } from "./ids";
import {
  effectivePlan,
  FREE_LIMITS,
  limitsFor,
  shouldExpireToFree,
  type PlanId,
  type PlanStatus,
} from "./limits";
import type { AuthUser, Usage, Workspace } from "./types";
import { monthPeriod } from "@/lib/utils";

export type WorkspaceContext = {
  user: AuthUser;
  workspace: Workspace;
  role: "owner" | "admin" | "member";
  effective: PlanId;
  limits: ReturnType<typeof limitsFor>;
  usage: Usage;
};

type UserRow = { id: string; email: string; name: string; image: string | null };

function asBool(v: unknown) {
  return v === true || v === "t" || v === "true";
}

function mapWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    name: String(row.name),
    plan: (row.plan as PlanId) || "free",
    plan_interval: (row.plan_interval as "month" | "year" | null) ?? null,
    plan_status: (row.plan_status as PlanStatus) || "active",
    plan_renews_at: row.plan_renews_at ? String(row.plan_renews_at) : null,
    canceled_at: row.canceled_at ? String(row.canceled_at) : null,
    onboarding_done: asBool(row.onboarding_done),
    logo_data: row.logo_data ? String(row.logo_data) : null,
    created_at: String(row.created_at),
  };
}

export async function loadAuthUser(userId: string): Promise<AuthUser> {
  const sql = await getSql();
  const rows = await sql<UserRow>`select id, email, name, image from "user" where id = ${userId} limit 1`;
  const u = rows[0];
  if (u) {
    return { id: u.id, email: u.email, name: u.name || u.email.split("@")[0] || "Member", image: u.image };
  }
  return { id: userId, email: `${userId}@nimbus.local`, name: "Member", image: null };
}

async function loadUsage(workspaceId: string): Promise<Usage> {
  const sql = await getSql();
  const period = monthPeriod();
  const [members] = await sql<{ c: number }>`select count(*)::int as c from workspace_members where workspace_id = ${workspaceId} and status = 'active'`;
  const [projects] = await sql<{ c: number }>`select count(*)::int as c from projects where workspace_id = ${workspaceId} and status = 'active'`;
  const [clients] = await sql<{ c: number }>`select count(*)::int as c from clients where workspace_id = ${workspaceId}`;
  const [invoices] = await sql<{ c: number }>`select count(*)::int as c from invoices where workspace_id = ${workspaceId} and to_char(created_at, 'YYYY-MM') = ${period}`;
  const [storage] = await sql<{ c: number }>`select coalesce(sum(size_bytes), 0)::int as c from files where workspace_id = ${workspaceId}`;
  const [ai] = await sql<{ c: number }>`select coalesce(count, 0)::int as c from ai_usage where workspace_id = ${workspaceId} and period = ${period}`;
  return {
    members: members?.c ?? 0,
    activeProjects: projects?.c ?? 0,
    clients: clients?.c ?? 0,
    invoicesThisMonth: invoices?.c ?? 0,
    storageBytes: storage?.c ?? 0,
    aiThisMonth: ai?.c ?? 0,
  };
}

export async function loadContext(userId: string): Promise<WorkspaceContext> {
  const sql = await getSql();
  const user = await loadAuthUser(userId);

  await sql`
    update workspace_members
    set user_id = ${userId}, status = 'active'
    where lower(email) = lower(${user.email}) and user_id is null
  `;

  let membership = await sql<{ workspace_id: string; role: WorkspaceContext["role"] }>`
    select workspace_id, role from workspace_members
    where user_id = ${userId} and status = 'active'
    order by invited_at asc
    limit 1
  `;

  if (!membership[0]) {
    const id = nid();
    const name = `${user.name.split(" ")[0] || "My"} Workspace`;
    await sql`
      insert into workspaces (id, owner_id, name)
      values (${id}, ${userId}, ${name})
    `;
    await sql`
      insert into workspace_members (id, workspace_id, user_id, email, role, status)
      values (${nid()}, ${id}, ${userId}, ${user.email}, 'owner', 'active')
    `;
    membership = [{ workspace_id: id, role: "owner" }];
  }

  const wsRows = await sql<Record<string, unknown>>`select * from workspaces where id = ${membership[0]!.workspace_id} limit 1`;
  let workspace = mapWorkspace(wsRows[0]!);

  if (shouldExpireToFree(workspace.plan, workspace.plan_status, workspace.plan_renews_at)) {
    await sql`
      update workspaces
      set plan = 'free', plan_status = 'active', plan_interval = null
      where id = ${workspace.id}
    `;
    workspace = { ...workspace, plan: "free", plan_status: "active", plan_interval: null };
  }

  const limits = limitsFor(workspace.plan, workspace.plan_status, workspace.plan_renews_at);
  const effective = effectivePlan(workspace.plan, workspace.plan_status, workspace.plan_renews_at);
  const usage = await loadUsage(workspace.id);

  return { user, workspace, role: membership[0]!.role, effective, limits, usage };
}

export async function persistWorkspace(ws: Workspace) {
  const sql = await getSql();
  await sql`
    update workspaces
    set name = ${ws.name},
        plan = ${ws.plan},
        plan_interval = ${ws.plan_interval},
        plan_status = ${ws.plan_status},
        plan_renews_at = ${ws.plan_renews_at},
        canceled_at = ${ws.canceled_at},
        onboarding_done = ${ws.onboarding_done},
        logo_data = ${ws.logo_data}
    where id = ${ws.id}
  `;
}

export function assertCanCreate(count: number, max: number, label: string) {
  if (Number.isFinite(max) && count >= max) {
    throw new Error(
      `Free plan includes ${max} ${label}. Archive or upgrade to Pro to add more.`,
    );
  }
}

export { FREE_LIMITS };
