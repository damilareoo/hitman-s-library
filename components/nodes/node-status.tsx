import { CircleNotch, CheckCircle, XCircle } from "@phosphor-icons/react"

type Status = 'idle' | 'running' | 'completed' | 'error'

export function NodeStatus({ status }: { status: Status }) {
  if (status === 'running') return <CircleNotch className="h-3 w-3 animate-spin text-[var(--color-running)]" weight="regular" />
  if (status === 'completed') return <CheckCircle className="h-3 w-3 text-[var(--color-success)]" weight="regular" />
  if (status === 'error') return <XCircle className="h-3 w-3 text-[var(--color-error)]" weight="regular" />
  return null
}
