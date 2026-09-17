import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/nimbus/notes.server";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notes")({ component: NotesPage });

function NotesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notes"], queryFn: () => listNotes() });
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("Inbox");
  const [content, setContent] = useState("");
  const notes = q.data ?? [];
  const filtered = useMemo(() => {
    const s = query.toLowerCase();
    return notes.filter(
      (n) => !s || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s) || n.folder.toLowerCase().includes(s),
    );
  }, [notes, query]);
  const current = notes.find((n) => n.id === selected) ?? filtered[0];

  useEffect(() => {
    if (!current) return;
    setSelected(current.id);
    setTitle(current.title);
    setFolder(current.folder);
    setContent(current.content);
  }, [current?.id]);

  const persist = (patch: { title?: string; content?: string; folder?: string }) => {
    if (!current) return;
    save.mutate({ id: current.id, ...patch });
  };

  const create = useMutation({
    mutationFn: () => createNote({ data: { title: "Untitled", folder: "Inbox" } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setSelected(res.id);
    },
  });
  const save = useMutation({
    mutationFn: (patch: { id: string; title?: string; content?: string; folder?: string }) => updateNote({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteNote({ data: { id } }),
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Writing"
        title="Notes"
        description="Folders, search, and a quiet editor. Markdown is welcome."
        actions={
          <Button onClick={() => create.mutate()}>
            <Plus /> New note
          </Button>
        }
      />
      {q.isPending ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="A blank page"
          description="Kickoff notes, briefs, and meeting transcripts live here."
          action={
            <Button onClick={() => create.mutate()}>
              <Plus /> New note
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <ul className="mt-3 space-y-1">
              {filtered.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(n.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left ${current?.id === n.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
                  >
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.folder}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {current ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => persist({ title })}
                  className="font-display text-lg"
                />
                <Input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  onBlur={() => persist({ folder })}
                  className="sm:max-w-40"
                />
                <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => remove.mutate(current.id)}>
                  <Trash2 />
                </Button>
              </div>
              <Textarea
                className="min-h-[28rem] font-sans leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => persist({ content })}
                placeholder="Write…"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
