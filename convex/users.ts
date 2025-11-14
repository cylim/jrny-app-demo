import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

/**
 * Sync user data from Better-Auth to our users table
 * This should be called after successful Google OAuth sign-in
 */
export const syncUser = mutation({
  args: {},
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx) => {
    // Get the authenticated user from Better-Auth
    const authUser = await authComponent.getAuthUser(ctx)

    if (!authUser) {
      return null
    }

    // Use _id as the auth user identifier
    const authUserId = authUser._id

    // Check if user already exists in our users table
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUserId))
      .unique()

    const now = Date.now()

    if (existingUser) {
      // Update existing user with latest info from auth provider and lastSeen
      await ctx.db.patch(existingUser._id, {
        name: authUser.name,
        email: authUser.email,
        image: authUser.image ?? undefined,
        updatedAt: now,
        lastSeen: now,
      })
      return existingUser._id
    }

    // Create new user record
    const userId = await ctx.db.insert('users', {
      authUserId,
      name: authUser.name,
      email: authUser.email,
      image: authUser.image ?? undefined,
      createdAt: now,
      updatedAt: now,
      lastSeen: now,
    })

    return userId
  },
})

/**
 * Get the current user's profile
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      lastSeen: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx)

    if (!authUser) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    return user
  },
})

/**
 * Get a user by their auth user ID
 */
export const getUserByAuthId = query({
  args: { authUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      lastSeen: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { authUserId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUserId))
      .unique()

    return user
  },
})

/**
 * Get a user by their username
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      lastSeen: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique()

    return user
  },
})

/**
 * Check if a username is available
 */
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { username }) => {
    // Username validation
    if (!username || username.length < 3 || username.length > 20) {
      return false
    }

    // Username should only contain alphanumeric characters, underscores, and hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      return false
    }

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique()

    return existingUser === null
  },
})

/**
 * Set or update the current user's username
 */
export const setUsername = mutation({
  args: { username: v.string() },
  returns: v.union(
    v.object({ success: v.boolean(), error: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, { username }) => {
    const authUser = await authComponent.getAuthUser(ctx)

    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
      return {
        success: false,
        error: 'Username must be between 3 and 20 characters',
      }
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      return {
        success: false,
        error:
          'Username can only contain letters, numbers, underscores, and hyphens',
      }
    }

    // Check if username is already taken
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique()

    if (existingUser && existingUser.authUserId !== authUser._id) {
      return { success: false, error: 'Username is already taken' }
    }

    // Get current user
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Update username
    await ctx.db.patch(currentUser._id, {
      username,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
