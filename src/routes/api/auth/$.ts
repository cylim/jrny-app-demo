import { reactStartHandler } from '@convex-dev/better-auth/react-start'
import { createFileRoute, type FileRoutesByPath } from '@tanstack/react-router'

export const Route = createFileRoute('/api/auth/$' as keyof FileRoutesByPath)({
  server: {
    handlers: {
      GET: ({ request }) => {
        return reactStartHandler(request)
      },
      POST: ({ request }) => {
        return reactStartHandler(request)
      },
    },
  },
})
