import * as Sentry from '@sentry/tanstackstart-react'

// Server-side Sentry initialization
// This file is loaded via NODE_OPTIONS='--import ./instrument.server.mjs'
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring sample rate
  // 1.0 = 100% of transactions are sent to Sentry
  // Adjust lower for production (e.g., 0.1 = 10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable capturing of console.log, console.warn, console.error
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Before sending events, ensure DSN is configured
  beforeSend(event) {
    // Don't send events if DSN is not configured
    if (!process.env.SENTRY_DSN) {
      console.warn('Sentry DSN not configured, skipping error reporting')
      return null
    }
    return event
  },
})