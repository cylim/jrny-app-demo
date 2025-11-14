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
    globalPrivacy: boolean // defaults to false
    hideVisitHistory: boolean // defaults to false
  }
  socialLinks?: {
    github?: string
    x?: string // formerly twitter
    linkedin?: string
    telegram?: string
  }
  updatedAt: number
  lastSeen: number
}
