export function getStatusColor(
  status: "idle" | "running" | "completed" | "error" | undefined,
  selected: boolean,
): string {
  switch (status) {
    case "running":
      return "border-foreground/30"
    case "completed":
      return "border-foreground/20"
    case "error":
      return "border-destructive/50"
    default:
      return selected ? "border-foreground/40" : "border-border"
  }
}

export function getNodeStateClasses(status: "idle" | "running" | "completed" | "error" | undefined): string {
  switch (status) {
    case "running":
      return "border-foreground/30 shadow-sm"
    case "completed":
      return "border-foreground/20"
    case "error":
      return "border-destructive/50"
    default:
      return "border-border"
  }
}
