"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WarningCircle, ArrowsClockwise } from "@phosphor-icons/react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
      <div className="flex items-center gap-2 text-destructive">
        <WarningCircle className="h-5 w-5" weight="regular"  />
        <h2 className="text-lg font-medium">Something went wrong</h2>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        An error occurred while loading the application. Please try again.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>}
      <Button onClick={reset} variant="outline" size="sm">
        <ArrowsClockwise className="mr-2 h-4 w-4" weight="regular"  />
        Try again
      </Button>
    </div>
  )
}
