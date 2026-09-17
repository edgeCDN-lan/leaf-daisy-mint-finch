# Nimbus Workspace

One workspace for freelancers and small teams: projects, notes, clients, invoices, time, files, and a metered assistant.

## What you get

- **Free** — 1 person, 3 live projects, 5 clients, 5 invoices / month, 500 MB files, 20 AI requests / month
- **Pro** — $9 / month or $90 / year: unlimited work, invoice logo, 50 GB files, 500 AI requests, up to 10 teammates, richer analytics
- If Pro lapses, data is kept. Anything beyond Free limits becomes view-and-export until you renew.

## Stack

TanStack Start, React, Tailwind CSS, Postgres (Neon in production, embedded Postgres in preview), Better Auth (email, Google, X), xAI for the assistant.

## Local development

```bash
npm install
npm run dev
```

The app listens on port 8080. Sign-in is real. Preview databases reset when the dev server restarts.

```bash
npm run typecheck
npm test
npm run build
```

## Deploy

The production host provisions Postgres and auth credentials. Do not commit secrets.

If you attach a card processor, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the server. Checkout sessions and `/api/billing/webhook` then talk to Stripe. Without those keys, Pro is activated through the in-app checkout so the product still works.

The assistant uses `XAI_API_KEY` on the server. If it is missing, the assistant shows an unavailable state instead of failing the rest of the app.

## Limits after a lapsed plan

Bootstrap checks the subscription on every load. Canceled Pro stays Pro until the period end, then the workspace is Free. `past_due` uses Free limits immediately and shows a renew banner. Extra rows are never deleted.
