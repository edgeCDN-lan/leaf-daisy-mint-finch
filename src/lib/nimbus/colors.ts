export const PROJECT_COLORS = [
  { id: "lagoon", label: "Lagoon", swatch: "bg-primary" },
  { id: "ink", label: "Ink", swatch: "bg-foreground" },
  { id: "moss", label: "Moss", swatch: "bg-success" },
  { id: "clay", label: "Clay", swatch: "bg-warning" },
  { id: "ember", label: "Ember", swatch: "bg-destructive" },
  { id: "mist", label: "Mist", swatch: "bg-muted-foreground" },
] as const;

export function colorClass(id: string) {
  return PROJECT_COLORS.find((c) => c.id === id)?.swatch ?? "bg-primary";
}
