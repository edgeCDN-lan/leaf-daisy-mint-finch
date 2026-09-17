import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { assertCanCreate, loadContext } from "./workspace.server";
import type { Comment, Project, Task } from "./types";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Project>`
      select p.*, coalesce(t.c, 0)::int as task_count, coalesce(t.d, 0)::int as done_count
      from projects p
      left join (
        select project_id, count(*)::int as c, count(*) filter (where status = 'done')::int as d
        from tasks group by project_id
      ) t on t.project_id = p.id
      where p.workspace_id = ${ctx.workspace.id}
      order by p.created_at asc
    `;
    const max = ctx.limits.maxActiveProjects;
    const active = rows.filter((p) => p.status === "active");
    const allowed = new Set(active.slice(0, Number.isFinite(max) ? max : active.length).map((p) => p.id));
    return rows.map((p) => ({
      ...p,
      locked: ctx.effective === "free" && p.status === "active" && !allowed.has(p.id),
    }));
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; description?: string; color?: string; due_date?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const name = data.name.trim();
    if (!name) throw new Error("Name is required");
    assertCanCreate(ctx.usage.activeProjects, ctx.limits.maxActiveProjects, "active projects");
    const sql = await getSql();
    const id = nid();
    await sql`
      insert into projects (id, workspace_id, name, description, color, due_date, created_by)
      values (${id}, ${ctx.workspace.id}, ${name}, ${data.description?.trim() ?? ""}, ${data.color || "lagoon"}, ${data.due_date || null}, ${context.userId})
    `;
    return { id };
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; name?: string; description?: string; color?: string; status?: "active" | "archived"; due_date?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Project>`select * from projects where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const p = rows[0];
    if (!p) throw new Error("Project not found");
    await sql`
      update projects set
        name = ${data.name?.trim() ?? p.name},
        description = ${data.description ?? p.description},
        color = ${data.color ?? p.color},
        status = ${data.status ?? p.status},
        due_date = ${data.due_date === undefined ? p.due_date : data.due_date}
      where id = ${p.id} and workspace_id = ${ctx.workspace.id}
    `;
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from tasks where project_id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    await sql`delete from projects where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });

export const listTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input?: { projectId?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    if (data.projectId) {
      return sql<Task>`select * from tasks where workspace_id = ${ctx.workspace.id} and project_id = ${data.projectId} order by position asc, created_at asc`;
    }
    return sql<Task>`select * from tasks where workspace_id = ${ctx.workspace.id} order by due_date nulls last, created_at asc`;
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { project_id: string; title: string; description?: string; status?: Task["status"]; priority?: Task["priority"]; due_date?: string | null; tags?: string; parent_id?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const title = data.title.trim();
    if (!title) throw new Error("Title is required");
    const sql = await getSql();
    const proj = await sql`select id from projects where id = ${data.project_id} and workspace_id = ${ctx.workspace.id}`;
    if (!proj[0]) throw new Error("Project not found");
    const id = nid();
    await sql`
      insert into tasks (id, workspace_id, project_id, parent_id, title, description, status, priority, due_date, tags, created_by)
      values (${id}, ${ctx.workspace.id}, ${data.project_id}, ${data.parent_id ?? null}, ${title}, ${data.description ?? ""}, ${data.status ?? "todo"}, ${data.priority ?? "medium"}, ${data.due_date ?? null}, ${data.tags ?? ""}, ${context.userId})
    `;
    return { id };
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<Task> & { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    const rows = await sql<Task>`select * from tasks where id = ${data.id} and workspace_id = ${ctx.workspace.id}`;
    const t = rows[0];
    if (!t) throw new Error("Task not found");
    await sql`
      update tasks set
        title = ${data.title?.trim() ?? t.title},
        description = ${data.description ?? t.description},
        status = ${data.status ?? t.status},
        priority = ${data.priority ?? t.priority},
        due_date = ${data.due_date === undefined ? t.due_date : data.due_date},
        assignee_id = ${data.assignee_id === undefined ? t.assignee_id : data.assignee_id},
        tags = ${data.tags ?? t.tags},
        position = ${data.position ?? t.position},
        parent_id = ${data.parent_id === undefined ? t.parent_id : data.parent_id},
        updated_at = now()
      where id = ${t.id} and workspace_id = ${ctx.workspace.id}
    `;
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    await sql`delete from tasks where (id = ${data.id} or parent_id = ${data.id}) and workspace_id = ${ctx.workspace.id}`;
    return { ok: true };
  });

export const listComments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { entity_type: string; entity_id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    return sql<Comment>`
      select * from comments
      where workspace_id = ${ctx.workspace.id} and entity_type = ${data.entity_type} and entity_id = ${data.entity_id}
      order by created_at asc
    `;
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { entity_type: string; entity_id: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const body = data.body.trim();
    if (!body) throw new Error("Comment cannot be empty");
    const sql = await getSql();
    await sql`
      insert into comments (id, workspace_id, entity_type, entity_id, body, user_id)
      values (${nid()}, ${ctx.workspace.id}, ${data.entity_type}, ${data.entity_id}, ${body}, ${context.userId})
    `;
    return { ok: true };
  });
