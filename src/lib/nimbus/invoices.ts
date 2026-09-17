import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { assertCanCreate, loadContext } from "./workspace.server";
import type { Invoice, InvoiceItem } from "./types";

function totalOf(itemsJson: string) {
  try {
    const items = JSON.parse(itemsJson) as InvoiceItem[];
    return items.reduce((s, i) => s + (i.qty || 0) * (i.unit_cents || 0), 0);
  } catch {
    return 0;
  }
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Invoice>`select * from invoices where workspace_id = ${ctx.workspace.id} order by created_at desc`;
    const max = ctx.limits.maxInvoicesPerMonth;
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = rows.filter((i) => String(i.created_at).slice(0, 7) === month);
    const allowed = new Set(thisMonth.slice(0, Number.isFinite(max) ? max : thisMonth.length).map((i) => i.id));
    return rows.map((inv) => ({
      ...inv,
      total_cents: totalOf(inv.items_json),
      locked: ctx.effective === "free" && String(inv.created_at).slice(0, 7) === month && !allowed.has(inv.id),
    }));
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Invoice>`select * from invoices where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const inv = rows[0];
    if (!inv) return null;
    return { ...inv, total_cents: totalOf(inv.items_json), logo: ctx.limits.customInvoiceLogo ? ctx.workspace.logo_data : null, workspace_name: ctx.workspace.name };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { client_id?: string | null; items: InvoiceItem[]; notes?: string; due_date?: string | null; status?: Invoice["status"] }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    assertCanCreate(ctx.usage.invoicesThisMonth, ctx.limits.maxInvoicesPerMonth, "invoices this month");
    const sql = await getSql();
    const count = await sql<{ c: number }>`select count(*)::int as c from invoices where workspace_id = ${ctx.workspace.id}`;
    const number = `INV-${String((count[0]?.c ?? 0) + 1).padStart(4, "0")}`;
    const id = nid();
    const iso = new Date().toISOString().slice(0, 10);
    await sql`
      insert into invoices (id, workspace_id, client_id, number, status, issue_date, due_date, notes, items_json, created_by)
      values (${id}, ${ctx.workspace.id}, ${data.client_id ?? null}, ${number}, ${data.status ?? "draft"}, ${iso}, ${data.due_date ?? null}, ${data.notes ?? ""}, ${JSON.stringify(data.items ?? [])}, ${context.userId})
    `;
    return { id, number };
  });

export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; client_id?: string | null; items?: InvoiceItem[]; notes?: string; due_date?: string | null; status?: Invoice["status"] }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Invoice>`select * from invoices where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const inv = rows[0];
    if (!inv) throw new Error("Invoice not found");
    const paidAt =
      data.status === "paid" ? new Date().toISOString() : data.status ? null : inv.paid_at;
    await sql`
      update invoices set
        client_id = ${data.client_id === undefined ? inv.client_id : data.client_id},
        notes = ${data.notes ?? inv.notes},
        due_date = ${data.due_date === undefined ? inv.due_date : data.due_date},
        status = ${data.status ?? inv.status},
        items_json = ${data.items ? JSON.stringify(data.items) : inv.items_json},
        paid_at = ${paidAt}
      where id = ${inv.id} and workspace_id = ${ctx.workspace.id}
    `;
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from invoices where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });
