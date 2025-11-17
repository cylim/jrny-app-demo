/**
 * Client-side enrichment trigger component
 * Triggers city enrichment once on mount if needed
 */

import * as Sentry from '@sentry/tanstackstart-react'
import { useAction } from 'convex/react'
import { useEffect, useRef } from 'react'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'

interface EnrichmentTriggerProps {
  cityId: Id<'cities'>
  cityName: string
  cityCountry: string
  needsEnrichment: boolean
  enrichmentReason:
    | 'never_enriched'
    | 'stale_data'
    | 'in_progress'
    | 'up_to_date'
    | 'cooldown'
}

/**
 * Triggers enrichment action once on mount if city needs enrichment
 * Uses a ref to ensure the action only fires once per component lifecycle
 */
export function EnrichmentTrigger({
  cityId,
  cityName,
  cityCountry,
  needsEnrichment,
  enrichmentReason,
}: EnrichmentTriggerProps) {
  const enrichCity = useAction(api.enrichmentActions.enrichCity)
  const hasTriggered = useRef(false)

  useEffect(() => {
    // Only trigger if:
    // 1. Enrichment is needed
    // 2. Haven't already triggered in this component lifecycle
    // 3. Not already in progress or on cooldown
    if (
      needsEnrichment &&
      !hasTriggered.current &&
      enrichmentReason !== 'in_progress' &&
      enrichmentReason !== 'cooldown'
    ) {
      hasTriggered.current = true

      // Fire and forget - don't await
      enrichCity({ cityId })
        .then(() => {
          console.log(
            `[Enrichment] Successfully triggered for ${cityName}, ${cityCountry}`,
          )
        })
        .catch((error) => {
          console.error(
            `[Enrichment] Failed for ${cityName}, ${cityCountry}:`,
            error,
          )

          // Capture enrichment errors in Sentry with context
          Sentry.captureException(error, {
            tags: {
              feature: 'city-enrichment',
              cityId,
              cityName,
              enrichmentReason,
            },
            contexts: {
              enrichment: {
                cityId,
                cityName,
                cityCountry,
                enrichmentReason,
                needsEnrichment,
              },
            },
          })
        })
    }
  }, [
    cityId,
    cityName,
    cityCountry,
    needsEnrichment,
    enrichmentReason,
    enrichCity,
  ])

  // This component doesn't render anything
  return null
}
