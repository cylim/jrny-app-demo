/**
 * Autumn SDK Type Definitions
 *
 * Extends the official @useautumn/autumn-js types with missing fields
 * based on actual Autumn API responses.
 */

import type { Customer } from 'autumn-js'

/**
 * Stripe Subscription object returned in Autumn customer data
 */
export interface AutumnSubscription {
  id: string
  product_id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  current_period_start: number // Unix timestamp in seconds
  current_period_end: number // Unix timestamp in seconds
  cancel_at?: number // Unix timestamp in seconds
  canceled_at?: number // Unix timestamp in seconds
  trial_end?: number // Unix timestamp in seconds
}

/**
 * Extended Customer data with subscriptions array
 * The Autumn SDK's Customer type doesn't include subscriptions, but the API returns them
 */
export interface AutumnCustomerData extends Customer {
  subscriptions?: AutumnSubscription[]
}

/**
 * Checkout session response from autumn.checkout()
 */
export interface AutumnCheckoutData {
  url: string
  session_id?: string
  id?: string
}

/**
 * Cancel subscription result
 */
export interface AutumnCancelResult {
  success?: boolean
  error?: {
    message: string
    code?: string
  }
}

/**
 * Type guard to check if customer data has subscriptions array
 */
export function hasSubscriptions(
  customer: Customer | null,
): customer is AutumnCustomerData {
  return (
    customer !== null &&
    'subscriptions' in customer &&
    Array.isArray((customer as AutumnCustomerData).subscriptions)
  )
}

/**
 * Check if customer has access to a specific feature
 * Based on Autumn's customer.features structure
 * Uses the Autumn SDK's built-in CustomerFeature type
 */
export function hasFeatureAccess(
  customer: Customer | null,
  featureId: string,
): boolean {
  if (!customer || !customer.features) return false

  const feature = customer.features[featureId]

  if (!feature) {
    // Feature not found in customer's plan
    return false
  }

  // For static features (boolean flags), they're always available if present
  if (feature.type === 'static') {
    return true
  }

  // For usage-based features (single_use or continuous_use)
  // Check if they have any allowance or unlimited access
  return feature.unlimited || (feature.included_usage || 0) > 0
}

/**
 * Safely extract checkout session ID from checkout data
 */
export function getCheckoutSessionId(data: {
  url: string
  [key: string]: unknown
}): string {
  const checkoutData = data as AutumnCheckoutData
  return checkoutData.session_id || checkoutData.id || 'unknown'
}

/**
 * Type for Autumn's cancel function
 * The Autumn SDK exports cancel as a RegisteredAction, but it's callable as a regular function
 */
export type AutumnCancelFunction = (
  ctx: { db: unknown; auth: unknown },
  args: { productId: string },
) => Promise<AutumnCancelResult>

/**
 * Safely call Autumn's cancel function with proper typing
 * This wrapper handles the type assertion in one place
 */
export async function callAutumnCancel(
  cancelFn: unknown,
  ctx: { db: unknown; auth: unknown },
  args: { productId: string },
): Promise<AutumnCancelResult> {
  const typedCancel = cancelFn as AutumnCancelFunction
  const result = await typedCancel(ctx, args)
  return result
}
