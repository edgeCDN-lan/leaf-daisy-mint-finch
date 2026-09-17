import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { loadContext } from "./workspace.server";
import { overFreeCaps } from "./limits";

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    return {
      ...ctx,
      overLimit: ctx.effective === "free" && overFreeCaps(ctx.usage),
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; seed: boolean }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const name = data.name.trim() || ctx.workspace.name;
    await sql`
      update workspaces
      set name = ${name}, onboarding_done = true
      where id = ${ctx.workspace.id}
    `;
    if (data.seed) {
      await seedWorkspace(ctx.workspace.id, context.userId);
    }
    return { ok: true };
  });

export const renameWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const name = data.name.trim();
    if (!name) throw new Error("Name is required");
    await sql`update workspaces set name = ${name} where id = ${ctx.workspace.id}`;
    return { ok: true };
  });

async function seedWorkspace(workspaceId: string, userId: string) {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`select count(*)::int as c from projects where workspace_id = ${workspaceId}`;
  if ((existing[0]?.c ?? 0) > 0) return;

  const projectId = nid();
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const due = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  await sql`
    insert into projects (id, workspace_id, name, description, color, due_date, created_by)
    values (${projectId}, ${workspaceId}, ${"Brand site refresh"}, ${"Homepage, case studies, and invoice-ready handoff."}, ${"lagoon"}, ${due}, ${userId})
  `;

  const tasks = [
    ["Kickoff notes", "todo", "high"],
    ["Information architecture", "in_progress", "medium"],
    ["Component inventory", "todo", "medium"],
    ["Invoice the discovery week", "todo", "high"],
    ["QA pass", "blocked", "low"],
    ["Launch checklist", "done", "medium"],
  ] as const;
  let pos = 0;
  for (const [title, status, priority] of tasks) {
    await sql`
      insert into tasks (id, workspace_id, project_id, title, status, priority, due_date, position, created_by)
      values (${nid()}, ${workspaceId}, ${projectId}, ${title}, ${status}, ${priority}, ${due}, ${pos++}, ${userId})
    `;
  }

  const clientId = nid();
  await sql`
    insert into clients (id, workspace_id, name, email, company, status, notes, created_by)
    values (${clientId}, ${workspaceId}, ${"Northwind Studio"}, ${"hello@northwind.example"}, ${"Northwind"}, ${"active"}, ${"Retainer for brand and web."}, ${userId})
  `;
  await sql`
    insert into deals (id, workspace_id, client_id, title, value_cents, stage, created_by)
    values (${nid()}, ${workspaceId}, ${clientId}, ${"Q3 website retainer"}, ${1800000}, ${"proposal"}, ${userId})
  `;

  const items = JSON.stringify([
    { description: "Discovery workshop", qty: 1, unit_cents: 180000 },
    { description: "IA & wireframes", qty: 1, unit_cents: 240000 },
  ]);
  await sql`
    insert into invoices (id, workspace_id, client_id, number, status, issue_date, due_date, items_json, created_by)
    values (${nid()}, ${workspaceId}, ${clientId}, ${"INV-0001"}, ${"sent"}, ${iso}, ${due}, ${items}, ${userId})
  `;

  await sql`
    insert into notes (id, workspace_id, folder, title, content, created_by)
    values (${nid()}, ${workspaceId}, ${"Clients"}, ${"Northwind kickoff"}, ${"# Kickoff\n\n- Audience: independent studios\n- Tone: calm, precise, no jargon\n- Deliver homepage + two case studies\n\nNext: send proposal by Friday."}, ${userId})
  `;

  const start = new Date(today.getTime() - 2 * 3600000).toISOString();
  const end = today.toISOString();
  await sql`
    insert into time_entries (id, workspace_id, project_id, user_id, notes, started_at, ended_at, duration_seconds, running)
    values (${nid()}, ${workspaceId}, ${projectId}, ${userId}, ${"IA workshop"}, ${start}, ${end}, ${7200}, ${false})
  `;
}
