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

### 🔒 Privacy & Authentication
- Secure authentication via Better-Auth with Google Sign-In
- One-click OAuth authentication
- Global privacy toggle to control visibility in all traveler lists
- Public city pages for non-logged-in users (without user data)
- Account deletion removes all user data from visitor lists

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

   # Sentry (optional for development)
   VITE_SENTRY_DSN=your-sentry-dsn
   SENTRY_DSN=your-sentry-dsn
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

## Development

### Available Scripts

- `bun run dev` - Start full development environment (Convex + Vite)
- `bun run dev:web` - Start only the web dev server
- `bun run dev:convex` - Start only the Convex backend
- `bun run build` - Build for production
- `bun run preview` - Preview production build locally with Cloudflare Workers
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
│   ├── schema.ts              # Database schema (users, cities, visits)
│   ├── cities.ts              # City-related queries and mutations
│   ├── users.ts               # User profile queries and mutations
│   └── visits.ts              # Visit tracking queries and mutations
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
│   │   └── u/                 # User profile pages (/u/:username)
│   ├── styles/
│   │   └── app.css            # Tailwind v4 + Kirby-style theme
│   ├── env.client.ts          # Client-side environment validation
│   ├── env.server.ts          # Server-side environment validation
│   └── router.tsx             # Router configuration with Convex
├── specs/                     # Feature specifications
│   ├── 001-travel-tracking/   # Travel tracking feature spec
│   └── 002-kirby-ui-refactor/ # UI refactor feature spec
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
- Monitored by [Sentry](https://sentry.io)
- Animated with [Framer Motion](https://www.framer.com/motion/)
- UI components from [shadcn/ui](https://ui.shadcn.com)

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Made for travelers, by travelers** ✈️ 🌍
