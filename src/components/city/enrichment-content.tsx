/**
 * Collapsible enrichment content display
 * Renders plain text content from Firecrawl JSON extraction
 */

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface EnrichmentContentProps {
  title: string
  content: string
  defaultExpanded?: boolean
}

export function EnrichmentContent({
  title,
  content,
  defaultExpanded = false,
}: EnrichmentContentProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Split content into paragraphs for better readability
  const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0)

  return (
    <div className="rounded-3xl border-2 border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        type="button"
      >
        <h2 className="text-2xl font-semibold">{title}</h2>
        {isExpanded ? (
          <ChevronUp className="h-6 w-6 text-zinc-500" />
        ) : (
          <ChevronDown className="h-6 w-6 text-zinc-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t-2 border-zinc-200 px-6 pb-6 pt-4 dark:border-zinc-800">
          <div className="space-y-4 text-zinc-700 dark:text-zinc-300">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.substring(0, 20)} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
