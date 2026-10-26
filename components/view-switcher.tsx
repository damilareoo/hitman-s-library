'use client'

const VIEWS = [
  { value: 'grid', label: 'Grid' },
  { value: 'index', label: 'Index' },
] as const

export type LibraryView = (typeof VIEWS)[number]['value']

/**
 * One track, one thumb. The cells are equal halves rather than measured text,
 * so Grid and Index keep the same width whether the labels change or the font
 * finishes loading — nothing to observe, nothing to shift.
 */
export function ViewSwitcher({
  view,
  onChange,
  className = '',
}: {
  view: LibraryView
  onChange: (view: LibraryView) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Switch view"
      className={[
        'relative inline-grid grid-cols-2 shrink-0 w-[108px] h-8 p-[3px] rounded-[9px]',
        'bg-foreground/[0.05] dark:bg-foreground/[0.07]',
        className,
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute top-[3px] left-[3px] h-[26px] w-[calc(50%-3px)] rounded-[6px] bg-card pointer-events-none',
          'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]',
          'dark:bg-[color-mix(in_srgb,var(--foreground)_12%,var(--background))] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
          'transition-transform duration-[var(--dur-3)] ease-[var(--ease-sig)] motion-reduce:transition-none',
        ].join(' ')}
        style={{ transform: view === 'index' ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {VIEWS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={view === value}
          className={[
            'relative z-[1] h-[26px] rounded-[6px] text-[12px] font-medium leading-none',
            'transition-colors duration-[var(--dur-2)] ease-[var(--ease-sig)]',
            view === value ? 'text-ink' : 'text-ink-3 hover:text-ink',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
