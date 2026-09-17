import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { loadContext } from "./workspace.server";
import type { Note } from "./types";

export const listNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    return sql<Note>`select * from notes where workspace_id = ${ctx.workspace.id} order by updated_at desc`;
  });

export const getNote = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Note>`select * from notes where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return rows[0] ?? null;
  });

export const createNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title?: string; folder?: string; content?: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const id = nid();
    await sql`
      insert into notes (id, workspace_id, folder, title, content, created_by)
      values (${id}, ${ctx.workspace.id}, ${data.folder?.trim() || "Inbox"}, ${data.title?.trim() || "Untitled"}, ${data.content ?? ""}, ${context.userId})
    `;
    return { id };
  });

export const updateNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; title?: string; folder?: string; content?: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Note>`select * from notes where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const n = rows[0];
    if (!n) throw new Error("Note not found");
    await sql`
      update notes set
        title = ${data.title ?? n.title},
        folder = ${data.folder ?? n.folder},
        content = ${data.content ?? n.content},
        updated_at = now()
      where id = ${n.id} and workspace_id = ${ctx.workspace.id}
    `;
    return { ok: true };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from notes where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });
