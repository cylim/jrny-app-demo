# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack TypeScript application combining **Convex** (backend-as-a-service) with **TanStack Start** (React meta-framework) and **TanStack Router** for client-side routing. The app uses **@convex-dev/react-query** to integrate Convex with React Query for optimal data fetching.

## Development Commands

### Start Development Server
```bash
npm run dev
```
This runs both the Convex backend (`npm:dev:convex`) and Vite dev server (`npm:dev:web`) concurrently. The Convex dev server syncs your functions to the cloud.

### Linting and Type Checking
```bash
npm run lint
```
Runs TypeScript compiler and Biome linter. Note: This project uses strict TypeScript settings.

To automatically fix linting issues:
```bash
npm run lint:fix
```

### Format Code
```bash
npm run format
```
Runs Biome formatter on all files. Biome handles both linting and formatting.

To check formatting without writing:
```bash
npm run format:check
```

### Build for Production
```bash
npm run build
```
Builds the Vite bundle and runs TypeScript type checking.

### Development (Web Only)
```bash
npm run dev:web
```
Starts only the Vite dev server without Convex.

### Development (Convex Only)
```bash
npm run dev:convex
```
Starts only the Convex backend dev server.

## Deployment

### Cloudflare Workers Deployment

This project is configured for deployment to **Cloudflare Workers** using Wrangler.

#### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Already installed as dev dependency
3. **Environment Variables**: Set up both locally and in production

#### Local Testing with Cloudflare Workers

Test your app locally with Cloudflare Workers runtime:

```bash
npm run preview
```

This runs `wrangler dev` which starts a local Cloudflare Workers environment. Use `.dev.vars` file for local secrets.

#### Deployment Steps

1. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

2. **Set Production Secrets**:
   ```bash
   wrangler secret put CONVEX_DEPLOYMENT
   wrangler secret put CONVEX_SITE_URL
   wrangler secret put SITE_URL
   ```

   When prompted, enter the production values:
   - `CONVEX_DEPLOYMENT`: Your production Convex deployment (e.g., `prod:your-deployment`)
   - `CONVEX_SITE_URL`: Your production Convex site URL
   - `SITE_URL`: Your production domain (e.g., `https://yourdomain.com`)

3. **Deploy to Cloudflare**:
   ```bash
   npm run deploy
   ```

   This builds the project and deploys to Cloudflare Workers.

4. **Generate TypeScript Types** (optional):
   ```bash
   npm run cf-typegen
   ```

   Generates TypeScript types for Cloudflare Workers bindings.

#### Configuration Files

- **`wrangler.jsonc`**: Main Cloudflare Workers configuration
  - Defines project name, compatibility settings
  - Specifies public environment variables (VITE_* prefixed)
  - Entry point: `@tanstack/react-start/server-entry`

- **`.dev.vars`**: Local development secrets (gitignored)
  - Server-side environment variables for `wrangler dev`
  - Never commit this file

#### Environment Variables in Cloudflare

**Public Variables** (set in `wrangler.jsonc`):
- `VITE_CONVEX_URL` - Bundled into client code
- `VITE_CONVEX_SITE_URL` - Bundled into client code

**Secret Variables** (set via `wrangler secret put`):
- `CONVEX_DEPLOYMENT` - Server-only
- `CONVEX_SITE_URL` - Server-only
- `SITE_URL` - Server-only

**Important Notes**:
- Public vars (`vars` in wrangler.jsonc) are accessible in client bundles
- Secrets (set via CLI) are only accessible server-side
- Update `wrangler.jsonc` with your production URLs before deploying
- The `.dev.vars` file is for local development only

#### Cloudflare-Specific Considerations

1. **Vite Configuration**: The `@cloudflare/vite-plugin` is added as the first plugin in `vite.config.ts` (vite.config.ts:13)

2. **Compatibility Flags**: The project uses `nodejs_compat` for Node.js API compatibility

3. **Convex Integration**: Convex works seamlessly with Cloudflare Workers as it communicates via HTTP/WebSocket

4. **Static Assets**: Client-side assets are served from Cloudflare's edge network

## Error Monitoring with Sentry

This project uses **Sentry** for error tracking, performance monitoring, and session replay across both client and server.

### Configuration

**Sentry SDK**: `@sentry/tanstackstart-react@^10.25.0`

**Key Files**:
- `instrument.server.mjs` - Server-side Sentry initialization (loaded via NODE_OPTIONS)
- `src/router.tsx` - Client-side Sentry initialization
- `src/routes/__root.tsx` - Error boundary that captures and reports errors
- `src/env.client.ts` - Client-side DSN validation (VITE_SENTRY_DSN)
- `src/env.server.ts` - Server-side DSN validation (SENTRY_DSN)

### Environment Variables

**Client-side** (public, in wrangler.jsonc):
- `VITE_SENTRY_DSN` - Your Sentry DSN for client-side error tracking
  - Accessible in browser
  - Used for client-side errors, performance tracking, and session replay

**Server-side** (secret, via wrangler CLI):
- `SENTRY_DSN` - Your Sentry DSN for server-side error tracking
  - Server-only
  - Used for SSR errors and server-side performance monitoring
  - Set via: `wrangler secret put SENTRY_DSN`

### Features Enabled

**Client-side**:
- **Performance Monitoring**: Tracks route changes and page loads (tanstackRouterBrowserTracingIntegration)
- **Session Replay**: Records user sessions for debugging (replayIntegration)
  - Development: 100% of sessions
  - Production: 10% of sessions, 100% of error sessions
- **User Feedback Widget**: Allows users to report bugs (feedbackIntegration)
- **Error Tracking**: Captures unhandled errors and exceptions
- **Traces Sample Rate**:
  - Development: 100% of transactions
  - Production: 10% of transactions

**Server-side**:
- **Error Tracking**: Captures server-side exceptions
- **Performance Monitoring**: Tracks server-side request performance
- **Console Integration**: Captures console.error() and console.warn() calls
- **Traces Sample Rate**:
  - Development: 100% of transactions
  - Production: 10% of transactions

### Error Boundaries

The root route (`src/routes/__root.tsx`) includes a custom error component that:
- Captures errors to Sentry with React component stack
- Shows user-friendly error message in production
- Shows detailed error information in development
- Provides "Reload page" and "Go home" buttons

### Viewing Errors in Sentry

