/**
 * Collapsible enrichment content display with markdown rendering
 */

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  return (
    <div className="rounded-3xl border-2 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
          <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
