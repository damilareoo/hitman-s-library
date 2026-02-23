import { Download, Upload, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface BackupUtilityProps {
  onImportComplete?: () => void
}

export function BackupUtility({ onImportComplete }: BackupUtilityProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/design/backup-restore')
      const data = await response.json()

      if (data.success && data.designs) {
        // Create backup file
        const backupData = {
          version: data.version,
          exported_at: data.exported_at,
          total_designs: data.total,
          designs: data.designs,
          backup_info: data.backup_info
        }

        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `design-library-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        console.log('[v0] Exported', data.total, 'designs')
        alert(`✓ Exported ${data.total} design links to backup file`)
      } else {
        alert('Failed to export designs')
      }
    } catch (error) {
      console.error('[v0] Export error:', error)
      alert('Error exporting backup')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const backupData = JSON.parse(text)

      if (!Array.isArray(backupData.designs)) {
        alert('Invalid backup file format')
        return
      }

      const response = await fetch('/api/design/backup-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designs: backupData.designs,
          merge: true
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('[v0] Imported', result.imported, 'designs')
        alert(`✓ Restored ${result.imported} design links from backup`)
        onImportComplete?.()
      } else {
        alert(`Failed to import: ${result.error}`)
      }
    } catch (error) {
      console.error('[v0] Import error:', error)
      alert('Error importing backup file')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-foreground">
        Backup & Restore
      </h3>
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 gap-2 h-9 font-mono text-xs"
          variant="outline"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
        <label className="flex-1">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
            aria-label="Import backup file"
          />
          <Button
            onClick={(e) => {
              if (!isImporting) {
                e.currentTarget.parentElement?.querySelector('input')?.click()
              }
            }}
            disabled={isImporting}
            className="w-full gap-2 h-9 font-mono text-xs"
            variant="outline"
            asChild
          >
            <div>
              <Upload className="w-4 h-4" aria-hidden="true" />
              {isImporting ? 'Importing...' : 'Restore'}
            </div>
          </Button>
        </label>
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        Backup and restore your entire design library
      </p>
    </div>
  )
}
