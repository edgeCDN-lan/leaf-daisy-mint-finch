import { cn } from "@/lib/utils";

export function NimbusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9.2 19.4c-1.6 0-2.9-1.3-2.9-2.9 0-1.4 1-2.6 2.4-2.8.4-2.2 2.3-3.8 4.6-3.8 1.4 0 2.7.6 3.5 1.6.6-.4 1.4-.6 2.2-.6 2.1 0 3.8 1.6 4 3.6 1.5.1 2.7 1.4 2.7 2.9 0 1.6-1.3 2.9-2.9 2.9H9.2z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function NimbusWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <NimbusMark className="size-8" />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight">Nimbus</div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</div>
      </div>
    </div>
  );
}
