'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'avatar' | 'list' | 'table'
  count?: number
  className?: string
}

/**
 * LoadingSkeletons - Provides animated placeholder content during data loading
 * Uses CSS animation for smooth skeleton loading effect
 * Respects prefers-reduced-motion for accessibility
 */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border p-4 space-y-3 animate-pulse',
        className
      )}
    >
      <div className='h-32 bg-muted rounded-lg animate-skeleton' />
      <div className='space-y-2'>
        <div className='h-4 bg-muted rounded animate-skeleton w-3/4' />
        <div className='h-4 bg-muted rounded animate-skeleton w-1/2' />
      </div>
      <div className='flex gap-2 pt-2'>
        <div className='h-8 bg-muted rounded animate-skeleton w-1/3' />
        <div className='h-8 bg-muted rounded animate-skeleton w-1/3' />
      </div>
    </div>
  )
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className='h-4 bg-muted rounded animate-skeleton'
          style={{
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-12 h-12 rounded-full bg-muted animate-skeleton',
        className
      )}
    />
  )
}

export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border border-border/40',
        className
      )}
    >
      <SkeletonAvatar />
      <div className='flex-1 space-y-2'>
        <div className='h-4 bg-muted rounded animate-skeleton w-1/2' />
        <div className='h-3 bg-muted rounded animate-skeleton w-3/4' />
      </div>
    </div>
  )
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className='flex gap-3 p-3 border-b border-border/40'>
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className='flex-1 h-4 bg-muted rounded animate-skeleton'
        />
      ))}
    </div>
  )
}

export function LoadingSkeleton({
  type = 'card',
  count = 3,
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count })

  switch (type) {
    case 'card':
      return (
        <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
          {items.map((_, i) => (
            <SkeletonCard key={i} className='stagger-item' />
          ))}
        </div>
      )

    case 'text':
      return <SkeletonText lines={count} className={className} />

    case 'avatar':
      return (
        <div className={cn('flex gap-3', className)}>
          {items.map((_, i) => (
            <SkeletonAvatar key={i} />
          ))}
        </div>
      )

    case 'list':
      return (
        <div className={cn('space-y-2', className)}>
          {items.map((_, i) => (
            <SkeletonListItem key={i} className='stagger-item' />
          ))}
        </div>
      )

    case 'table':
      return (
        <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
          <SkeletonTableRow columns={5} />
          {items.map((_, i) => (
            <SkeletonTableRow key={i} columns={5} />
          ))}
        </div>
      )

    default:
      return null
  }
}

export default LoadingSkeleton
