import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { loadContext } from "./workspace.server";
import type { FileRow } from "./types";

const MAX_FILE = 2 * 1024 * 1024;

export const listFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    return sql<Omit<FileRow, "data_url"> & { data_url?: string }>`
      select id, workspace_id, folder, name, mime, size_bytes, created_by, created_at::text as created_at,
             case when mime like 'image/%' or mime like 'text/%' then data_url else '' end as data_url
      from files where workspace_id = ${ctx.workspace.id}
      order by created_at desc
    `;
  });

export const getFile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<FileRow>`select * from files where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return rows[0] ?? null;
  });

export const uploadFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; mime: string; data_url: string; folder?: string; size_bytes: number }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (data.size_bytes > MAX_FILE) throw new Error("Each file must be 2 MB or smaller in this preview.");
    if (ctx.usage.storageBytes + data.size_bytes > ctx.limits.maxStorageBytes) {
      throw new Error("Storage limit reached. Upgrade to Pro for more space.");
    }
    const sql = await getSql();
    const id = nid();
    await sql`
      insert into files (id, workspace_id, folder, name, mime, size_bytes, data_url, created_by)
      values (${id}, ${ctx.workspace.id}, ${data.folder?.trim() || "All files"}, ${data.name}, ${data.mime}, ${data.size_bytes}, ${data.data_url}, ${context.userId})
    `;
    return { id };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from files where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });
