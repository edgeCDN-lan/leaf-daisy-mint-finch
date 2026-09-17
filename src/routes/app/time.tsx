import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTimeEntry, deleteTimeEntry, listTimeEntries, startTimer, stopTimer } from "@/lib/nimbus/time.server";
import { listProjects } from "@/lib/nimbus/projects.server";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/time")({ component: TimePage });

function TimePage() {
  const qc = useQueryClient();
  const entries = useQuery({ queryKey: ["time"], queryFn: () => listTimeEntries() });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [manualHours, setManualHours] = useState("1");
  const running = entries.data?.find((e) => e.running);

  const start = useMutation({
    mutationFn: () => startTimer({ data: { project_id: projectId || null, notes } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const stop = useMutation({
    mutationFn: () => stopTimer(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Timer stopped");
    },
  });
  const add = useMutation({
    mutationFn: () =>
      addTimeEntry({
        data: { project_id: projectId || null, notes, duration_seconds: Math.round(Number(manualHours) * 3600) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time"] });
      toast.success("Entry added");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTimeEntry({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time"] }),
  });

  const week = useMemo(() => (entries.data ?? []).reduce((s, e) => s + (e.running ? 0 : e.duration_seconds), 0), [entries.data]);
  const pname = (id: string | null) => projects.data?.find((p) => p.id === id)?.name || "No project";

  return (
    <div>
      <PageHeader
        eyebrow="Hours"
        title="Time"
        description="A timer for the task in front of you, and a timesheet that adds up."
      />
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Timer</p>
          <p className="mt-2 font-display text-3xl tabular">{formatDuration(week)} logged</p>
          <select
            className="mt-4 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {(projects.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Input className="mt-3" placeholder="What are you doing?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {running ? (
            <Button className="mt-4 w-full" variant="destructive" onClick={() => stop.mutate()}>
              Stop timer
            </Button>
          ) : (
            <Button className="mt-4 w-full" onClick={() => start.mutate()}>
              Start timer
            </Button>
          )}
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Manual entry (hours)</p>
            <div className="mt-2 flex gap-2">
              <Input type="number" min="0.25" step="0.25" value={manualHours} onChange={(e) => setManualHours(e.target.value)} />
              <Button variant="outline" onClick={() => add.mutate()}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <div>
          {entries.data?.length ? (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.data.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3 tabular">{String(e.started_at).slice(0, 16)}</td>
                      <td className="px-4 py-3">{pname(e.project_id)}</td>
                      <td className="px-4 py-3">{e.notes || "—"}</td>
                      <td className="px-4 py-3 tabular">{e.running ? "Running" : formatDuration(e.duration_seconds)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Clock3 className="size-5" />}
              title="No time yet"
              description="Start a timer or add hours after the fact."
            />
          )}
        </div>
      </div>
    </div>
  );
}
