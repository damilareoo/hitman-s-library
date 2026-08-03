export function getStatusColor(status: string, selected?: boolean): string {
  const selectedRing = selected ? 'ring-2 ring-foreground/40 ' : ''

  switch (status) {
    case 'running':
      return selectedRing + 'border-blue-500/60 bg-blue-500/5'
    case 'completed':
      return selectedRing + 'border-green-500/60 bg-green-500/5'
    case 'error':
      return selectedRing + 'border-red-500/60 bg-red-500/5'
    default:
      return selectedRing + (selected ? 'border-foreground/40' : 'border-border')
  }
}
