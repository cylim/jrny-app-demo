/**
 * Autumn Provider Wrapper
 *
 * Enables Autumn frontend hooks and components by wrapping the app with AutumnProvider.
 * Connects to Convex backend for subscription management.
 */

'use client'

import { AutumnProvider as AutumnProviderBase } from 'autumn-js/react'
import { useConvex } from 'convex/react'
import type { ReactNode } from 'react'
import { api } from '~@/convex/_generated/api'

interface AutumnProviderProps {
  children: ReactNode
}

export function AutumnProvider({ children }: AutumnProviderProps) {
  const convex = useConvex()

  return (
    <AutumnProviderBase
      convex={convex}
      // biome-ignore lint/suspicious/noExplicitAny: Autumn SDK types require any for convexApi
      convexApi={(api as any).autumn}
    >
      {children}
    </AutumnProviderBase>
  )
}
