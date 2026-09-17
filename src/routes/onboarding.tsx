import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NimbusWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { completeOnboarding, getBootstrap } from "@/lib/nimbus/bootstrap.server";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const bootstrap = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    enabled: !!user,
  });
  const mutation = useMutation({
    mutationFn: (seed: boolean) => completeOnboarding({ data: { name: name || bootstrap.data?.workspace.name || "Workspace", seed } }),
    onSuccess: () => navigate({ to: "/app" }),
  });

  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;
  if (bootstrap.data?.workspace.onboarding_done) return <Navigate to="/app" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      <NimbusWordmark />
      <h1 className="mt-10 font-display text-4xl font-medium tracking-tight">Name the workspace.</h1>
      <p className="mt-3 text-sm text-muted-foreground">You can invite people later. This is the room everything lives in.</p>
      <div className="mt-8 space-y-2">
        <Label htmlFor="ws">Workspace name</Label>
        <Input
          id="ws"
          placeholder={bootstrap.data?.workspace.name || "Studio"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {mutation.error ? (
        <p className="mt-4 text-sm text-destructive">{mutation.error.message}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>
          Start with a sample project
        </Button>
        <Button variant="outline" className="flex-1" disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>
          Start empty
        </Button>
      </div>
    </main>
  );
}
