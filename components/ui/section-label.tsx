// The one section-heading treatment: micro label + tabular count.
export function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-micro text-ink-3">{label}</span>
      {typeof count === 'number' && (
        <span className="text-meta text-ink-4 tabular-nums">{count}</span>
      )}
    </div>
  )
}
