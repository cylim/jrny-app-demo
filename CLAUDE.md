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

### Type Checking
```bash
npm run lint
```
Runs TypeScript compiler and ESLint. Note: This project uses strict TypeScript settings.

### Format Code
```bash
npm run format
```
Runs Prettier on all files.

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

## Architecture

### Frontend Architecture

- **Framework**: TanStack Start (SSR-capable React meta-framework)
- **Router**: TanStack Router with file-based routing
- **Styling**: Tailwind CSS v4 (note: using `@tailwindcss/vite` plugin)
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
- **Auth**: Better-Auth integrated via `@convex-dev/better-auth`
- **Database**: Convex's built-in transactional database
- **Functions**: Defined in `convex/` directory

**Convex Function Organization**:
- Public functions defined with `query`, `mutation`, `action`
- Internal functions use `internalQuery`, `internalMutation`, `internalAction`
- File-based routing: `convex/myFunctions.ts` → `api.myFunctions.functionName`

**Convex Configuration**:
- `convex/convex.config.ts`: Defines app-level config and registers Better-Auth
- `convex/auth.config.ts`: Better-Auth provider configuration
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

**Server-side** (Node.js/server only):
- `CONVEX_SITE_URL` (required): Convex site URL for Better-Auth server configuration
  - Example: `https://wary-bison-35.convex.cloud`
- `CONVEX_DEPLOYMENT` (required): Convex deployment identifier
  - Example: `dev:wary-bison-35`
  - Used by: Convex CLI for deployment management
- `SITE_URL` (required): Your application's URL
  - Example: `http://localhost:3000` (development) or `https://yourdomain.com` (production)
  - Used for: Better-Auth redirect URLs and CORS configuration

**Convex Functions**: The `convex/` directory runs in Convex's managed runtime (not your Node.js server). Convex functions access environment variables directly via `process.env` - they do NOT use the t3env schemas in `src/`. Example: `convex/auth.config.ts` uses `process.env.CONVEX_SITE_URL`.

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

### ESLint Configuration
- Uses both TanStack ESLint config and Convex ESLint plugin
- Convex `_generated` directory is globally ignored

### Styling
- Tailwind CSS v4 with Vite plugin (not PostCSS)
- Main styles in `src/styles/app.css`
- Dark mode support via `dark:` classes

## Common Pitfalls

1. **Missing Return Validators**: Always add `returns: v.null()` even for void functions
2. **Using .filter() Instead of Indexes**: Define indexes in schema and use `.withIndex()`
3. **Wrong Import for Convex Types**: Import `Id` and `Doc` from `convex/_generated/dataModel`, not elsewhere
4. **Mixing React Query and Convex Hooks**: This app uses both - `convexQuery()` for queries and `useMutation()` from `convex/react` for mutations
5. **Forgetting Node Directive**: Add `"use node";` to action files using Node.js APIs
6. **Environment Variable Validation**: All required env vars are validated at startup by t3env. If you add a new env var, make sure to add it to both `.env.local` AND the appropriate schema file (`env.client.ts` or `env.server.ts`)
7. **Router Context Type Safety**: The router context includes `queryClient`, `convexClient`, and `convexQueryClient`. TypeScript will infer these types automatically when using `Route.useRouteContext()`

## File Structure

```
convex/
  ├── _generated/       # Auto-generated types (DO NOT EDIT)
  ├── auth.config.ts    # Better-Auth configuration
  ├── convex.config.ts  # App-level Convex config
  ├── myFunctions.ts    # Example Convex functions
  └── schema.ts         # Database schema

src/
  ├── routes/           # TanStack Router file-based routes
  │   ├── __root.tsx    # Root layout with HTML structure
  │   ├── index.tsx     # Home page (/)
  │   └── anotherPage.tsx
  ├── routeTree.gen.ts  # Auto-generated route tree
  ├── router.tsx        # Router configuration
  ├── env.client.ts     # Client-side env validation (t3env)
  ├── env.server.ts     # Server-side env validation (t3env)
  └── styles/
      └── app.css       # Tailwind styles

public/               # Static assets (favicons, etc.)
```
