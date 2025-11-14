import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  users: defineTable({
    // Better-Auth user ID (from the auth system)
    authUserId: v.string(),
    // User profile information from Google OAuth
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    // Username for profile URLs (e.g., u/:username)
    username: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeen: v.number(),
  })
    .index('by_auth_user_id', ['authUserId'])
    .index('by_username', ['username']),
})
