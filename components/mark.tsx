/**
 * The Hitman's Library mark.
 *
 * Books stood on a shelf — which is what the library is, and also what it
 * holds: a full-page capture is a tall narrow thing, and a row of them stood
 * on their ends is a shelf of spines. The last book has fallen against its
 * neighbour because the shelf is not full, which is the detail that stops the
 * mark reading as a bar chart.
 *
 * Widths vary because books do; none is thinner than 5 units, so nothing
 * disappears when the mark is drawn at 22px.
 */

const BASE = 50
const LEAN = 11

const BOOKS = [
  { x: 13, w: 6, top: 15 },
  { x: 21, w: 5, top: 10 },
  { x: 28, w: 8, top: 19 },
  { x: 38, w: 6, top: 14 },
]

const SHELF = { x: 8, w: 48, y: BASE + 1.5, h: 2 }

interface MarkProps {
  /** Books arrive onto the shelf, hold, and clear. For waits, not for chrome. */
  animated?: boolean
  className?: string
  title?: string
}

export function Mark({ animated = false, className = '', title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* The shelf does not animate. It is the thing the books arrive onto. */}
      <rect
        x={SHELF.x} y={SHELF.y} width={SHELF.w} height={SHELF.h}
        rx={1} fill="currentColor"
      />

      {BOOKS.map((book, i) => {
        const isLast = i === BOOKS.length - 1
        const rect = (
          <rect
            key={book.x}
            x={book.x}
            y={book.top}
            width={book.w}
            height={BASE - book.top}
            rx={1.2}
            fill="currentColor"
            className={animated ? 'shelve' : undefined}
            style={animated ? {
              // Each book grows out of its own footing, not the group's centre.
              transformOrigin: `${book.x + book.w / 2}px ${BASE}px`,
              animationDelay: `${(i * 0.07).toFixed(2)}s`,
            } : undefined}
          />
        )

        // The lean wraps the animation rather than joining it, so the book
        // grows straight up and is tilted as a whole — tilting a scaling rect
        // makes it sweep like a wiper.
        return isLast
          ? <g key={book.x} transform={`rotate(${LEAN} ${book.x + book.w} ${BASE})`}>{rect}</g>
          : rect
      })}
    </svg>
  )
}

/** A full-page wait. Nothing but the mark, shelving itself. */
export function LoadingMark({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
      <Mark animated className="w-16 h-16 text-ink-2" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
