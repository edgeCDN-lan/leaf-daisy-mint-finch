import { createContext, useContext } from "react";
import type { getBootstrap } from "@/lib/nimbus/bootstrap.server";

export type Bootstrap = Awaited<ReturnType<typeof getBootstrap>>;

const Ctx = createContext<Bootstrap | null>(null);

export const WorkspaceProvider = Ctx.Provider;

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("Workspace is not ready");
  return v;
}