1. **Login to Sentry**: Visit [sentry.io](https://sentry.io) and login to your account
2. **Select Project**: Choose the "jrny-app-demo" project
3. **View Issues**: Browse errors in the Issues tab
4. **Session Replay**: Watch user sessions in the Replays tab
5. **Performance**: View performance metrics in the Performance tab

### Local Development

Server-side Sentry is automatically initialized when running:
```bash
npm run dev        # Full stack development
npm run dev:web    # Web-only development
```

The `dev:web` script uses `NODE_OPTIONS='--import ./instrument.server.mjs'` to load Sentry before the application starts.

### Production Deployment

When deploying to Cloudflare Workers:

1. **Set Sentry DSN as secret**:
   ```bash
   wrangler secret put SENTRY_DSN
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   ```

3. The `VITE_SENTRY_DSN` is automatically included from `wrangler.jsonc` vars

### Cloudflare Workers Compatibility

Sentry works with Cloudflare Workers through the `nodejs_compat` compatibility flag (already configured in `wrangler.jsonc`). The `@sentry/tanstackstart-react` package is compatible with both Node.js (development) and Cloudflare Workers (production).

### Testing Sentry Integration

To test if Sentry is working correctly:

1. **Client-side test**: Add a button that throws an error:
   ```tsx
   <button onClick={() => { throw new Error('Test client error') }}>
     Test Error
   </button>
   ```

2. **Server-side test**: Add an error to a server function:
   ```tsx
   const testServerError = createServerFn({ method: 'GET' }).handler(async () => {
     throw new Error('Test server error')
   })
   ```

3. Check Sentry dashboard for the error events

### Sample Rates

Adjust sample rates in production to manage Sentry quota:
- `tracesSampleRate`: Controls performance monitoring (currently 0.1 = 10%)
- `replaysSessionSampleRate`: Controls normal session replay (currently 0.1 = 10%)
- `replaysOnErrorSampleRate`: Controls replay on errors (currently 1.0 = 100%)

You can modify these in `src/router.tsx` (client) and `instrument.server.mjs` (server).

## Architecture

### Frontend Architecture

- **Framework**: TanStack Start (SSR-capable React meta-framework)
- **Router**: TanStack Router with file-based routing
- **Styling**: Tailwind CSS v4 (note: using `@tailwindcss/vite` plugin)
- **UI Components**: shadcn/ui - Accessible, customizable component library built on Radix UI
- **Icons**: Lucide React for consistent iconography
- **State Management**: TanStack Query (React Query) integrated with Convex
- **Port**: Development server runs on port 3000

**Router Setup**: The router is configured in `src/router.tsx` with:
- File-based routing via `routeTree.gen.ts` (auto-generated)
- `ConvexReactClient` instantiated with `unsavedChangesWarning: false`
- `ConvexQueryClient` wrapping the Convex client and integrating with React Query
- `ConvexProvider` wrapping the entire app for Convex client access
- Routes defined in `src/routes/` directory

**Important Router Details**:
- Route files use `createFileRoute()` pattern
- Root route in `src/routes/__root.tsx` handles HTML structure and metadata
- All routes have access to `queryClient`, `convexClient`, and `convexQueryClient` via context
- The router context provides three key objects:
  - `queryClient`: TanStack Query client for general data fetching
  - `convexClient`: Direct Convex client for real-time subscriptions
  - `convexQueryClient`: Bridge between Convex and React Query

### Backend Architecture

- **Backend**: Convex (serverless backend-as-a-service)
- **Auth**: Better-Auth integrated via `@convex-dev/better-auth` with Google OAuth
- **Database**: Convex's built-in transactional database
- **Functions**: Defined in `convex/` directory

**Authentication Setup**:
- Uses Google Sign-In via Better-Auth's social providers
- Configuration in `convex/auth.ts` with `socialProviders.google`
- OAuth callback handled by Convex HTTP router at `/api/auth/callback/google`
- Session management via Better-Auth cookies
- No email/password authentication (Google OAuth only)

**Convex Function Organization**:
- Public functions defined with `query`, `mutation`, `action`
- Internal functions use `internalQuery`, `internalMutation`, `internalAction`
- File-based routing: `convex/myFunctions.ts` → `api.myFunctions.functionName`

**Convex Configuration**:
- `convex/convex.config.ts`: Defines app-level config and registers Better-Auth
- `convex/auth.config.ts`: Better-Auth provider configuration
- `convex/auth.ts`: Better-Auth instance with Google OAuth provider
- `convex/http.ts`: HTTP router that registers auth endpoints
- `convex/schema.ts`: Database schema definitions

### Data Fetching Pattern

This project uses a **hybrid approach** combining Convex React hooks with React Query:

```typescript
// Using React Query with Convex
import { convexQuery } from '@convex-dev/react-query'
const { data } = useSuspenseQuery(convexQuery(api.myFunctions.listNumbers, { count: 10 }))

// Using Convex mutation hook directly
import { useMutation } from 'convex/react'
const addNumber = useMutation(api.myFunctions.addNumber)
```

**Why This Matters**: The app uses `@convex-dev/react-query` to bridge Convex and React Query. The `ConvexQueryClient` is configured in `src/router.tsx` and uses custom `queryFn()` and `hashFn()` from Convex.

**Accessing Router Context in Routes**:

Routes can access the Convex clients via the router context:

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/myRoute')({
  component: MyComponent,
})

