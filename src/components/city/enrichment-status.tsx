/**
 * T050-T055: Enrichment status message component
 * Displays messages when enrichment is in progress or needed
 */

interface EnrichmentStatusProps {
  enrichmentStatus: {
    needsEnrichment: boolean
    reason: 'never_enriched' | 'stale_data' | 'in_progress' | 'up_to_date'
  } | null
}

export function EnrichmentStatus({ enrichmentStatus }: EnrichmentStatusProps) {
  // T052: Only show if enrichment is needed
  if (!enrichmentStatus || !enrichmentStatus.needsEnrichment) {
    return null
  }

  // T053: In-progress message with blue background
  if (enrichmentStatus.reason === 'in_progress') {
    return (
      <div className="mb-6 rounded-3xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Enriching City Information...
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
              We're fetching additional details about this city from Wikipedia.{' '}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // T054: Stale/never enriched message
  return (
    <div className="mb-6 rounded-3xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            {enrichmentStatus.reason === 'never_enriched'
              ? 'Enriching City Information...'
              : 'Updating City Information...'}
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
            We're{' '}
            {enrichmentStatus.reason === 'stale_data' ? 'updating' : 'fetching'}{' '}
            detailed information about this city.
          </p>
        </div>
      </div>
    </div>
  )
}
