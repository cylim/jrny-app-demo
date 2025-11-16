import type { Id } from '~@/convex/_generated/dataModel'

export interface User {
  _id: Id<'users'>
  _creationTime: number
  authUserId: string
  name: string
  email: string
  image?: string
  username?: string
  bio?: string
  settings?: {
    // New unified privacy settings
    hideProfileVisits?: boolean // Hide visit history from profile page (Free + Pro)
    hideProfileEvents?: boolean // Hide event participation from profile page (Free + Pro)
    globalVisitPrivacy?: boolean // Hide all visits from discovery (Pro only)
    // Legacy fields for backward compatibility
    globalPrivacy: boolean // DEPRECATED: Use globalVisitPrivacy
    hideVisitHistory: boolean // DEPRECATED: Use hideProfileVisits
  }
  socialLinks?: {
    github?: string
    x?: string // formerly twitter
    linkedin?: string
    telegram?: string
  }
  subscription?: {
    tier: 'free' | 'pro'
    status: 'active' | 'pending_cancellation' | 'cancelled'
    nextBillingDate?: number
    periodEndDate?: number
    autumnCustomerId?: string
    lastSyncedAt?: number
  }
  isSeed?: boolean // true for faker-generated test users
  updatedAt: number
  lastSeen: number
}
