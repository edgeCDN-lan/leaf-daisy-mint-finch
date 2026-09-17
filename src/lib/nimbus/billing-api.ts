import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid } from "./ids";
import { applyBillingEvent } from "./billing";
import { loadContext } from "./workspace.server";
import { PRO_PRICE_MONTH_CENTS, PRO_PRICE_YEAR_CENTS } from "./limits";

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { interval: "month" | "year" }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const price = data.interval === "year" ? PRO_PRICE_YEAR_CENTS : PRO_PRICE_MONTH_CENTS;

    if (stripeKey) {
      const origin = process.env.APP_ORIGIN || "";
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          mode: "subscription",
          success_url: `${origin}/app/settings?billing=success`,
          cancel_url: `${origin}/app/settings?billing=cancel`,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][product_data][name]": "Nimbus Pro",
          "line_items[0][price_data][unit_amount]": String(price),
          "line_items[0][price_data][recurring][interval]": data.interval === "year" ? "year" : "month",
          "line_items[0][quantity]": "1",
          client_reference_id: ctx.workspace.id,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: { message?: string } };
      if (!res.ok || !json.url) throw new Error(json.error?.message || "Could not start checkout");
      return { url: json.url, simulated: false as const };
    }

    return { url: `/app/checkout?interval=${data.interval}`, simulated: true as const };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { interval: "month" | "year" }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const next = applyBillingEvent(
      {
        plan: ctx.workspace.plan,
        plan_status: ctx.workspace.plan_status,
        plan_interval: ctx.workspace.plan_interval,
        plan_renews_at: ctx.workspace.plan_renews_at,
        canceled_at: ctx.workspace.canceled_at,
      },
      { type: "checkout.session.completed", interval: data.interval },
    );
    const sql = await getSql();
    await sql`
      update workspaces set
        plan = ${next.plan},
        plan_status = ${next.plan_status},
        plan_interval = ${next.plan_interval},
        plan_renews_at = ${next.plan_renews_at},
        canceled_at = ${next.canceled_at}
      where id = ${ctx.workspace.id}
    `;
    await sql`
      insert into billing_events (id, workspace_id, type, payload)
      values (${nid()}, ${ctx.workspace.id}, ${"checkout.session.completed"}, ${JSON.stringify({ interval: data.interval })})
    `;
    return { ok: true };
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripeCustomer = process.env.STRIPE_CUSTOMER_PLACEHOLDER;
    if (stripeKey && stripeCustomer) {
      const origin = process.env.APP_ORIGIN || "";
      const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: stripeCustomer,
          return_url: `${origin}/app/settings`,
        }),
      });
      const json = (await res.json()) as { url?: string };
      if (json.url) return { url: json.url, simulated: false as const };
    }
    return { url: "/app/settings?tab=billing", simulated: true as const };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const next = applyBillingEvent(
      {
        plan: ctx.workspace.plan,
        plan_status: ctx.workspace.plan_status,
        plan_interval: ctx.workspace.plan_interval,
        plan_renews_at: ctx.workspace.plan_renews_at,
        canceled_at: ctx.workspace.canceled_at,
      },
      { type: "customer.subscription.deleted" },
    );
    const sql = await getSql();
    await sql`
      update workspaces set
        plan_status = ${next.plan_status},
        canceled_at = ${next.canceled_at}
      where id = ${ctx.workspace.id}
    `;
    await sql`
      insert into billing_events (id, workspace_id, type, payload)
      values (${nid()}, ${ctx.workspace.id}, ${"customer.subscription.deleted"}, ${"{}"})
    `;
    return { ok: true };
  });

export const setWorkspaceLogo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { logo_data: string | null }) => input)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (!ctx.limits.customInvoiceLogo) throw new Error("Custom invoice logos are included with Pro.");
    const sql = await getSql();
    await sql`update workspaces set logo_data = ${data.logo_data} where id = ${ctx.workspace.id}`;
    return { ok: true };
  });
