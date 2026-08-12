'use client'

import { motion, AnimatePresence } from 'motion/react'
import { X } from '@phosphor-icons/react'
import { EASE, DUR } from '@/lib/motion'

export interface AppliedFilter {
  /** Stable identity across renders, e.g. "category:Finance" */
  key: string
  /** What the chip reads as */
  label: string
  /** Quiet prefix that says which axis this came from */
  kind: 'category' | 'tag' | 'search'
  onRemove: () => void
}

const KIND_LABEL: Record<AppliedFilter['kind'], string> = {
  category: 'in',
  tag: 'tagged',
  search: 'matching',
}

interface FilterBarProps {
  filters: AppliedFilter[]
  total: number
  isLoading: boolean
  onClearAll: () => void
}

/**
 * Summary of everything currently narrowing the grid. Applied state used to be
 * split between the sidebar, the header count and a tags list, so there was no
 * single place that answered "why am I seeing these?".
 */
export function FilterBar({ filters, total, isLoading, onClearAll }: FilterBarProps) {
  const active = filters.length > 0

  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: DUR.move, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-4 mb-4 border-b border-edge-faint">
            <span className="text-meta text-ink-3 tabular-nums shrink-0 mr-1">
              {isLoading ? '—' : total} {total === 1 ? 'site' : 'sites'}
            </span>

            <AnimatePresence mode="popLayout" initial={false}>
              {filters.map(f => (
                <motion.button
                  key={f.key}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: DUR.color, ease: EASE }}
                  onClick={f.onRemove}
                  aria-label={`Remove filter ${f.label}`}
                  className="group inline-flex items-center gap-1.5 h-[22px] pl-2 pr-1.5 rounded-[4px] border border-edge-strong bg-muted/60 hover:bg-muted hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
                >
                  <span className="text-micro text-ink-4 shrink-0">{KIND_LABEL[f.kind]}</span>
                  <span className="text-meta text-ink max-w-[16ch] truncate">{f.label}</span>
                  <X
                    className="w-2.5 h-2.5 text-ink-4 group-hover:text-ink transition-colors shrink-0"
                    weight="bold"
                  />
                </motion.button>
              ))}
            </AnimatePresence>

            {filters.length > 1 && (
              <button
                onClick={onClearAll}
                className="ml-auto text-meta text-ink-4 hover:text-ink underline underline-offset-2 decoration-edge-strong transition-colors shrink-0"
              >
                Clear all
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
