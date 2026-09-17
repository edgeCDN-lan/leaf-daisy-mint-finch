import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { assertCanCreate, loadContext } from "./workspace.server";
import type { Client, Deal } from "./types";

export const listClients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Client>`select * from clients where workspace_id = ${ctx.workspace.id} order by created_at asc`;
    const max = ctx.limits.maxClients;
    const allowed = new Set(rows.slice(0, Number.isFinite(max) ? max : rows.length).map((c) => c.id));
    return rows.map((c) => ({ ...c, locked: ctx.effective === "free" && !allowed.has(c.id) }));
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; email?: string; company?: string; phone?: string; status?: Client["status"]; notes?: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Name is required");
    assertCanCreate(ctx.usage.clients, ctx.limits.maxClients, "clients");
    const sql = await getSql();
    const id = nid();
    await sql`
      insert into clients (id, workspace_id, name, email, company, phone, status, notes, created_by)
      values (${id}, ${ctx.workspace.id}, ${name}, ${data.email ?? ""}, ${data.company ?? ""}, ${data.phone ?? ""}, ${data.status ?? "lead"}, ${data.notes ?? ""}, ${context.userId})
    `;
    return { id };
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<Client> & { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Client>`select * from clients where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const c = rows[0];
    if (!c) throw new Error("Client not found");
    await sql`
      update clients set
        name = ${data.name?.trim() ?? c.name},
        email = ${data.email ?? c.email},
        company = ${data.company ?? c.company},
        phone = ${data.phone ?? c.phone},
        status = ${data.status ?? c.status},
        notes = ${data.notes ?? c.notes}
      where id = ${c.id} and workspace_id = ${ctx.workspace.id}
    `;
    return { ok: true };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from deals where client_id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    await sql`delete from clients where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });

export const listDeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    return sql<Deal>`select * from deals where workspace_id = ${ctx.workspace.id} order by created_at desc`;
  });

export const createDeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { client_id: string; title: string; value_cents?: number; stage?: Deal["stage"] }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const title = data.title.trim();
    if (!title) throw new Error("Title is required");
    const sql = await getSql();
    const id = nid();
    await sql`
      insert into deals (id, workspace_id, client_id, title, value_cents, stage, created_by)
      values (${id}, ${ctx.workspace.id}, ${data.client_id}, ${title}, ${data.value_cents ?? 0}, ${data.stage ?? "lead"}, ${context.userId})
    `;
    return { id };
  });

export const updateDeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<Deal> & { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Deal>`select * from deals where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const d = rows[0];
    if (!d) throw new Error("Deal not found");
    await sql`
      update deals set
        title = ${data.title?.trim() ?? d.title},
        value_cents = ${data.value_cents ?? d.value_cents},
        stage = ${data.stage ?? d.stage},
        client_id = ${data.client_id ?? d.client_id}
      where id = ${d.id} and workspace_id = ${ctx.workspace.id}
    `;
    return { ok: true };
  });
