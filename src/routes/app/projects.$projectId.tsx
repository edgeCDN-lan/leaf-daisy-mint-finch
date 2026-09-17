import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { addComment, createTask, deleteProject, listComments, listProjects, listTasks, updateProject, updateTask } from "@/lib/nimbus/projects.server";
import type { Task } from "@/lib/nimbus/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/projects/$projectId")({ component: ProjectDetail });

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const tasks = useQuery({ queryKey: ["tasks", projectId], queryFn: () => listTasks({ data: { projectId } }) });
  const project = projects.data?.find((p) => p.id === projectId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [due, setDue] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createTask({
        data: { project_id: projectId, title, description, priority, due_date: due || null },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Task added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: (input: { id: string; status: Task["status"] }) => updateTask({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const archive = useMutation({
    mutationFn: () => updateProject({ data: { id: projectId, status: project?.status === "archived" ? "active" : "archived" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteProject({ data: { id: projectId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/app/projects" });
    },
  });

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = { todo: [], in_progress: [], blocked: [], done: [] };
    for (const t of tasks.data ?? []) g[t.status]?.push(t);
    return g;
  }, [tasks.data]);

  if (!projects.isPending && !project) {
    return (
      <div>
        <p>Project not found.</p>
        <Button asChild variant="link">
          <Link to="/app/projects">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title={project?.name || "Project"}
        description={project?.description}
        actions={
          <>
            <Button variant="outline" onClick={() => archive.mutate()}>
              {project?.status === "archived" ? "Restore" : "Archive"}
            </Button>
            <Button variant="destructive" onClick={() => remove.mutate()}>
              Delete
            </Button>
            <Button onClick={() => setOpen(true)} disabled={project?.locked}>
              <Plus /> Task
            </Button>
          </>
        }
      />
      {project?.locked ? (
        <p className="mb-4 text-sm text-muted-foreground">This project is over the Free cap and is view-only.</p>
      ) : null}

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          <div className="grid gap-3 md:grid-cols-4">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="rounded-2xl bg-secondary/60 p-3 min-h-64"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/task");
                  if (id && !project?.locked) move.mutate({ id, status: col.id });
                }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {col.label}
                </p>
                <div className="space-y-2">
                  {(grouped[col.id] ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      draggable={!project?.locked}
                      onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                      onClick={() => setSelected(t)}
                      className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm"
                    >
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary">{t.priority}</Badge>
                        {t.due_date ? <span className="text-xs text-muted-foreground">{t.due_date}</span> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="list">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {(tasks.data ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium" onClick={() => setSelected(t)}>
                        {t.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 capitalize">{t.status.replace("_", " ")}</td>
                    <td className="px-4 py-3">{t.priority}</td>
                    <td className="px-4 py-3 tabular">{t.due_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView tasks={tasks.data ?? []} onOpen={setSelected} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Notes" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "urgent"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due</Label>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDrawer task={selected} onClose={() => setSelected(null)} locked={!!project?.locked} />
    </div>
  );
}

function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const start = new Date();
  start.setDate(1);
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const pad = start.getDay();
  const cells = Array.from({ length: pad + days }, (_, i) => i - pad + 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="text-xs text-muted-foreground">
          {d}
        </div>
      ))}
      {cells.map((day, i) => {
        const date =
          day > 0
            ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
        const items = tasks.filter((t) => t.due_date === date);
        return (
          <div key={i} className="min-h-24 rounded-xl border border-border bg-card p-2">
            {day > 0 ? <p className="text-xs tabular text-muted-foreground">{day}</p> : null}
            {items.map((t) => (
              <button key={t.id} type="button" className="mt-1 block w-full truncate text-left text-xs" onClick={() => onOpen(t)}>
                {t.title}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TaskDrawer({ task, onClose, locked }: { task: Task | null; onClose: () => void; locked: boolean }) {
  const qc = useQueryClient();
  const comments = useQuery({
    queryKey: ["comments", task?.id],
    queryFn: () => listComments({ data: { entity_type: "task", entity_id: task!.id } }),
    enabled: !!task,
  });
  const [body, setBody] = useState("");
  const save = useMutation({
    mutationFn: (patch: Partial<Task>) => updateTask({ data: { id: task!.id, ...patch } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", task?.project_id] });
      toast.success("Saved");
    },
  });
  const comment = useMutation({
    mutationFn: () => addComment({ data: { entity_type: "task", entity_id: task!.id, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", task?.id] });
    },
  });
  if (!task) return null;
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <Textarea
          defaultValue={task.description}
          disabled={locked}
          onBlur={(e) => !locked && save.mutate({ description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select defaultValue={task.status} disabled={locked} onValueChange={(v) => save.mutate({ status: v as Task["status"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            defaultValue={task.due_date ?? ""}
            disabled={locked}
            onBlur={(e) => !locked && save.mutate({ due_date: e.target.value || null })}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Comments</p>
          <ul className="space-y-2 text-sm">
            {(comments.data ?? []).map((c) => (
              <li key={c.id} className="rounded-lg bg-secondary p-2">
                {c.body}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment" />
            <Button size="sm" disabled={!body.trim()} onClick={() => comment.mutate()}>
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
