import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoice, deleteInvoice, getInvoice, listInvoices, updateInvoice } from "@/lib/nimbus/invoices.server";
import { listClients } from "@/lib/nimbus/crm.server";
import type { Invoice, InvoiceItem } from "@/lib/nimbus/types";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import { useWorkspace } from "@/components/layout/workspace-context";

export const Route = createFileRoute("/app/invoices")({ component: InvoicesPage });

function InvoicesPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const [open, setOpen] = useState(false);
  const [printId, setPrintId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", qty: 1, unit_cents: 0 }]);
  const printable = useQuery({
    queryKey: ["invoice", printId],
    queryFn: () => getInvoice({ data: { id: printId! } }),
    enabled: !!printId,
  });

  const create = useMutation({
    mutationFn: () => createInvoice({ data: { client_id: clientId || null, items } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setOpen(false);
      toast.success("Invoice drafted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const patch = useMutation({
    mutationFn: (input: { id: string; status: Invoice["status"] }) => updateInvoice({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice updated");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteInvoice({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const clientName = (id: string | null) => clients.data?.find((c) => c.id === id)?.name || "No client";

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Draft, send, mark paid, and print. Five a month on Free."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New invoice
          </Button>
        }
      />
      {q.data?.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {q.data.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium tabular">{inv.number}</td>
                  <td className="px-4 py-3">{clientName(inv.client_id)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "destructive" : "secondary"}>
                      {inv.status}
                    </Badge>
                    {inv.locked ? <span className="ml-2 text-xs text-muted-foreground">view only</span> : null}
                  </td>
                  <td className="px-4 py-3 tabular">{formatMoney(inv.total_cents ?? 0, inv.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPrintId(inv.id)}>
                        Print
                      </Button>
                      {inv.status !== "paid" && !inv.locked ? (
                        <Button size="sm" onClick={() => patch.mutate({ id: inv.id, status: "paid" })}>
                          Mark paid
                        </Button>
                      ) : null}
                      {inv.status === "draft" && !inv.locked ? (
                        <Button size="sm" variant="secondary" onClick={() => patch.mutate({ id: inv.id, status: "sent" })}>
                          Mark sent
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(inv.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No invoices"
          description="Write a line item, send it, and keep the lights on."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> New invoice
            </Button>
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Client</Label>
              <select
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">None</option>
                {(clients.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_7rem] gap-2">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    setItems((xs) => xs.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))
                  }
                />
                <Input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) =>
                    setItems((xs) => xs.map((x, idx) => (idx === i ? { ...x, qty: Number(e.target.value) } : x)))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={item.unit_cents / 100 || ""}
                  onChange={(e) =>
                    setItems((xs) =>
                      xs.map((x, idx) => (idx === i ? { ...x, unit_cents: Math.round(Number(e.target.value) * 100) } : x)),
                    )
                  }
                />
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={() => setItems((xs) => [...xs, { description: "", qty: 1, unit_cents: 0 }])}>
              Add line
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!printId} onOpenChange={() => setPrintId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {printable.data ? (
            <InvoicePreview
              inv={printable.data}
              client={clientName(printable.data.client_id)}
              workspace={printable.data.workspace_name}
              logo={printable.data.logo}
              customLogo={ws.limits.customInvoiceLogo}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          <DialogFooter>
            <Button onClick={() => window.print()}>Print / PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicePreview({
  inv,
  client,
  workspace,
  logo,
}: {
  inv: Invoice & { total_cents?: number; logo?: string | null; workspace_name?: string };
  client: string;
  workspace?: string;
  logo?: string | null;
  customLogo?: boolean;
}) {
  const items = useMemo(() => {
    try {
      return JSON.parse(inv.items_json) as InvoiceItem[];
    } catch {
      return [];
    }
  }, [inv.items_json]);
  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <div className="flex items-start justify-between">
        <div>
          {logo ? <img src={logo} alt="" className="mb-3 h-10" /> : null}
          <p className="font-display text-2xl">{workspace || "Nimbus"}</p>
          <p className="text-sm text-muted-foreground">{inv.number}</p>
        </div>
        <Badge>{inv.status}</Badge>
      </div>
      <p className="mt-6 text-sm">Bill to {client}</p>
      <p className="text-xs text-muted-foreground">Issued {inv.issue_date}</p>
      <table className="mt-6 w-full text-sm">
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2">{it.description}</td>
              <td className="py-2 text-right tabular">{it.qty} × {formatMoney(it.unit_cents)}</td>
              <td className="py-2 text-right tabular">{formatMoney(it.qty * it.unit_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right font-display text-2xl tabular">{formatMoney(inv.total_cents ?? 0)}</p>
    </div>
  );
}
