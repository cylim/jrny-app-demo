# JRNY - Journey Recording App

A playful, real-time journey tracking application that allows users to record their travels with dates, discover who else is exploring the same cities, and connect with fellow travelers through shared experiences.

## Overview

JRNY is a location-based social application designed for travelers, digital nomads, and anyone who wants to track their journeys and connect with others. Record where you've been and when, see who's currently in the same city, and discover travelers who visited the same places during overlapping time periods.

## Features

### 🗺️ Travel Location Recording
- Record your travel locations with arrival and departure dates
- Track your complete travel history sorted by date
- View all cities you've visited in one organized profile
- Mark yourself as "currently in" a location for ongoing trips

### ⏱️ Date-Based Visit Tracking
- Log arrival and departure dates for each city visit
- See visit date ranges for your entire travel history
- Automatic detection of overlapping visits between travelers
- Day-level precision for accurate overlap calculations

### 👥 Social Discovery
- **Current Location Discovery**: See who else is currently in the same city as you
- **Historical Overlap Discovery**: Find travelers who were in the same cities during your visits
- View traveler profiles with username and avatar
- Real-time updates when travelers check in or out of locations
- Privacy controls to opt out of visibility in all traveler lists

### 🎉 City Events & Meetups (NEW)
- **Create Events**: Organize meetups, tours, or social gatherings in any city
- **Event Discovery**: Browse upcoming events on city pages sorted by date
- **Join Events**: RSVP to events with automatic capacity management
- **Event Management**: Edit event details, cancel events, or leave as a participant
- **Privacy Controls**: Hide participant lists from non-participants
- **Profile Integration**: View upcoming and past events in your user profile
- **Real-time Updates**: See participant counts update live as users join/leave

### 🔒 Privacy & Authentication
- Secure authentication via Better-Auth with Google Sign-In
- One-click OAuth authentication
- Global privacy toggle to control visibility in all traveler lists
- Event-level privacy: Hide participant lists from non-participants
- Public city pages for non-logged-in users (without user data)
- Account deletion removes all user data from visitor lists and events

### 💳 Subscription & Payments (Pro Tier)
- **Stripe Integration**: Powered by Autumn for seamless payment handling
- **Pro Tier**: $0.99/month subscription with enhanced privacy features
- **Free Tier Features**: Track visits, join events, basic profile privacy
- **Pro Features**: Global visit privacy, individual visit privacy, hide event participant lists
- **Subscription Management**: Upgrade, cancel, and reactivate subscriptions
- **Secure Checkout**: Stripe-hosted payment pages with test mode support

### 🌐 AI-Powered City Enrichment 
- **Automatic Enrichment**: City information automatically enriched when users visit city pages
- **Wikipedia Integration**: Fetches comprehensive city data including history, geography, climate, and tourism information using Firecrawl
- **Smart Caching**: Enriched data cached for 1 week to minimize API calls and ensure fresh content
- **Concurrency Protection**: Lock mechanism prevents duplicate enrichment when multiple users visit simultaneously
- **Graceful Degradation**: City pages display basic info if enrichment fails or is in progress
- **Background Processing**: Enrichment runs asynchronously without blocking page display
- **Enrichment Monitoring**: Comprehensive logging and statistics for tracking success rates and performance

### 🎨 Kirby-Style UI Design
- Playful, welcoming interface with soft pastel colors (pinks, blues, purples)
- Pronounced rounded corners (16-24px) and bubble-like elements
- Bouncy, delightful animations using Framer Motion
- Animated backgrounds for visual depth and engagement
- Smooth loading transitions with pulsating dots
- Responsive design maintaining aesthetic across all screen sizes

