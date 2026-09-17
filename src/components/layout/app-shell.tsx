import { Link, useRouterState } from "@tanstack/react-router";
import {
  Clock3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Paperclip,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { NimbusMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserButton } from "@/lib/auth/gates";
import { usagePercent } from "@/lib/nimbus/limits";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/crm", label: "Clients", icon: Users },
  { to: "/app/invoices", label: "Invoices", icon: Wallet },
  { to: "/app/time", label: "Time", icon: Clock3 },
  { to: "/app/files", label: "Files", icon: Paperclip },
  { to: "/app/assistant", label: "Assistant", icon: Sparkles },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-background">
      <LimitBanner />
      <div className="flex min-h-dvh">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <Nav onNavigate={() => undefined} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
            <div className="flex items-center gap-2 md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
                <Menu />
              </Button>
              <NimbusMark className="size-7" />
            </div>
            <p className="hidden text-sm text-muted-foreground md:block">Workspace</p>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/assistant">Assistant</Link>
              </Button>
              <ThemeToggle />
              <div className="pl-1">
                <UserButton />
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Nav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Nav({ onNavigate }: { onNavigate: () => void }) {
  const ws = useWorkspace();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const storagePct = usagePercent(ws.usage.storageBytes, ws.limits.maxStorageBytes);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <NimbusMark className="size-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{ws.workspace.name}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {ws.effective === "pro" ? "Pro" : "Free"}
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
        {NAV.map((item) => {
          const active = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">Storage</p>
        <Progress value={storagePct} className="mt-2" />
        <p className="mt-2 text-xs text-muted-foreground">{storagePct}% of plan</p>
      </div>
    </div>
  );
}

function LimitBanner() {
  const ws = useWorkspace();
  if (ws.workspace.plan_status === "past_due") {
    return (
      <div className="bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground">
        Payment failed. You are on Free limits.{" "}
        <Link to="/app/settings" className="underline">
          Renew Pro
        </Link>
      </div>
    );
  }
  if (ws.workspace.plan_status === "canceled" && ws.effective === "pro") {
    return (
      <div className="bg-secondary px-4 py-2 text-center text-sm">
        Pro is canceled and ends at the current period.{" "}
        <Link to="/app/settings" className="underline">
          Renew
        </Link>
      </div>
    );
  }
  if (ws.overLimit) {
    return (
      <div className="bg-secondary px-4 py-2 text-center text-sm">
        This workspace is over Free limits. Extra items are view-only.{" "}
        <Link to="/app/settings" className="underline">
          Upgrade to Pro
        </Link>
      </div>
    );
  }
  if (ws.effective === "free") return null;
  return null;
}
