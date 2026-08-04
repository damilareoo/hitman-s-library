// The one spinner. Palette can be overridden via className (e.g. presentation mode).
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`w-4 h-4 rounded-full border border-edge border-t-ink-3 animate-spin ${className}`}
    />
  )
}