function MyComponent() {
  // Access via useRouterContext hook
  const { convexClient } = Route.useRouteContext()

  // Or use React Query with Convex
  import { convexQuery } from '@convex-dev/react-query'
  const { data } = useSuspenseQuery(convexQuery(api.myFunctions.getData, {}))

  // Or use Convex hooks directly
  import { useMutation } from 'convex/react'
  const mutate = useMutation(api.myFunctions.doSomething)
}
```

## Key Convex Guidelines (from .cursor/rules/convex_rules.mdc)

### Function Syntax
- ALWAYS use new function syntax with explicit `args`, `returns`, and `handler`
- ALWAYS include validators for arguments AND return values
- Use `v.null()` for functions that don't return anything

Example:
```typescript
export const myQuery = query({
  args: { name: v.string() },
  returns: v.object({ greeting: v.string() }),
  handler: async (ctx, args) => {
    return { greeting: `Hello ${args.name}` }
  },
})
```

### Function References
- Use `api` object for public functions (from `convex/_generated/api`)
- Use `internal` object for internal functions
- File-based routing: `convex/messages/send.ts` → `api.messages.send.functionName`

### Database Queries
- **DO NOT use `.filter()` in queries** - define indexes instead and use `.withIndex()`
- Use `.unique()` for single-document queries (throws if multiple found)
- Default order is ascending `_creationTime`; use `.order('desc')` to reverse
- Queries do NOT support `.delete()` - collect results and iterate with `ctx.db.delete()`

### Schema Design
- Define all tables in `convex/schema.ts`
- Index naming: include all fields (e.g., `by_field1_and_field2` for `["field1", "field2"]`)
- Index fields must be queried in the same order they're defined
- System fields: `_id` (v.id(tableName)), `_creationTime` (v.number())

### TypeScript Types
- Use `Id<'tableName'>` from `convex/_generated/dataModel` for document IDs
- Be strict with ID types - prefer `Id<'users'>` over `string`
- Use `as const` for string literals in discriminated unions
- Define arrays as `const array: Array<T> = [...]`
- Define records as `const record: Record<K, V> = {...}`

### Actions
- Add `"use node";` to files using Node.js built-in modules
- Actions do NOT have `ctx.db` access - use `ctx.runQuery()` or `ctx.runMutation()`
- Minimize action-to-query/mutation calls to avoid race conditions

### Authentication
- The app uses Better-Auth integrated with Convex
- Access user identity via `ctx.auth.getUserIdentity()` in functions
- Example in `convex/myFunctions.ts:25` shows checking viewer identity

## Important Notes

### Path Aliases
- TypeScript is configured with `~/*` path alias pointing to `./src/*`
- Example: `import appCss from '~/styles/app.css?url'`

### Environment Variables

This project uses **t3env** (`@t3-oss/env-core`) for type-safe, validated environment variables.

**Environment Files**:
- `src/env.client.ts`: Client-side env vars (prefixed with `VITE_`)
- `src/env.server.ts`: Server-side env vars (for TanStack Start server code)
- `.env.local`: Store actual values here (gitignored)

**Current Environment Variables**:

**Client-side** (accessible in browser):
- `VITE_CONVEX_URL` (required): Your Convex deployment URL
  - Example: `https://wary-bison-35.convex.cloud`
  - Used in: `src/router.tsx` to initialize the Convex client
- `VITE_CONVEX_SITE_URL` (required): Your Convex site URL for authentication
  - Example: `https://wary-bison-35.convex.site`
  - Used for: Better-Auth client-side configuration
- `VITE_SENTRY_DSN` (required): Your Sentry DSN for client-side error tracking
  - Example: `https://abc123@o123.ingest.sentry.io/456`
  - Used in: `src/router.tsx` for Sentry initialization
  - Includes: Error tracking, performance monitoring, session replay

**Server-side** (Node.js/server only):
- `CONVEX_SITE_URL` (required): Convex site URL for Better-Auth server configuration
  - Example: `https://wary-bison-35.convex.cloud`
- `CONVEX_DEPLOYMENT` (required): Convex deployment identifier
  - Example: `dev:wary-bison-35`
  - Used by: Convex CLI for deployment management
- `SITE_URL` (required): Your application's URL
  - Example: `http://localhost:3000` (development) or `https://yourdomain.com` (production)
  - Used for: Better-Auth redirect URLs and CORS configuration
- `SENTRY_DSN` (required): Your Sentry DSN for server-side error tracking
  - Example: `https://abc123@o123.ingest.sentry.io/456`
  - Used in: `instrument.server.mjs` for server-side Sentry initialization
  - Includes: SSR error tracking, performance monitoring, console integration

**Convex Functions** (deployed via `npx convex env set`):
The `convex/` directory runs in Convex's managed runtime (not your Node.js server). Convex functions access environment variables directly via `process.env` - they do NOT use the t3env schemas in `src/`.

- `GOOGLE_CLIENT_ID` (required): Google OAuth client ID
  - Example: `your-app.apps.googleusercontent.com`
  - Used in: `convex/auth.ts` for Google OAuth configuration
  - Deploy: `npx convex env set GOOGLE_CLIENT_ID "your-client-id"`
- `GOOGLE_CLIENT_SECRET` (required): Google OAuth client secret
  - Example: `GOCSPX-...`
  - Used in: `convex/auth.ts` for Google OAuth configuration
  - Deploy: `npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret"`

**Google OAuth Setup**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://your-deployment.convex.site/api/auth/callback/google`
4. Copy Client ID and Secret
5. Deploy to Convex:
   ```bash
   npx convex env set GOOGLE_CLIENT_ID "your-client-id"
   npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret"
   ```

**Usage Examples**:

```typescript
// In client-side code (src/)
import { clientEnv } from '~/env.client'
const convexUrl = clientEnv.VITE_CONVEX_URL // Type-safe!

// In server-side code (src/)
import { serverEnv } from '~/env.server'
const siteUrl = serverEnv.CONVEX_SITE_URL // Type-safe!

// In Convex functions (convex/)
const siteUrl = process.env.CONVEX_SITE_URL // Direct access
```

**Adding New Environment Variables**:

1. Add to `.env.local`:
   ```bash
   VITE_MY_NEW_VAR=some-value
   ```

2. Add to appropriate schema file:
   ```typescript
   // src/env.client.ts (for VITE_ prefixed vars)
   client: {
     VITE_MY_NEW_VAR: z.string().min(1),
   }

   // src/env.server.ts (for server-only vars)
   server: {
     MY_SERVER_VAR: z.string(),  // Required
     // OR
     MY_OPTIONAL_VAR: z.string().optional(),  // Optional
   }
   ```

3. Import and use with full type safety:
   ```typescript
   import { clientEnv } from '~/env.client'
   const myVar = clientEnv.VITE_MY_NEW_VAR // ✅ TypeScript knows this exists
   ```

**Validation**: t3env validates all environment variables at application startup. Missing or invalid variables will throw errors immediately, preventing runtime issues.

### Biome Configuration
- Uses Biome for both linting and formatting (replaces ESLint and Prettier)
- Configuration in `biome.json`
- Convex `_generated` directory and auto-generated files are ignored
- Supports TypeScript, JavaScript, JSX, and JSON formatting
- Import organization enabled

### Styling
- Tailwind CSS v4 with Vite plugin (not PostCSS)
- Main styles in `src/styles/app.css`
- Dark mode support via `dark:` classes
- CSS variables for theming defined in `:root` and `.dark` classes

### shadcn/ui Components

This project uses **shadcn/ui** for UI components - a collection of accessible, customizable components built on Radix UI primitives.

**Configuration**:
- `components.json`: shadcn/ui configuration file
- Style: "default" (clean, simple design)
- Base color: "zinc" (cool gray palette)
- CSS variables: enabled for easy theming
- Path aliases: `@/components`, `@/lib/utils`

**Installed Components**:
- `Button`: Primary UI button with variants (default, destructive, outline, secondary, ghost, link)
- `Avatar`: User avatar with image and fallback support
- `DropdownMenu`: Accessible dropdown menu for navigation and actions

**Component Location**:
- All shadcn/ui components are in `src/components/ui/`
- Components are copied into your codebase (not imported from a package)
- You own the code and can customize as needed

**Adding New Components**:
```bash
bunx shadcn@latest add [component-name]
```

**Example Usage**:
```tsx
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

<Button variant="default">Click me</Button>
<Avatar>
  <AvatarImage src="/avatar.jpg" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>
```

**Utility Function**:
- `src/lib/utils.ts` exports `cn()` function for merging Tailwind classes
- Uses `clsx` and `tailwind-merge` for optimal class name handling

**Authentication Components**:
- `src/components/auth/google-sign-in-button.tsx`: Google OAuth button
- `src/components/auth/user-nav.tsx`: User navigation with avatar dropdown
  - Shows sign-in button for anonymous users
  - Shows avatar with dropdown menu for logged-in users
  - Dropdown includes Profile, Settings (placeholders), and Sign Out

## Common Pitfalls

1. **Missing Return Validators**: Always add `returns: v.null()` even for void functions
2. **Using .filter() Instead of Indexes**: Define indexes in schema and use `.withIndex()`
3. **Wrong Import for Convex Types**: Import `Id` and `Doc` from `convex/_generated/dataModel`, not elsewhere
4. **Mixing React Query and Convex Hooks**: This app uses both - `convexQuery()` for queries and `useMutation()` from `convex/react` for mutations
5. **Forgetting Node Directive**: Add `"use node";` to action files using Node.js APIs
6. **Environment Variable Validation**: All required env vars are validated at startup by t3env. If you add a new env var, make sure to add it to both `.env.local` AND the appropriate schema file (`env.client.ts` or `env.server.ts`)
7. **Router Context Type Safety**: The router context includes `queryClient`, `convexClient`, and `convexQueryClient`. TypeScript will infer these types automatically when using `Route.useRouteContext()`

## Kirby-Style UI Design System

This project uses a **Kirby-inspired design aesthetic** for a playful, welcoming user experience.

### Design Characteristics

- **Color Palette**: Soft pastels (pinks, blues, purples) defined in CSS variables
- **Border Radius**: Pronounced rounded corners (16-24px) on all interactive elements
- **Shapes**: Bubble-like, rounded rectangular cards and containers
- **Animations**: Bouncy, spring-based animations using Framer Motion
- **Typography**: Friendly, readable fonts with appropriate spacing

### Animation Implementation

**Animation Library**: [Framer Motion](https://www.framer.com/motion/) v12+

**Key Animation Files**:
- `src/lib/animations.ts`: Reusable animation variants (fadeIn, slideUp, bounce, etc.)
- `src/components/animated-background.tsx`: Decorative background animations
- `src/components/animated-trees.tsx`: Playful decorative elements
- `src/components/page-transition.tsx`: Smooth page navigation transitions
- `src/components/route-loading-bar.tsx`: Loading progress indicator
- `src/components/ui/loading-dots.tsx`: Pulsating dots loader (3-5 dots with wave effect)

**Animation Guidelines**:
- All animations MUST respect `prefers-reduced-motion` media query
- Target 60fps performance for smooth experience
- Use spring-based easing for bouncy, playful feel
- Keep animations subtle and purposeful - they enhance, not distract

**Example Usage**:
```tsx
import { motion } from 'framer-motion'
import { fadeIn, slideUp } from '~/lib/animations'

<motion.div variants={fadeIn} initial="initial" animate="animate">
  Content here
</motion.div>
```

### Loading States

**Primary Loader**: Pulsating dots (LoadingDots component)
- 3-5 dots arranged horizontally
- Wave animation effect (dots pulse sequentially)
- Pastel colors matching Kirby theme
- Used for data fetches and page transitions

**Progress Bar**: Route loading bar at top of viewport
- Appears during page navigation
- Smooth animation from 0-100%
- Automatically handles TanStack Router navigation

## Application Features

### Travel Tracking

This app allows users to record their travel history with dates and discover other travelers.

**Core Entities**:
- **Users**: Profile with username, avatar, privacy settings, and travel history
- **Cities**: Pre-populated table of top 1000 cities worldwide (name, country, region, lat/long, slug)
- **Visits**: User's trip to a city with arrival/departure dates, notes, and privacy flag

**Key Features**:
1. **Record Travel Locations**: Users log city visits with arrival/departure dates
2. **Current Location Discovery**: See who's currently in the same city (no departure date or future departure)
3. **Historical Overlap Discovery**: Find users who were in the same cities during overlapping dates (day-level precision)
4. **Privacy Controls**: Global toggle to opt out of all visitor lists
5. **Public City Pages**: Non-logged-in users can view city info without seeing user data

**Overlap Detection**: Two visits overlap if they share at least one calendar day. System uses day-level precision (not hour/minute).

### Database Schema

See `convex/schema.ts` for complete schema. Key tables:

**users**:
- `authUserId`, `name`, `email`, `image`, `username`
- `settings` object with `globalPrivacy` and `hideVisitHistory` flags
- `socialLinks` object (github, x, linkedin, telegram)
- Indexed by: `by_auth_user_id`, `by_username`

**cities**:
- `name`, `slug`, `shortSlug`, `country`, `countryCode`, `region`
- `latitude`, `longitude`, `image` (optional hero image)
- `visitCount` (cached count updated by background job)
- Indexed by: `by_short_slug`, `by_slug`, `by_country`, `by_region`, `by_visit_count`

**visits**:
- `userId` (Id<'users'>), `cityId` (Id<'cities'>)
- `startDate`, `endDate` (Unix timestamps in milliseconds)
- `notes` (optional), `isPrivate` (boolean)
- Indexed by: `by_user_id`, `by_city_id`, `by_user_and_city`, `by_start_date`, `by_city_and_start`

## File Structure

```
convex/
  ├── _generated/       # Auto-generated types (DO NOT EDIT)
  ├── auth.config.ts    # Better-Auth configuration
  ├── auth.ts           # Better-Auth instance with Google OAuth
  ├── convex.config.ts  # App-level Convex config
  ├── http.ts           # HTTP router for auth endpoints
  ├── schema.ts         # Database schema (users, cities, visits)
  ├── cities.ts         # City queries and mutations
  ├── users.ts          # User profile queries and mutations
  └── visits.ts         # Visit tracking queries and mutations

src/
  ├── components/
  │   ├── animated-background.tsx  # Framer Motion backgrounds
  │   ├── animated-trees.tsx       # Decorative animations
  │   ├── city-card.tsx            # City display component
  │   ├── page-transition.tsx      # Page navigation transitions
  │   ├── route-loading-bar.tsx    # Loading progress bar
  │   ├── auth/                    # Authentication components
  │   └── ui/                      # shadcn/ui components
  │       ├── loading-dots.tsx     # Pulsating dots loader
  │       └── [other components]
  ├── lib/
  │   ├── animations.ts            # Framer Motion variants
  │   ├── auth-client.ts           # Better-Auth client
  │   ├── auth-server.ts           # Server-side auth
  │   └── utils.ts                 # Utility functions
  ├── routes/                      # TanStack Router file-based routes
  │   ├── __root.tsx               # Root layout with header
  │   ├── index.tsx                # Landing page with featured cities
  │   ├── discover.tsx             # City discovery page
  │   ├── settings.tsx             # User settings page
  │   ├── c/                       # City pages (/c/:shortSlug)
  │   │   └── $shortSlug.tsx
  │   └── u/                       # User profiles (/u/:username)
  │       └── $username.tsx
  ├── routeTree.gen.ts             # Auto-generated route tree
  ├── router.tsx                   # Router configuration
  ├── env.client.ts                # Client-side env validation (t3env)
  ├── env.server.ts                # Server-side env validation (t3env)
  └── styles/
      └── app.css                  # Tailwind v4 + Kirby-style theme

specs/                             # Feature specifications
  ├── 001-travel-tracking/         # Travel tracking feature spec
  └── 002-kirby-ui-refactor/       # UI refactor feature spec

public/                            # Static assets (favicons, etc.)
```

## Testing

This project uses a comprehensive testing setup for both unit and end-to-end testing.

### Unit Testing with Vitest

**Test Runner**: [Vitest](https://vitest.dev) v4+
**Testing Library**: [@testing-library/react](https://testing-library.com/react) v16+

**Available Commands**:
```bash
bun test              # Run unit tests
bun test:ui           # Run tests with UI
bun test:coverage     # Run tests with coverage report
```

**Test Files**: Place test files next to the code they test with `.test.ts` or `.test.tsx` extension.

**Example Test**:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '~/components/ui/button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

**Convex Testing**: Use `convex-test` package for testing Convex functions in isolation.

### End-to-End Testing with Playwright

**Test Runner**: [Playwright](https://playwright.dev) v1.56+

**Available Commands**:
```bash
bun test:e2e          # Run E2E tests
bun test:e2e:ui       # Run E2E tests with UI
```

**Test Files**: Place E2E tests in `tests/` or `e2e/` directory with `.spec.ts` extension.

**Example E2E Test**:
```tsx
import { test, expect } from '@playwright/test'

test('landing page displays featured cities', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /JRNY/i })).toBeVisible()
  await expect(page.locator('[data-testid="city-card"]')).toHaveCount(9)
})
```

**Setup**:
- Playwright browsers are installed via `bunx playwright install`
- Tests run in Chromium, Firefox, and WebKit by default
- Configured in `playwright.config.ts`

### Testing Best Practices

1. **Unit Tests**: Test individual components and utilities in isolation
2. **Integration Tests**: Test Convex functions with `convex-test`
3. **E2E Tests**: Test critical user flows (auth, recording visits, viewing profiles)
4. **Accessibility**: Use Testing Library queries that encourage accessible code
5. **Coverage**: Aim for >80% coverage on critical paths
6. **CI/CD**: Run tests in CI before merging PRs
