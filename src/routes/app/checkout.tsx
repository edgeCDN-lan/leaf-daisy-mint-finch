import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { confirmCheckout } from "@/lib/nimbus/billing.server";
import { PRO_PRICE_MONTH_CENTS, PRO_PRICE_YEAR_CENTS } from "@/lib/nimbus/limits";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/checkout")({
  component: CheckoutPage,
  validateSearch: (search: Record<string, unknown>) => ({
    interval: search.interval === "year" ? ("year" as const) : ("month" as const),
  }),
});

function CheckoutPage() {
  const { interval } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const price = interval === "year" ? PRO_PRICE_YEAR_CENTS : PRO_PRICE_MONTH_CENTS;
  const pay = useMutation({
    mutationFn: () => confirmCheckout({ data: { interval } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Welcome to Pro");
      navigate({ to: "/app/settings" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        eyebrow="Checkout"
        title="Nimbus Pro"
        description="Secure in-app checkout. If a card processor is configured on the server, you are sent there instead."
      />
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{interval === "year" ? "Billed yearly" : "Billed monthly"}</p>
        <p className="mt-2 font-display text-4xl tabular">{formatMoney(price)}</p>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>Unlimited projects, clients, and invoices</li>
          <li>Logo on invoices · 50 GB files · 500 AI requests</li>
          <li>Up to 10 teammates</li>
        </ul>
        <Button className="mt-8 w-full" disabled={pay.isPending} onClick={() => pay.mutate()}>
          {pay.isPending ? "Confirming…" : "Pay and activate Pro"}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" asChild>
          <Link to="/app/settings">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
