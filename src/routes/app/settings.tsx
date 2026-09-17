import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { useWorkspace } from "@/components/layout/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cancelSubscription, openBillingPortal, setWorkspaceLogo, startCheckout } from "@/lib/nimbus/billing.server";
import { inviteMember, listMembers, removeMember } from "@/lib/nimbus/team.server";
import { renameWorkspace } from "@/lib/nimbus/bootstrap.server";
import { formatBytes } from "@/lib/utils";
import { FREE_LIMITS, PRO_LIMITS, usagePercent } from "@/lib/nimbus/limits";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(ws.workspace.name);
  const [email, setEmail] = useState("");
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const rename = useMutation({
    mutationFn: () => renameWorkspace({ data: { name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Workspace renamed");
    },
  });
  const invite = useMutation({
    mutationFn: () => inviteMember({ data: { email } }),
    onSuccess: () => {
      setEmail("");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Invite saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const kick = useMutation({
    mutationFn: (id: string) => removeMember({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
  const checkout = useMutation({
    mutationFn: (interval: "month" | "year") => startCheckout({ data: { interval } }),
    onSuccess: (res, interval) => {
      if (res.url.startsWith("http")) window.location.href = res.url;
      else navigate({ to: "/app/checkout", search: { interval } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const portal = useMutation({
    mutationFn: () => openBillingPortal(),
    onSuccess: (res) => {
      if (res.simulated) toast.message("Billing portal", { description: "Manage the plan on this page." });
      else window.location.href = res.url;
    },
  });
  const cancel = useMutation({
    mutationFn: () => cancelSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Pro will end at the period close. Data is kept.");
    },
  });
  const logo = useMutation({
    mutationFn: (logo_data: string | null) => setWorkspaceLogo({ data: { logo_data } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Logo saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = [
    { label: "Projects", used: ws.usage.activeProjects, max: ws.limits.maxActiveProjects },
    { label: "Clients", used: ws.usage.clients, max: ws.limits.maxClients },
    { label: "Invoices this month", used: ws.usage.invoicesThisMonth, max: ws.limits.maxInvoicesPerMonth },
    { label: "Team", used: ws.usage.members, max: ws.limits.maxMembers },
    { label: "AI requests", used: ws.usage.aiThisMonth, max: ws.limits.maxAiPerMonth },
  ];

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Profile of the workspace, people, and the plan." />
      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => rename.mutate()}>Save</Button>
          </div>
          <div className="space-y-2">
            <Label>Invoice logo (Pro)</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => logo.mutate(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            {ws.workspace.logo_data ? (
              <img src={ws.workspace.logo_data} alt="" className="h-10" />
            ) : null}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-medium">You</p>
            <p className="mt-1 text-sm">{ws.user.name}</p>
            <p className="text-sm text-muted-foreground">{ws.user.email}</p>
          </div>
        </TabsContent>
        <TabsContent value="team" className="max-w-lg space-y-4">
          <div className="flex gap-2">
            <Input placeholder="teammate@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={() => invite.mutate()} disabled={invite.isPending}>
              Invite
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {(members.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p>{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.role} · {m.status}
                  </p>
                </div>
                {m.role !== "owner" ? (
                  <Button size="sm" variant="ghost" onClick={() => kick.mutate(m.id)}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="billing">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">Current plan</h2>
                <Badge>{ws.effective === "pro" ? "Pro" : "Free"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Status: {ws.workspace.plan_status}
                {ws.workspace.plan_renews_at ? ` · renews ${String(ws.workspace.plan_renews_at).slice(0, 10)}` : ""}
              </p>
              {ws.effective === "free" ? (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => checkout.mutate("month")}>Upgrade $9 / mo</Button>
                  <Button variant="outline" onClick={() => checkout.mutate("year")}>
                    $90 / year
                  </Button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => portal.mutate()}>
                    Open customer portal
                  </Button>
                  <Button variant="ghost" onClick={() => cancel.mutate()}>
                    Cancel Pro
                  </Button>
                </div>
              )}
              {ws.workspace.plan_status === "canceled" || ws.workspace.plan_status === "past_due" ? (
                <Button className="mt-3" asChild>
                  <Link to="/app/settings">Renew</Link>
                </Button>
              ) : null}
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl">Usage</h2>
              <ul className="mt-4 space-y-4">
                {rows.map((r) => (
                  <li key={r.label}>
                    <div className="flex justify-between text-sm">
                      <span>{r.label}</span>
                      <span className="tabular text-muted-foreground">
                        {r.used} / {Number.isFinite(r.max) ? r.max : "∞"}
                      </span>
                    </div>
                    <Progress className="mt-2" value={usagePercent(r.used, r.max)} />
                  </li>
                ))}
                <li>
                  <div className="flex justify-between text-sm">
                    <span>Storage</span>
                    <span className="tabular text-muted-foreground">
                      {formatBytes(ws.usage.storageBytes)} / {formatBytes(ws.limits.maxStorageBytes)}
                    </span>
                  </div>
                  <Progress className="mt-2" value={usagePercent(ws.usage.storageBytes, ws.limits.maxStorageBytes)} />
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Free includes {FREE_LIMITS.maxActiveProjects} projects and {FREE_LIMITS.maxClients} clients. Pro lifts
                those to {Number.isFinite(PRO_LIMITS.maxActiveProjects) ? PRO_LIMITS.maxActiveProjects : "unlimited"}.
              </p>
            </article>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
