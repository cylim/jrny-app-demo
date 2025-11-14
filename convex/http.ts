import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

// CORS preflight handler for authentication endpoints
const corsHandler = httpAction(async (_ctx, request) => {
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = [
    process.env.SITE_URL || 'http://localhost:3000',
    process.env.CONVEX_SITE_URL || '',
  ]

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }

  // Only allow specific origins
  if (allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
})

// Register CORS preflight handler before auth routes
http.route({
  pathPrefix: '/api/auth/',
  method: 'OPTIONS',
  handler: corsHandler,
})

authComponent.registerRoutes(http, createAuth)

export default http
