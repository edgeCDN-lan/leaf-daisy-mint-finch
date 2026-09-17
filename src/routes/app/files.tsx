import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteFile, listFiles, uploadFile } from "@/lib/nimbus/files.server";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { useWorkspace } from "@/components/layout/workspace-context";
import { Progress } from "@/components/ui/progress";
import { usagePercent } from "@/lib/nimbus/limits";

export const Route = createFileRoute("/app/files")({ component: FilesPage });

function FilesPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["files"], queryFn: () => listFiles() });
  const [folder, setFolder] = useState("All files");
  const upload = useMutation({
    mutationFn: (input: { name: string; mime: string; data_url: string; size_bytes: number; folder: string }) =>
      uploadFile({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFile({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      upload.mutate({
        name: file.name,
        mime: file.type || "application/octet-stream",
        data_url: String(reader.result),
        size_bytes: file.size,
        folder,
      });
    };
    reader.readAsDataURL(file);
  }

  const folders = Array.from(new Set(["All files", ...(q.data ?? []).map((f) => f.folder)]));
  const visible = (q.data ?? []).filter((f) => folder === "All files" || f.folder === folder);

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Files"
        description="Keep briefs, contracts, and exports next to the work."
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} className="sm:max-w-48" />
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Upload
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <div className="sm:ml-auto sm:w-56">
          <p className="text-xs text-muted-foreground">
            {formatBytes(ws.usage.storageBytes)} used
          </p>
          <Progress className="mt-2" value={usagePercent(ws.usage.storageBytes, ws.limits.maxStorageBytes)} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {folders.map((f) => (
          <Button key={f} size="sm" variant={folder === f ? "secondary" : "ghost"} onClick={() => setFolder(f)}>
            {f}
          </Button>
        ))}
      </div>
      {visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <article key={f.id} className="rounded-2xl border border-border bg-card p-4">
              {f.mime.startsWith("image/") && f.data_url ? (
                <img src={f.data_url} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-3 flex h-36 items-center justify-center rounded-xl bg-secondary">
                  <Paperclip className="size-6 text-muted-foreground" />
                </div>
              )}
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(f.size_bytes)} · {f.folder}
              </p>
              <div className="mt-3 flex gap-2">
                {f.data_url ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={f.data_url} download={f.name}>
                      Download
                    </a>
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(f.id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Paperclip className="size-5" />}
          title="No files in this folder"
          description="Upload a brief, a contract, or a reference. 2 MB per file in this preview."
        />
      )}
    </div>
  );
}
