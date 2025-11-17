/**
 * T050-T055: Enrichment status message component
 * Displays messages when enrichment is in progress or needed
 */

interface EnrichmentStatusProps {
  enrichmentStatus: {
    needsEnrichment: boolean
    reason:
      | 'never_enriched'
      | 'stale_data'
      | 'in_progress'
      | 'up_to_date'
      | 'cooldown'
  } | null
}

export function EnrichmentStatus({ enrichmentStatus }: EnrichmentStatusProps) {
  // T052: Only show messages for certain states
  if (!enrichmentStatus) {
    return null
  }

  // Don't show message for up_to_date or cooldown
  if (
    enrichmentStatus.reason === 'up_to_date' ||
    enrichmentStatus.reason === 'cooldown'
  ) {
    return null
  }

  // T054: Stale/never/progress enriched message
  return (
    <div className="mb-6 rounded-3xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            Enriching City Information...
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
            We're fetching detailed information about this city.
          </p>
        </div>
      </div>
    </div>
  )
}