## Tech Stack

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) - Full-stack React framework with SSR
- **Router**: [TanStack Router](https://tanstack.com/router) - Type-safe file-based routing
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) - Utility-first CSS framework
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) - Beautifully designed, accessible components
- **Animations**: [Framer Motion](https://www.framer.com/motion/) - Production-ready animation library
- **State Management**: [TanStack Query](https://tanstack.com/query) - Powerful data synchronization
- **Icons**: [Lucide React](https://lucide.dev) - Beautiful & consistent icon toolkit

### Backend
- **Backend**: [Convex](https://convex.dev) - Real-time backend-as-a-service
- **Authentication**: [Better-Auth](https://better-auth.com) with Google OAuth - Modern authentication solution
- **Payments**: [Autumn](https://useautumn.com) - Stripe-based subscription management
- **AI/Web Scraping**: [Firecrawl](https://firecrawl.dev) - Wikipedia data extraction for city enrichment
- **Database**: Convex built-in transactional database with real-time sync

### Infrastructure
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com) - Global edge deployment
- **Error Monitoring**: [Sentry](https://sentry.io) - Full-stack error tracking and performance monitoring

### Developer Experience
- **Package Manager**: [Bun](https://bun.sh) - Fast JavaScript runtime and package manager
- **Language**: TypeScript with strict mode
- **Validation**: [Zod](https://zod.dev) - TypeScript-first schema validation
- **Environment**: [t3env](https://env.t3.gg) - Type-safe environment variables
- **Linting & Formatting**: [Biome](https://biomejs.dev) - Fast, unified toolchain for linting and formatting
- **Testing**: [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) - Unit and E2E testing

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.0+ (fast JavaScript runtime and package manager)
- [Convex](https://convex.dev) account (free tier available)
- [Cloudflare](https://cloudflare.com) account (for deployment)
- [Google Cloud Console](https://console.cloud.google.com) account (for OAuth authentication)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd jrny-app-demo
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up environment variables**:

   Create a `.env.local` file in the root directory:
   ```env
   # Convex Backend
   CONVEX_DEPLOYMENT=dev:your-deployment
   VITE_CONVEX_URL=https://your-deployment.convex.cloud
   CONVEX_SITE_URL=https://your-deployment.convex.cloud
   VITE_CONVEX_SITE_URL=https://your-deployment.convex.site

   # Application
   SITE_URL=http://localhost:3000

   # Google OAuth (required for authentication)
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Sentry
   VITE_SENTRY_DSN=your-sentry-dsn
   SENTRY_DSN=your-sentry-dsn

   # Autumn Payments 
   AUTUMN_SECRET_KEY=am_sk_test_your_key

   # Firecrawl 
   FIRECRAWL_API_KEY=fc-your-api-key
   ```

   **Google OAuth Setup**:
   1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
   2. Create a new project or select existing one
   3. Enable the appropriate Google APIs for OAuth 
   4. Navigate to Credentials → Create Credentials → OAuth 2.0 Client ID
   5. Configure OAuth consent screen
   6. Add authorized redirect URI: `https://your-deployment.convex.site/api/auth/callback/google`
   7. Copy Client ID and Client Secret to `.env.local`
   8. Deploy credentials to Convex:
      ```bash
      npx convex env set GOOGLE_CLIENT_ID "your-client-id"
      npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret"
      ```

   **Autumn Payments Setup** :
   1. Sign up at [Autumn](https://useautumn.com)
   2. Get your `AUTUMN_SECRET_KEY` from the dashboard
   3. Deploy to Convex:
      ```bash
      npx convex env set AUTUMN_SECRET_KEY "am_sk_test_your_key"
      ```
   4. Configure products using the config file:
      ```bash
      npx atmn init  # Creates autumn.config.ts
      npx atmn push  # Syncs config to Autumn
      ```
   5. Connect your Stripe account in the Autumn dashboard
   6. See [Testing Stripe Payments](#testing-stripe-payments) below for testing instructions

   **Firecrawl Setup** (for AI-powered city enrichment):
   1. Sign up at [Firecrawl](https://firecrawl.dev)
   2. Get your API key from the dashboard
   3. Deploy to Convex:
      ```bash
      npx convex env set FIRECRAWL_API_KEY "fc-your-api-key"
      ```
   4. City enrichment will automatically trigger when users visit city pages
   5. Enriched data is cached for 1 week to minimize API calls
   6. Monitor enrichment logs in Convex dashboard or via enrichment statistics queries

4. **Initialize Convex**:
   ```bash
   npx convex dev
   ```

5. **Start the development server**:
   ```bash
   bun run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Database Seeding (Optional)

For development and testing, you can populate the database with realistic test data:

```bash
# Seed database with 200 users and 4000 visits (default)
bun run seed:db

# Or with custom settings
node scripts/seed-database.mjs --users 500 --visits-per-user 10
```

**What gets seeded**:
- 200 users with realistic names, avatars, and social links
- 4000 visits (20 per user) across top 100 cities
- All visits have 1-month duration
- ~20% of users have usernames
- All seeded data marked with `isSeed: true`
- Privacy settings randomized for realistic testing

**Key Features**:
- **Idempotent**: Running multiple times only adds delta to reach target
- **Customizable**: Configure user count and visits per user via CLI
- **Fast**: ~15 seconds for default 4000 visits
- **Realistic**: Generated using [@faker-js/faker](https://fakerjs.dev)

See [Database Seeding Guide](specs/003-db-seed/quickstart.md) for more details.

### Testing Stripe Payments

To test the Pro subscription upgrade flow in development:

1. **Ensure Autumn is configured**:
   - `AUTUMN_SECRET_KEY` set in Convex environment
   - `autumn.config.ts` pushed to Autumn dashboard
   - Stripe account connected in Autumn dashboard

2. **Navigate to Settings**:
   - Sign in with Google OAuth
   - Go to Settings page (`/settings`)
   - Find the "Subscription" section

3. **Test Upgrade Flow**:
   - Click "Upgrade to Pro - $0.99/month" button
   - You'll be redirected to Stripe Checkout
   - Use Stripe test card numbers:
     - **Success**: `4242 4242 4242 4242`
     - **Decline**: `4000 0000 0000 0002`
     - **3D Secure**: `4000 0025 0000 3155`
   - Any future expiry date (e.g., `12/25`)
   - Any 3-digit CVC (e.g., `123`)
   - Any billing ZIP code

4. **Verify Subscription**:
   - After successful payment, you'll be redirected to `/subscription/success`
   - Your subscription will sync automatically
   - Pro badge appears next to your avatar in the header
   - Subscription status updates in Settings page
   - Pro-only privacy features become available

5. **Test Subscription Management**:
   - **Cancel**: Click "Cancel Subscription" in Settings
   - **Pro access continues** until end of billing period
   - **Reactivate**: (Feature coming soon)

**Important Notes**:
- Test mode uses Stripe test keys - no real charges
- Webhooks are handled automatically via Autumn
- Subscription status syncs in real-time
- All test data can be viewed in your Stripe Dashboard's test mode

**Troubleshooting**:
- If checkout fails, check Convex logs for Autumn API errors
- Verify `AUTUMN_SECRET_KEY` is correctly set
- Ensure `autumn.config.ts` was pushed successfully
- Check Stripe is connected in Autumn dashboard

## Development

### Available Scripts

- `bun run dev` - Start full development environment (Convex + Vite)
- `bun run dev:web` - Start only the web dev server
- `bun run dev:convex` - Start only the Convex backend
- `bun run build` - Build for production
- `bun run preview` - Preview production build locally with Cloudflare Workers
- `bun run seed:db` - Populate database with test data (200 users, 4000 visits)
- `bun run lint` - Run TypeScript and Biome checks
- `bun run lint:fix` - Run linter with auto-fix
- `bun run format` - Format code with Biome
- `bun run format:check` - Check formatting without writing
- `bun run deploy` - Deploy to Cloudflare Workers

### Project Structure

```
jrny-app-demo/
├── convex/                    # Convex backend functions and schema
│   ├── auth.ts                # Better-Auth with Google OAuth configuration
│   ├── auth.config.ts         # Auth provider configuration
│   ├── http.ts                # HTTP router for auth endpoints
│   ├── schema.ts              # Database schema (users, cities, visits, events, enrichment)
│   ├── cities.ts              # City-related queries and mutations
│   ├── users.ts               # User profile queries and mutations
│   ├── visits.ts              # Visit tracking queries and mutations
│   ├── events.ts              # Event management queries and mutations
│   ├── enrichment.ts          # City enrichment queries and mutations
│   ├── enrichmentActions.ts   # Firecrawl integration and enrichment actions
│   └── subscriptions.ts       # Autumn subscription management
├── src/
│   ├── components/
│   │   ├── auth/              # Authentication components
│   │   │   ├── google-sign-in-button.tsx
│   │   │   └── user-nav.tsx   # User navigation with avatar dropdown
│   │   ├── ui/                # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── loading-dots.tsx  # Pulsating dots loader
│   │   │   └── [other shadcn components]
│   │   ├── events/             # Event components
│   │   │   ├── event-card.tsx  # Event display card
│   │   │   ├── event-form.tsx  # Create/edit event form
│   │   │   ├── event-actions.tsx  # Join/Leave/Edit buttons
│   │   │   └── event-participant-list.tsx  # Participant avatars
│   │   ├── visits/             # Visit tracking components
│   │   ├── animated-background.tsx  # Framer Motion background
│   │   ├── animated-trees.tsx       # Decorative animations
│   │   ├── city-card.tsx            # City display component
│   │   ├── page-transition.tsx      # Page navigation transitions
│   │   └── route-loading-bar.tsx    # Loading progress bar
│   ├── lib/
│   │   ├── auth-client.ts     # Better-Auth client configuration
│   │   ├── auth-server.ts     # Server-side auth utilities
│   │   ├── animations.ts      # Framer Motion animation variants
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   ├── routes/                # TanStack Router file-based routes
│   │   ├── __root.tsx         # Root layout with header & navigation
│   │   ├── index.tsx          # Landing page with featured cities
│   │   ├── discover.tsx       # City discovery page
│   │   ├── settings.tsx       # User settings page
│   │   ├── c/                 # City pages (/c/:shortSlug)
│   │   ├── e/                 # Event detail pages (/e/:eventId)
│   │   └── u/                 # User profile pages (/u/:username)
│   ├── styles/
│   │   └── app.css            # Tailwind v4 + Kirby-style theme
│   ├── env.client.ts          # Client-side environment validation
│   ├── env.server.ts          # Server-side environment validation
│   └── router.tsx             # Router configuration with Convex
├── specs/                     # Feature specifications
│   ├── 001-travel-tracking/   # Travel tracking feature spec
│   ├── 002-kirby-ui-refactor/ # UI refactor feature spec
│   ├── 003-db-seed/           # Database seeding feature spec
│   ├── 004-city-events/       # City events & meetups feature spec
│   ├── 005-autumn-payment-gates/ # Subscription & payments feature spec
│   └── 007-firecrawl-city-enrichment/ # AI-powered city enrichment feature spec
├── public/                    # Static assets
├── components.json            # shadcn/ui configuration
├── biome.json                 # Biome linting & formatting config
├── wrangler.jsonc             # Cloudflare Workers configuration
└── instrument.server.mjs      # Sentry server-side instrumentation
```

## Deployment

### Deploy to Cloudflare Workers

1. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

2. **Set production environment variables**:
   ```bash
   wrangler secret put CONVEX_DEPLOYMENT
   wrangler secret put CONVEX_SITE_URL
   wrangler secret put SITE_URL
   wrangler secret put SENTRY_DSN
   ```

   **Also deploy Google OAuth credentials to Convex**:
   ```bash
   npx convex env set GOOGLE_CLIENT_ID "your-production-client-id" --prod
   npx convex env set GOOGLE_CLIENT_SECRET "your-production-client-secret" --prod
   ```

   **Important**: Update the Google OAuth callback URL in Google Cloud Console for production:
   ```
   https://your-production-deployment.convex.site/api/auth/callback/google
   ```

3. **Update `wrangler.jsonc`** with your production URLs

4. **Deploy**:
   ```bash
   bun run deploy
   ```

Your app will be live at `https://jrny-app-demo.cy.workers.dev`

## Key Features in Detail

### Real-Time Synchronization

Built on Convex, JRNY provides real-time updates without manual polling:
- Location updates appear instantly for all users in the same city
- Check-in/check-out events sync across all connected clients
- Optimistic updates for smooth UX
- Automatic overlap detection when travelers visit the same cities

### Type Safety

End-to-end type safety from database to UI:
- Convex schema generates TypeScript types
- TanStack Router provides type-safe routing
- Zod validates all environment variables and API inputs
- t3env ensures environment variables are properly typed

### Performance

Optimized for global performance:
- Deployed on Cloudflare's edge network
- Server-side rendering (SSR) for fast initial page loads
- Code splitting and lazy loading
- Framer Motion animations optimized for 60fps
- Session replay and performance monitoring with Sentry

### Error Tracking

Comprehensive error monitoring:
- Client-side error tracking with source maps
- Server-side error capture
- Session replay for debugging user issues
- Performance monitoring and traces

### Delightful UX

Kirby-inspired design for a playful experience:
- Soft pastel color palette (pinks, blues, purples)
- Pronounced rounded corners and bubble-like elements
- Bouncy, spring-based animations using Framer Motion
- Animated backgrounds with decorative elements
- Smooth loading transitions with pulsating dots
- Responsive design maintaining visual consistency

### City Database

Pre-populated cities for consistent data:
- Top 1000 cities worldwide by population
- Geographic coordinates for each city
- Autocomplete search for easy city selection
- URL-friendly slugs for sharing and bookmarking
- Cached visitor counts for performance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT License](LICENSE) - feel free to use this project for your own purposes.

## Acknowledgments

- Built with [TanStack Start](https://tanstack.com/start)
- Backend powered by [Convex](https://convex.dev)
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com)
- Authenticated with [Better-Auth](https://better-auth.com)
- Payments via [Autumn](https://useautumn.com) and [Stripe](https://stripe.com)
- City enrichment by [Firecrawl](https://firecrawl.dev)
- Monitored by [Sentry](https://sentry.io)
- Animated with [Framer Motion](https://www.framer.com/motion/)
- UI components from [shadcn/ui](https://ui.shadcn.com)

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Made for travelers, by travelers** ✈️ 🌍
