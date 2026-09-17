import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/nimbus/dashboard.server";
import { useWorkspace } from "@/components/layout/workspace-context";
import { formatDuration, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  if (q.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  const d = q.data;
  return (
    <div>
      <PageHeader
        eyebrow="Today"
        title={`Good to see you, ${ws.user.name.split(" ")[0]}`}
        description="Revenue, tasks at hand, and the hours this week — in one glance."
        actions={
          <Button asChild>
            <Link to="/app/projects">Open projects</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Paid" value={formatMoney(d?.paid ?? 0)} hint={`${d?.invoiceCount ?? 0} invoices on file`} />
        <Stat label="Outstanding" value={formatMoney(d?.outstanding ?? 0)} hint="Sent or overdue" />
        <Stat label="Time this week" value={formatDuration(d?.weekSeconds ?? 0)} hint={d?.running ? "Timer is running" : "No live timer"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Hours, last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.byDay ?? []}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  formatter={(v) => formatDuration(Number(v))}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                />
                <Bar dataKey="seconds" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Due now</CardTitle>
          </CardHeader>
          <CardContent>
            {d?.todayTasks.length ? (
              <ul className="space-y-3">
                {d.todayTasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.due_date || "No date"}</p>
                    </div>
                    <Badge variant="secondary">{t.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing is due. Enjoy the quiet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      {ws.limits.advancedAnalytics ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-5">
            {d?.pipeline.map((p) => (
              <div key={p.stage} className="rounded-xl bg-secondary p-4">
                <p className="text-xs capitalize text-muted-foreground">{p.stage}</p>
                <p className="mt-2 font-display text-xl tabular">{formatMoney(p.value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Pipeline analytics ship with Pro.{" "}
          <Link to="/app/settings" className="underline">
            See plans
          </Link>
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl tabular">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
