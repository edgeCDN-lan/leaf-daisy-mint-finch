import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { applyBillingEvent, verifyWebhookSecret } from "@/lib/nimbus/billing";
import { nid } from "@/lib/nimbus/ids";

async function handle(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const check = verifyWebhookSecret(signature, secret);
  if (!check.ok) {
    return new Response(JSON.stringify({ error: check.reason }), { status: 400 });
  }
  let payload: { type?: string; data?: { object?: { client_reference_id?: string; metadata?: { workspace_id?: string } } } };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }
  const workspaceId =
    payload.data?.object?.client_reference_id || payload.data?.object?.metadata?.workspace_id;
  if (!workspaceId || !payload.type) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`select * from workspaces where id = ${workspaceId} limit 1`;
  const ws = rows[0];
  if (!ws) return new Response(JSON.stringify({ received: true }), { status: 200 });
  const next = applyBillingEvent(
    {
      plan: (ws.plan as "free" | "pro") || "free",
      plan_status: (ws.plan_status as "active" | "past_due" | "canceled") || "active",
      plan_interval: (ws.plan_interval as "month" | "year" | null) ?? null,
      plan_renews_at: ws.plan_renews_at ? String(ws.plan_renews_at) : null,
      canceled_at: ws.canceled_at ? String(ws.canceled_at) : null,
    },
    { type: payload.type as "checkout.session.completed" },
  );
  await sql`
    update workspaces set
      plan = ${next.plan},
      plan_status = ${next.plan_status},
      plan_interval = ${next.plan_interval},
      plan_renews_at = ${next.plan_renews_at},
      canceled_at = ${next.canceled_at}
    where id = ${workspaceId}
  `;
  await sql`
    insert into billing_events (id, workspace_id, type, payload)
    values (${nid()}, ${workspaceId}, ${payload.type}, ${JSON.stringify(payload.data?.object ?? {})})
  `;
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
