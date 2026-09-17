import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listAiMessages, runAssistant, type AiAction } from "@/lib/nimbus/ai.server";
import { useWorkspace } from "@/components/layout/workspace-context";
import { toast } from "sonner";
import { usagePercent } from "@/lib/nimbus/limits";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/assistant")({ component: AssistantPage });

const ACTIONS: { id: AiAction; label: string; hint: string }[] = [
  { id: "chat", label: "Ask", hint: "Anything about the work in front of you." },
  { id: "summarize", label: "Summarize", hint: "Paste a note. Get the short version." },
  { id: "email", label: "Draft email", hint: "A client-ready message from context." },
  { id: "tasks", label: "Extract tasks", hint: "Turn a brief or transcript into a list." },
];

function AssistantPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const msgs = useQuery({ queryKey: ["ai"], queryFn: () => listAiMessages() });
  const [action, setAction] = useState<AiAction>("chat");
  const [prompt, setPrompt] = useState("");
  const run = useMutation({
    mutationFn: () => runAssistant({ data: { action, prompt } }),
    onSuccess: () => {
      setPrompt("");
      qc.invalidateQueries({ queryKey: ["ai"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const used = usagePercent(ws.usage.aiThisMonth, ws.limits.maxAiPerMonth);

  return (
    <div>
      <PageHeader
        eyebrow="Assistant"
        title="A quiet extra pair of hands"
        description="Summaries, emails, and task lists. Metered, never on a loop."
      />
      <div className="mb-6 max-w-sm">
        <p className="text-xs text-muted-foreground">
          {ws.usage.aiThisMonth} / {Number.isFinite(ws.limits.maxAiPerMonth) ? ws.limits.maxAiPerMonth : "∞"} requests this month
        </p>
        <Progress className="mt-2" value={used} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button key={a.id} size="sm" variant={action === a.id ? "default" : "outline"} onClick={() => setAction(a.id)}>
            {a.label}
          </Button>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{ACTIONS.find((a) => a.id === action)?.hint}</p>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="max-h-[28rem] space-y-3 overflow-y-auto">
          {(msgs.data ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "ml-auto bg-secondary" : "bg-accent text-accent-foreground"}`}
            >
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          ))}
          {run.isPending ? (
            <p className="text-sm text-muted-foreground">Writing…</p>
          ) : null}
          {!msgs.data?.length && !run.isPending ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <Sparkles className="size-5" />
              <p className="text-sm">Paste a note, a brief, or a question.</p>
            </div>
          ) : null}
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Write or paste here"
          rows={5}
        />
        <div className="flex justify-end">
          <Button disabled={!prompt.trim() || run.isPending} onClick={() => run.mutate()}>
            Run
          </Button>
        </div>
      </div>
    </div>
  );
}
