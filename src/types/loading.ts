import { z } from 'zod'

/**
 * Loading state discriminated union schema
 * Ensures type-safe state transitions with validation
 */
export const LoadingStateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('idle'),
  }),
  z.object({
    type: z.literal('loading'),
    startTime: z.number().optional(),
  }),
  z.object({
    type: z.literal('success'),
    data: z.unknown().optional(),
    duration: z.number().optional(),
  }),
  z.object({
    type: z.literal('error'),
    error: z.string(),
    duration: z.number().optional(),
  }),
])

export type LoadingState = z.infer<typeof LoadingStateSchema>

/**
 * Helper type guards for loading states
 */
export const isIdle = (
  state: LoadingState,
): state is Extract<LoadingState, { type: 'idle' }> => {
  return state.type === 'idle'
}

export const isLoading = (
  state: LoadingState,
): state is Extract<LoadingState, { type: 'loading' }> => {
  return state.type === 'loading'
}

export const isSuccess = (
  state: LoadingState,
): state is Extract<LoadingState, { type: 'success' }> => {
  return state.type === 'success'
}

export const isError = (
  state: LoadingState,
): state is Extract<LoadingState, { type: 'error' }> => {
  return state.type === 'error'
}

/**
 * Color variants for loading indicators
 */
export const LoadingVariantSchema = z.enum([
  'pink',
  'blue',
  'purple',
  'peach',
  'mint',
])
export type LoadingVariant = z.infer<typeof LoadingVariantSchema>

/**
 * Size variants for loading indicators
 */
export const LoadingSizeSchema = z.enum(['sm', 'md', 'lg'])
export type LoadingSize = z.infer<typeof LoadingSizeSchema>

/**
 * Props for LoadingDots component
 */
export interface LoadingDotsProps {
  dotCount?: number
  variant?: LoadingVariant
  size?: LoadingSize
  className?: string
  'aria-label'?: string
}
