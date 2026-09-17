import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { colorClass, PROJECT_COLORS } from "@/lib/nimbus/colors";
import { createProject, listProjects } from "@/lib/nimbus/projects.server";
import { toast } from "sonner";
import { FolderKanban } from "lucide-react";

export const Route = createFileRoute("/app/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("lagoon");
  const create = useMutation({
    mutationFn: () => createProject({ data: { name, description, color } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      setOpen(false);
      setName("");
      setDescription("");
      toast.success("Project created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        description="Boards, lists, and dates for the work that ships."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New project
          </Button>
        }
      />
      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : q.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((p) => (
            <Link
              key={p.id}
              to="/app/projects/$projectId"
              params={{ projectId: p.id }}
              className="block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <span className={`size-3 rounded-full ${colorClass(p.color)}`} />
                {p.status === "archived" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Archive className="size-3" /> Archived
                  </span>
                ) : p.locked ? (
                  <span className="text-xs text-muted-foreground">View only</span>
                ) : null}
              </div>
              <h2 className="mt-4 font-display text-xl">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description"}</p>
              <p className="mt-4 text-xs tabular text-muted-foreground">
                {p.done_count ?? 0}/{p.task_count ?? 0} done
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title="No projects yet"
          description="Create the first one. Three live projects are included on Free."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> New project
            </Button>
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Description</Label>
              <Textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setColor(c.id)}
                    className={`size-8 rounded-full ${c.swatch} ${color === c.id ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
