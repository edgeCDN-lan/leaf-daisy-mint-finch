import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient, createDeal, listClients, listDeals, updateClient, updateDeal } from "@/lib/nimbus/crm.server";
import type { Client, Deal } from "@/lib/nimbus/types";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/crm")({ component: CrmPage });

const STAGES: Deal["stage"][] = ["lead", "qualified", "proposal", "won", "lost"];

function CrmPage() {
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const deals = useQuery({ queryKey: ["deals"], queryFn: () => listDeals() });
  const [open, setOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [dealClient, setDealClient] = useState("");
  const [dealValue, setDealValue] = useState("0");

  const addClient = useMutation({
    mutationFn: () => createClient({ data: { name, email, company } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setOpen(false);
      setName("");
      toast.success("Client added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const addDeal = useMutation({
    mutationFn: () =>
      createDeal({ data: { client_id: dealClient, title: dealTitle, value_cents: Math.round(Number(dealValue) * 100) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      setDealOpen(false);
      toast.success("Deal added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const move = useMutation({
    mutationFn: (input: { id: string; stage: Deal["stage"] }) => updateDeal({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
  const patchClient = useMutation({
    mutationFn: (input: Partial<Client> & { id: string }) => updateClient({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title="Clients"
        description="A small CRM: who they are, and where the work sits in the pipeline."
        actions={
          <>
            <Button variant="outline" onClick={() => setDealOpen(true)}>
              New deal
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus /> New client
            </Button>
          </>
        }
      />
      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">People</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
          {clients.data?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clients.data.map((c) => (
                <article key={c.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <h2 className="font-display text-xl">{c.name}</h2>
                    <Badge variant="secondary">{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.company || "Independent"}</p>
                  <p className="mt-2 text-sm">{c.email || "No email"}</p>
                  {c.locked ? <p className="mt-3 text-xs text-muted-foreground">View only — over Free limit</p> : null}
                  {!c.locked ? (
                    <select
                      className="mt-4 h-10 w-full rounded-md border border-input bg-card px-2 text-sm"
                      value={c.status}
                      onChange={(e) => patchClient.mutate({ id: c.id, status: e.target.value as Client["status"] })}
                    >
                      {["lead", "active", "paused", "churned"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="size-5" />}
              title="No clients yet"
              description="Five clients are included on Free. Add the people you invoice."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus /> New client
                </Button>
              }
            />
          )}
        </TabsContent>
        <TabsContent value="pipeline">
          <div className="grid gap-3 md:grid-cols-5">
            {STAGES.map((stage) => (
              <div
                key={stage}
                className="min-h-56 rounded-2xl bg-secondary/60 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/deal");
                  if (id) move.mutate({ id, stage });
                }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{stage}</p>
                <div className="space-y-2">
                  {(deals.data ?? [])
                    .filter((d) => d.stage === stage)
                    .map((d) => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/deal", d.id)}
                        className="rounded-xl border border-border bg-card p-3"
                      >
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className="mt-1 text-xs tabular text-muted-foreground">{formatMoney(d.value_cents)}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!name.trim() || addClient.isPending} onClick={() => addClient.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
            <select
              className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={dealClient}
              onChange={(e) => setDealClient(e.target.value)}
            >
              <option value="">Select client</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="space-y-2">
              <Label>Value (USD)</Label>
              <Input type="number" min="0" step="0.01" value={dealValue} onChange={(e) => setDealValue(e.target.value)} />
            </div>
            <Textarea placeholder="Optional notes live on the client card." readOnly className="hidden" />
          </div>
          <DialogFooter>
            <Button disabled={!dealTitle.trim() || !dealClient || addDeal.isPending} onClick={() => addDeal.mutate()}>
              Save deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
