/**
 * Combined tourism section with overview and collapsible subsections
 * Displays landmarks, museums, and attractions in an organized layout
 */

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface TourismItem {
  name: string
  description: string
}

interface TourismData {
  overview?: string
  landmarks?: TourismItem[]
  museums?: TourismItem[]
  attractions?: TourismItem[]
}

interface TourismCombinedSectionProps {
  tourism: TourismData
}

interface CollapsibleSubsectionProps {
  title: string
  items: TourismItem[]
  defaultExpanded?: boolean
}

function CollapsibleSubsection({
  title,
  items,
  defaultExpanded = false,
}: CollapsibleSubsectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="border-t-2 border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        type="button"
      >
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-zinc-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.name} className="text-zinc-700 dark:text-zinc-300">
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </strong>
                : {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function TourismCombinedSection({
  tourism,
}: TourismCombinedSectionProps) {
  // Don't render if there's no tourism data at all
  const hasContent =
    tourism.overview ||
    (tourism.landmarks && tourism.landmarks.length > 0) ||
    (tourism.museums && tourism.museums.length > 0) ||
    (tourism.attractions && tourism.attractions.length > 0)

  if (!hasContent) {
    return null
  }

  return (
    <div className="rounded-3xl border-2 border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="p-6">
        <h2 className="mb-4 text-2xl font-semibold">Tourism</h2>

        {/* Overview section */}
        {tourism.overview && (
          <div className="mb-4 text-zinc-700 dark:text-zinc-300">
            <p className="leading-relaxed">{tourism.overview}</p>
          </div>
        )}
      </div>

      {/* Collapsible subsections */}
      <CollapsibleSubsection
        title="Landmarks"
        items={tourism.landmarks || []}
        defaultExpanded={true}
      />
      <CollapsibleSubsection
        title="Museums & Galleries"
        items={tourism.museums || []}
        defaultExpanded={false}
      />
      <CollapsibleSubsection
        title="Attractions"
        items={tourism.attractions || []}
        defaultExpanded={false}
      />
    </div>
  )
}
