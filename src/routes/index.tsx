import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  FolderKanban,
  Sparkles,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { NimbusWordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Nimbus Workspace — one system for freelance work" },
      {
        name: "description",
        content:
          "Plan projects, write notes, manage clients, send invoices, and track time in one calm workspace. Free to start.",
      },
    ],
  }),
});

function AuthCta() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-11 w-28 animate-pulse rounded-md bg-secondary" />;
  if (user) {
    return (
      <Button asChild>
        <Link to="/app">Open workspace</Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <Link to="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link to="/signup">Start free</Link>
      </Button>
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <NimbusWordmark />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#product" className="hover:text-foreground">
              Product
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthCta />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="nimbus-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">For independents</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-6xl">
              The rest of your stack, finally in one room.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Projects, notes, clients, invoices, and time — designed as a single system, not a pile of subscriptions.
              Built for people who bill for their hours and keep their word.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignedOut>
                <Button size="lg" asChild>
                  <Link to="/signup">
                    Create a free workspace
                    <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Sign in with Google or X</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button size="lg" asChild>
                  <Link to="/app">
                    Continue to workspace
                    <ArrowRight />
                  </Link>
                </Button>
              </SignedIn>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No card. One person. Three live projects. Room to grow.</p>

            <div id="product" className="mt-16 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <ProductFrame />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Modules</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Everything you open before lunch, without leaving the page.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  {f.icon}
                </div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">Start free. Grow when the books do.</h2>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <PlanCard
                name="Free"
                price="$0"
                detail="Forever, no card"
                cta="Create workspace"
                href="/signup"
                items={[
                  "1 user",
                  "3 active projects",
                  "5 clients",
                  "5 invoices / month",
                  "500 MB files",
                  "20 AI requests / month",
                ]}
              />
              <PlanCard
                name="Pro"
                price="$9"
                detail="or $90 / year"
                featured
                cta="Upgrade in the app"
                href="/signup"
                items={[
                  "Unlimited projects, clients, invoices",
                  "Your logo on invoices",
                  "50 GB file storage",
                  "500 AI requests / month",
                  "Up to 10 teammates",
                  "Advanced analytics & priority support",
                ]}
              />
            </div>
            <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
              If Pro lapses, nothing is deleted. Extra projects and clients become view-and-export until you renew or
              bring the workspace back within Free limits.
            </p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-medium tracking-tight">Questions, answered plainly.</h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <NimbusWordmark />
          <p>Nimbus Workspace. Built for people who invoice.</p>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  detail,
  items,
  cta,
  href,
  featured,
}: {
  name: string;
  price: string;
  detail: string;
  items: string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-6 ${featured ? "border-primary bg-card shadow-[var(--shadow-soft)]" : "border-border bg-background"}`}
    >
      <p className="text-sm font-medium">{name}</p>
      <p className="mt-3 font-display text-4xl font-medium tabular">{price}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>
      <Button className="mt-8 w-full" variant={featured ? "default" : "outline"} asChild>
        <Link to={href}>{cta}</Link>
      </Button>
    </article>
  );
}

function ProductFrame() {
  return (
    <div className="bg-secondary/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 text-xs text-muted-foreground">Today · Northwind Studio</span>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-[220px_1fr]">
        <aside className="hidden bg-card p-4 md:block">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
          <ul className="mt-4 space-y-1 text-sm">
            {["Dashboard", "Projects", "Notes", "Clients", "Invoices", "Time"].map((item, i) => (
              <li
                key={item}
                className={`rounded-lg px-3 py-2 ${i === 0 ? "bg-secondary font-medium" : "text-muted-foreground"}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>
        <div className="grid gap-px bg-border sm:grid-cols-3">
          {[
            { label: "Paid this month", value: "$4,280" },
            { label: "Hours this week", value: "18.5" },
            { label: "Due today", value: "3 tasks" },
          ].map((s) => (
            <div key={s.label} className="bg-card p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-display text-2xl tabular">{s.value}</p>
            </div>
          ))}
          <div className="bg-card p-5 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Board · Brand site refresh</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["Todo", "Doing", "Done"].map((col, i) => (
                <div key={col} className="rounded-xl bg-secondary/70 p-3">
                  <p className="text-xs font-medium">{col}</p>
                  <div className="mt-2 space-y-2">
                    <div className="h-10 rounded-lg bg-card" />
                    {i < 2 ? <div className="h-10 rounded-lg bg-card" /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card p-5">
            <p className="text-xs text-muted-foreground">Assistant</p>
            <p className="mt-3 text-sm leading-relaxed">
              Drafted a follow-up to Northwind. Three tasks extracted from yesterday’s call.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: "Projects & tasks",
    body: "Kanban, list, and calendar. Subtasks, due dates, tags, and comments without the ceremony.",
    icon: <FolderKanban className="size-5" />,
  },
  {
    title: "Notes",
    body: "Folders, search, and a focused editor. Turn a brief into a task list with the assistant.",
    icon: <FileText className="size-5" />,
  },
  {
    title: "Mini CRM",
    body: "Client cards and a simple pipeline. Know who you promised what, and when it is due.",
    icon: <Users className="size-5" />,
  },
  {
    title: "Invoices",
    body: "Draft, send, mark paid. Printable PDFs. Pro adds your mark at the top of the page.",
    icon: <Wallet className="size-5" />,
  },
  {
    title: "Time",
    body: "A timer on the task you are in. Timesheets and a week view that actually adds up.",
    icon: <Timer className="size-5" />,
  },
  {
    title: "Assistant",
    body: "Summaries, client emails, and tasks from a transcript. Metered, never chatty for its own sake.",
    icon: <Sparkles className="size-5" />,
  },
];

const FAQ = [
  {
    q: "Is the free plan actually free?",
    a: "Yes. One person, three live projects, five clients, five invoices a month, 500 MB of files, and 20 assistant requests. No card.",
  },
  {
    q: "What happens if Pro expires?",
    a: "The workspace returns to Free automatically. Your data stays. Anything beyond Free limits is viewable and exportable until you renew or archive the extra work.",
  },
  {
    q: "Can I invite a team?",
    a: "Pro includes up to ten people. Assign tasks, comment, and share the same clients and invoices.",
  },
  {
    q: "Do I need five other tools?",
    a: "Nimbus is meant to replace the usual mix of a board, a notes app, a CRM, invoicing, and a timer. Files live next to the work they belong to.",
  },
  {
    q: "How do I sign in?",
    a: "Email and password, Google, or X. Microsoft sign-in is not offered here — Google and X cover the social path.",
  },
];
