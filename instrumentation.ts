import { SeverityNumber } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

let posthogLogProvider: LoggerProvider | null = null

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!projectToken || !host) {
    if (process.env.NODE_ENV === 'development') {
      const missingVariable = !projectToken
        ? 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
        : 'NEXT_PUBLIC_POSTHOG_HOST'

      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      )
    }
    return
  }

  posthogLogProvider = new LoggerProvider({
    resource: new Resource({ 'service.name': 'hitmans-library' }),
  })
  posthogLogProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${host.replace(/\/$/, '')}/i/v1/logs`,
        headers: {
          Authorization: `Bearer ${projectToken}`,
          'Content-Type': 'application/json',
        },
      }),
    ),
  )
}

export function logPostHogInfo(body: string, attributes: Record<string, string | number | boolean>) {
  posthogLogProvider?.getLogger('posthog-exporter').emit({
    body,
    severityNumber: SeverityNumber.INFO,
    attributes,
  })
}

export async function flushPostHogLogs() {
  await posthogLogProvider?.forceFlush()
}
