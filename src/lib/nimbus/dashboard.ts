import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { loadContext } from "./workspace.server";
import type { Invoice, Task, TimeEntry } from "./types";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const todayTasks = await sql<Task>`
      select * from tasks
      where workspace_id = ${ctx.workspace.id}
        and status != 'done'
        and (due_date is null or due_date <= ${today})
      order by due_date nulls last, created_at asc
      limit 8
    `;
    const invoices = await sql<Invoice>`select * from invoices where workspace_id = ${ctx.workspace.id}`;
    const time = await sql<TimeEntry>`
      select * from time_entries
      where workspace_id = ${ctx.workspace.id} and started_at >= ${weekAgo}
    `;
    const running = await sql<TimeEntry>`
      select * from time_entries
      where workspace_id = ${ctx.workspace.id} and user_id = ${context.userId} and running = true
      limit 1
    `;
    const deals = await sql<{ stage: string; value_cents: number }>`
      select stage, value_cents from deals where workspace_id = ${ctx.workspace.id}
    `;

    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => {
        try {
          const items = JSON.parse(i.items_json) as { qty: number; unit_cents: number }[];
          return s + items.reduce((n, it) => n + it.qty * it.unit_cents, 0);
        } catch {
          return s;
        }
      }, 0);
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => {
        try {
          const items = JSON.parse(i.items_json) as { qty: number; unit_cents: number }[];
          return s + items.reduce((n, it) => n + it.qty * it.unit_cents, 0);
        } catch {
          return s;
        }
      }, 0);

    const weekSeconds = time.reduce((s, e) => {
      if (e.running) {
        const start = new Date(e.started_at).getTime();
        return s + Math.max(0, Math.floor((Date.now() - start) / 1000));
      }
      return s + (e.duration_seconds || 0);
    }, 0);

    const byDay: { day: string; seconds: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const seconds = time
        .filter((e) => String(e.started_at).slice(0, 10) === key)
        .reduce((s, e) => s + (e.running ? 0 : e.duration_seconds), 0);
      byDay.push({ day: key.slice(5), seconds });
    }

    const pipeline = ["lead", "qualified", "proposal", "won", "lost"].map((stage) => ({
      stage,
      value: deals.filter((d) => d.stage === stage).reduce((s, d) => s + d.value_cents, 0),
    }));

    return {
      todayTasks,
      paid,
      outstanding,
      weekSeconds,
      byDay,
      pipeline,
      running: running[0] ?? null,
      invoiceCount: invoices.length,
    };
  });
