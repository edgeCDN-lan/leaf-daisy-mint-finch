import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { assertCanCreate, loadContext } from "./workspace.server";
import type { Member } from "./types";

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const sql = await getSql();
    return sql<Member>`select * from workspace_members where workspace_id = ${ctx.workspace.id} order by invited_at asc`;
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; role?: "admin" | "member" }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (ctx.role === "member") throw new Error("Only owners and admins can invite people.");
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    const sql = await getSql();
    const existing = await sql<Member>`select * from workspace_members where workspace_id = ${ctx.workspace.id}`;
    if (existing.some((m) => m.email.toLowerCase() === email)) throw new Error("That person is already invited.");
    assertCanCreate(ctx.usage.members, ctx.limits.maxMembers, "team members");
    await sql`
      insert into workspace_members (id, workspace_id, email, role, status)
      values (${nid()}, ${ctx.workspace.id}, ${email}, ${data.role ?? "member"}, ${"pending"})
    `;
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (ctx.role !== "owner") throw new Error("Only the owner can remove members.");
    const sql = await getSql();
    await sql`
      delete from workspace_members
      where id = ${data.id} and workspace_id = ${ctx.workspace.id} and role != 'owner'
    `;
    return { ok: true };
  });
