import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceProvider } from "@/components/layout/workspace-context";
import { Skeleton } from "@/components/ui/skeleton";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBootstrap } from "@/lib/nimbus/bootstrap.server";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const bootstrap = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    enabled: !!user,
  });

  if (isPending) return <ShellSkeleton />;
  if (!user) return <RedirectToSignIn />;
  if (bootstrap.isPending) return <ShellSkeleton />;
  if (bootstrap.isError) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl">Could not load workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in again or refresh.</p>
        </div>
      </div>
    );
  }
  const data = bootstrap.data!;
  if (!data.workspace.onboarding_done) return <Navigate to="/onboarding" />;
  return (
    <WorkspaceProvider value={data}>
      <AppShell>
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-60 border-r border-border p-4 md:block">
        <Skeleton className="h-8 w-32" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  );
}
