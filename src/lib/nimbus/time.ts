import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { loadContext } from "./workspace.server";
import type { TimeEntry } from "./types";

export const listTimeEntries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    return sql<TimeEntry>`
      select * from time_entries
      where workspace_id = ${ctx.workspace.id}
      order by started_at desc
    `;
  });

export const startTimer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { project_id?: string | null; task_id?: string | null; notes?: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`
      update time_entries
      set running = false, ended_at = now(),
          duration_seconds = greatest(1, extract(epoch from (now() - started_at))::int)
      where workspace_id = ${ctx.workspace.id} and user_id = ${context.userId} and running = true
    `;
    const id = nid();
    await sql`
      insert into time_entries (id, workspace_id, project_id, task_id, user_id, notes, started_at, running)
      values (${id}, ${ctx.workspace.id}, ${data.project_id ?? null}, ${data.task_id ?? null}, ${context.userId}, ${data.notes ?? ""}, now(), true)
    `;
    return { id };
  });

export const stopTimer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`
      update time_entries
      set running = false, ended_at = now(),
          duration_seconds = greatest(1, extract(epoch from (now() - started_at))::int)
      where workspace_id = ${ctx.workspace.id} and user_id = ${context.userId} and running = true
    `;
    return { ok: true };
  });

export const addTimeEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { project_id?: string | null; notes?: string; duration_seconds: number; started_at?: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const started = data.started_at ?? new Date().toISOString();
    await sql`
      insert into time_entries (id, workspace_id, project_id, user_id, notes, started_at, ended_at, duration_seconds, running)
      values (${nid()}, ${ctx.workspace.id}, ${data.project_id ?? null}, ${context.userId}, ${data.notes ?? ""}, ${started}, ${started}, ${Math.max(0, data.duration_seconds)}, false)
    `;
    return { ok: true };
  });

export const deleteTimeEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from time_entries where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });
