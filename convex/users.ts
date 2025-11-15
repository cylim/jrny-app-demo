import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
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
      _creationTime: v.number(),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      settings: v.optional(
        v.object({
          globalPrivacy: v.boolean(),
          hideVisitHistory: v.boolean(),
        }),
      ),
      socialLinks: v.optional(
        v.object({
          github: v.optional(v.string()),
          x: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          telegram: v.optional(v.string()),
        }),
      ),
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
      _creationTime: v.number(),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      settings: v.optional(
        v.object({
          globalPrivacy: v.boolean(),
          hideVisitHistory: v.boolean(),
        }),
      ),
      socialLinks: v.optional(
        v.object({
          github: v.optional(v.string()),
          x: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          telegram: v.optional(v.string()),
        }),
      ),
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
      _creationTime: v.number(),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      settings: v.optional(
        v.object({
          globalPrivacy: v.boolean(),
          hideVisitHistory: v.boolean(),
        }),
      ),
      socialLinks: v.optional(
        v.object({
          github: v.optional(v.string()),
          x: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          telegram: v.optional(v.string()),
        }),
      ),
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

/**
 * Get a user by username or ID
 * Tries username lookup first, then falls back to ID
 */
export const getUserByUsernameOrId = query({
  args: { usernameOrId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      authUserId: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      settings: v.optional(
        v.object({
          globalPrivacy: v.boolean(),
          hideVisitHistory: v.boolean(),
        }),
      ),
      socialLinks: v.optional(
        v.object({
          github: v.optional(v.string()),
          x: v.optional(v.string()),
          linkedin: v.optional(v.string()),
          telegram: v.optional(v.string()),
        }),
      ),
      updatedAt: v.number(),
      lastSeen: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { usernameOrId }) => {
    // Try username lookup first
    const userByUsername = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', usernameOrId))
      .unique()

    if (userByUsername) {
      return userByUsername
    }

    // Fall back to ID lookup
    try {
      const user = await ctx.db.get(usernameOrId as Id<'users'>)
      if (user && 'authUserId' in user) {
        // It's a valid user ID
        return user
      }
    } catch {
      // Not a valid ID either
    }

    return null
  },
})

/**
 * Update user profile settings (name, username, bio)
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.boolean(), error: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, { name, username, bio }) => {
    const authUser = await authComponent.getAuthUser(ctx)

    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get current user
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Validate username if provided
    if (username !== undefined) {
      if (username && (username.length < 3 || username.length > 20)) {
        return {
          success: false,
          error: 'Username must be between 3 and 20 characters',
        }
      }

      if (username) {
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

        if (existingUser && existingUser._id !== currentUser._id) {
          return { success: false, error: 'Username is already taken' }
        }
      }
    }

    // Validate bio length
    if (bio !== undefined && bio && bio.length > 500) {
      return {
        success: false,
        error: 'Bio must be 500 characters or less',
      }
    }

    // Update profile
    const updateData: Partial<Doc<'users'>> = {
      updatedAt: Date.now(),
    }

    if (name !== undefined) updateData.name = name
    if (username !== undefined) updateData.username = username || undefined
    if (bio !== undefined) updateData.bio = bio || undefined

    await ctx.db.patch(currentUser._id, updateData)

    return { success: true }
  },
})

/**
 * Update user privacy settings
 */
export const updatePrivacySettings = mutation({
  args: {
    globalPrivacy: v.optional(v.boolean()),
    hideVisitHistory: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({ success: v.boolean(), error: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, { globalPrivacy, hideVisitHistory }) => {
    const authUser = await authComponent.getAuthUser(ctx)

    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Get existing settings or create with defaults
    const typedUser = currentUser as Doc<'users'> & {
      settings?: { globalPrivacy: boolean; hideVisitHistory: boolean }
    }
    const currentSettings = typedUser.settings || {
      globalPrivacy: false,
      hideVisitHistory: false,
    }

    // Build new settings object
    const newSettings: { globalPrivacy: boolean; hideVisitHistory: boolean } = {
      ...currentSettings,
    }

    if (globalPrivacy !== undefined) newSettings.globalPrivacy = globalPrivacy
    if (hideVisitHistory !== undefined)
      newSettings.hideVisitHistory = hideVisitHistory

    await ctx.db.patch(currentUser._id, {
      settings: newSettings,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update user social links
 */
export const updateSocialLinks = mutation({
  args: {
    github: v.optional(v.string()),
    x: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    telegram: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.boolean(), error: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, { github, x, linkedin, telegram }) => {
    const authUser = await authComponent.getAuthUser(ctx)

    if (!authUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUser._id))
      .unique()

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Validate social links URLs
    if (github?.trim() && !github.startsWith('https://github.com/')) {
      return {
        success: false,
        error: 'GitHub URL must start with https://github.com/',
      }
    }

    if (x?.trim() && !x.startsWith('https://x.com/')) {
      return {
        success: false,
        error: 'X (Twitter) URL must start with https://x.com/',
      }
    }

    if (linkedin?.trim() && !linkedin.startsWith('https://linkedin.com/in/')) {
      return {
        success: false,
        error: 'LinkedIn URL must start with https://linkedin.com/in/',
      }
    }

    if (telegram?.trim() && !telegram.startsWith('https://t.me/')) {
      return {
        success: false,
        error: 'Telegram URL must start with https://t.me/',
      }
    }

    const existing = (currentUser.socialLinks ?? {}) as {
      github?: string
      x?: string
      linkedin?: string
      telegram?: string
    }

    const socialLinks = { ...existing }

    if (github !== undefined) socialLinks.github = github || undefined
    if (x !== undefined) socialLinks.x = x || undefined
    if (linkedin !== undefined) socialLinks.linkedin = linkedin || undefined
    if (telegram !== undefined) socialLinks.telegram = telegram || undefined

    await ctx.db.patch(currentUser._id, {
      socialLinks,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
