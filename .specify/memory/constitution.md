<!--
SYNC IMPACT REPORT
==================
Version Change: 0.0.0 → 1.0.0
Rationale: Initial constitution creation with core principles

Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (5 principles)
  - Development Standards
  - Quality Gates
  - Governance

Removed Sections: N/A (initial creation)

Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Constitution Check section aligns with principles
  ✅ .specify/templates/spec-template.md - Success Criteria and Requirements align with principles
  ✅ .specify/templates/tasks-template.md - Task categorization includes testing, observability, performance tasks
  ✅ .claude/commands/*.md - No agent-specific references found, generic guidance maintained

Follow-up TODOs: None
-->

# JRNY Application Constitution

## Core Principles

### I. Type Safety & Validation (NON-NEGOTIABLE)

End-to-end type safety MUST be maintained across the entire application stack. Every boundary—database to backend, backend to frontend, frontend to user—MUST be protected by strong types and runtime validation.

**Rules**:
- All Convex functions MUST include both `args` and `returns` validators using Convex's validation library
- All environment variables MUST be validated using t3env with Zod schemas
- All API boundaries MUST validate inputs with Zod schemas
- TypeScript MUST be configured with strict mode enabled (`strict: true`)
- NO `any` types except in rare, documented edge cases where external untyped libraries require it
- All database schema changes MUST update generated types via `npx convex dev`

**Rationale**: The project integrates multiple systems (Convex backend, TanStack Start frontend, Cloudflare Workers deployment). Type safety prevents runtime errors, catches bugs at compile time, and enables confident refactoring. Runtime validation with t3env and Zod ensures environment configuration errors are caught at startup, not in production.

### II. Testing Standards

Tests are MANDATORY for critical paths and MUST follow the project's testing conventions. Tests provide confidence for refactoring, document expected behavior, and prevent regressions.

**Rules**:
- **Critical Path Coverage**: Authentication flows, payment processing, location tracking, and data persistence MUST have integration tests
- **Test-First for New Features**: When implementing new user-facing features, write integration tests BEFORE implementation where feasible
- **Database Queries**: All new Convex queries using `.withIndex()` MUST have at least one test verifying correct index usage and query results
- **Breaking Changes**: Any change to public APIs, database schema, or authentication flows MUST include tests verifying backward compatibility OR migration tests
- **Error Handling**: All error boundaries (React Error Boundaries, Sentry integration) MUST be validated with tests that trigger and verify error capture

**Test Organization**:
- Integration tests: `tests/integration/` - test complete user journeys
- Unit tests: `tests/unit/` - test isolated functions and components
- Contract tests: `tests/contract/` - verify API contracts between frontend and backend

**Rationale**: Given the app's distributed architecture (Convex backend, Cloudflare Workers frontend, Sentry monitoring, Stripe payments), manual testing is insufficient. Integration tests ensure all services work together. The app handles sensitive data (location, payments, user identity), making reliability non-negotiable.

### III. Performance & Observability

Performance MUST meet user expectations, and the system MUST provide visibility into errors, performance bottlenecks, and user behavior.

**Performance Targets**:
- **Initial Page Load**: Time to First Byte (TTFB) <200ms p95 via Cloudflare Workers edge deployment
- **API Response Time**: Convex queries <100ms p95 for simple reads, <500ms p95 for complex aggregations
- **Real-time Updates**: Location updates appear on other clients within 2 seconds via Convex's real-time subscriptions
- **Bundle Size**: Client JavaScript bundle <250KB gzipped after code splitting
- **Lighthouse Score**: Maintain >90 Performance score on mobile

**Observability Requirements**:
- **Sentry Integration**: ALL production deployments MUST have both client-side (`VITE_SENTRY_DSN`) and server-side (`SENTRY_DSN`) Sentry configured
- **Error Tracking**: React Error Boundaries MUST capture and report errors to Sentry with full component stack traces
- **Performance Monitoring**: Sentry performance traces MUST be enabled for TanStack Router page transitions (client) and SSR requests (server)
- **Session Replay**: Production MUST record 10% of normal sessions and 100% of error sessions for debugging
- **Console Logging**: Server-side `console.error()` and `console.warn()` MUST be captured by Sentry

**Rationale**: Users expect instant feedback when tracking their journeys. Cloudflare Workers' edge deployment provides low latency globally. Convex's real-time subscriptions enable collaborative features. Sentry provides full-stack visibility into errors and performance issues that would otherwise be invisible in a distributed system.

### IV. User Experience Consistency

The user interface MUST be consistent, accessible, and responsive across all devices and screen sizes. User interactions MUST provide clear feedback and handle loading/error states gracefully.

**Rules**:
- **Loading States**: All data fetching MUST show loading indicators using TanStack Query's `isLoading` state or Suspense boundaries
- **Error States**: All error conditions MUST display user-friendly error messages (not technical stack traces) via Error Boundaries
- **Optimistic Updates**: User actions that trigger mutations (e.g., adding a location) MUST provide optimistic UI updates for immediate feedback
- **Responsive Design**: All UI components MUST be fully functional on mobile (320px width) through desktop (1920px+ width) using Tailwind CSS responsive utilities
- **Accessibility**: Interactive elements MUST be keyboard-navigable and include appropriate ARIA labels
- **Real-time Feedback**: Location updates MUST show real-time presence indicators for other users in the same city

**Styling Conventions**:
- Use Tailwind CSS v4 utility classes (via `@tailwindcss/vite` plugin)
- Dark mode MUST be supported using Tailwind's `dark:` variant
- Consistent spacing using Tailwind's spacing scale (4, 8, 16, 24, 32, 48, 64px)
- Typography MUST use semantic HTML (`h1`, `h2`, `p`) with Tailwind typography utilities

**Rationale**: JRNY is a social location-tracking app used by travelers on mobile devices in varying network conditions. Consistent UX builds trust. Loading/error states prevent confusion. Optimistic updates make the app feel fast even on slow connections. Real-time updates are core to the social discovery feature.

### V. Security & Privacy

User data—especially location and payment information—MUST be protected at all levels. Security MUST be layered: authentication, authorization, input validation, and secure deployment.

**Rules**:
- **Authentication**: ALL authenticated routes MUST verify user identity via Better-Auth's `ctx.auth.getUserIdentity()` in Convex functions
- **Authorization**: Users MUST only access their own data unless explicitly shared (e.g., public location sharing)
- **Input Validation**: ALL user inputs MUST be validated with Zod schemas to prevent injection attacks
- **Secrets Management**: ALL secrets MUST be stored in environment variables, NEVER in code:
  - Client secrets: `VITE_*` variables (bundled into client code, suitable for public keys only)
  - Server secrets: Non-prefixed variables (server-only, for API keys and sensitive credentials)
  - Cloudflare Workers: Use `wrangler secret put` for production secrets
- **HTTPS Only**: ALL production traffic MUST use HTTPS (enforced by Cloudflare Workers)
- **CORS**: API MUST only accept requests from authorized origins (`SITE_URL`)
- **Payment Security**: ALL payment processing MUST use Stripe's secure APIs—NEVER store credit card data

**Privacy Rules**:
- Users MUST opt-in to location sharing
- Users MUST be able to delete their location history
- Users MUST control visibility of their presence to other users
- NO location data can be sold or shared with third parties

**Rationale**: Location data is highly sensitive. Payment data is regulated (PCI DSS). Better-Auth provides secure authentication, but authorization is the app's responsibility. Convex's security rules and backend validation provide defense in depth. Cloudflare Workers' HTTPS and Stripe's PCI-compliant APIs reduce attack surface.

## Development Standards

### Code Organization

**Frontend (`src/`)**:
- `routes/`: File-based routing via TanStack Router—one route per file
- `env.client.ts`: Client-side environment validation (t3env + Zod)
- `env.server.ts`: Server-side environment validation (t3env + Zod)
- `router.tsx`: Router configuration with Convex provider and query client setup
- `styles/app.css`: Tailwind CSS imports and global styles

**Backend (`convex/`)**:
- `schema.ts`: Database schema and indexes (SINGLE SOURCE OF TRUTH for data model)
- `auth.config.ts`: Better-Auth provider configuration
- `convex.config.ts`: App-level Convex config
- Function files: Organized by feature (e.g., `convex/locations.ts`, `convex/users.ts`)

**Testing (`tests/`)**:
- `contract/`: API contract tests
- `integration/`: End-to-end user journey tests
- `unit/`: Isolated function tests

### Convex Best Practices

**Query Optimization**:
- **ALWAYS define indexes** in `convex/schema.ts` for filtered queries—NEVER use `.filter()` in production
- Use `.withIndex()` for efficient queries
- Use `.unique()` for single-document lookups (throws if multiple found)
- Use `.order('desc')` to reverse default ascending `_creationTime` order

**Function Syntax**:
- ALWAYS use explicit `args` and `returns` validators
- Use `v.null()` for void functions
- Example:
  ```typescript
  export const getUser = query({
    args: { userId: v.id('users') },
    returns: v.union(v.object({ name: v.string(), email: v.string() }), v.null()),
    handler: async (ctx, args) => {
      return await ctx.db.get(args.userId);
    },
  });
  ```

**Actions**:
- Add `"use node";` directive for Node.js built-in modules
- Actions do NOT have `ctx.db` access—use `ctx.runQuery()` or `ctx.runMutation()`

**TypeScript Types**:
- Use `Id<'tableName'>` from `convex/_generated/dataModel` for document IDs
- Use `Doc<'tableName'>` for full document types

### Environment Variables

**Validation Required**:
- ALL environment variables MUST be declared in `env.client.ts` (client) or `env.server.ts` (server)
- Use Zod schemas with `.min(1)` for required non-empty strings
- Use `.optional()` for truly optional variables
- NEVER access `process.env` directly—import `clientEnv` or `serverEnv`

**Naming Conventions**:
- Client variables: `VITE_*` prefix (bundled into client code)
- Server variables: No prefix (server-only)

### Git & Deployment

**Branching**:
- Main branch: `main` (protected, requires PR approval)
- Feature branches: `###-feature-name` format for SpecKit compatibility

**Commit Messages**:
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`
- Include context: `feat(locations): add real-time presence tracking`

**Deployment Checklist**:
- ✅ Run `bun run lint` (TypeScript + ESLint)
- ✅ Run `bun run format` (Prettier)
- ✅ Verify all Wrangler secrets are set (`wrangler secret list`)
- ✅ Update `wrangler.jsonc` with production URLs
- ✅ Run `bun run build` to verify production build
- ✅ Deploy via `bun run deploy`
- ✅ Verify Sentry is receiving errors in production

## Quality Gates

### Pre-Commit Gates

1. **TypeScript Type Checking**: `tsc --noEmit` MUST pass
2. **ESLint**: `eslint . --ext ts,tsx` MUST pass with zero errors
3. **Prettier**: Code MUST be formatted via `prettier --write .`

### Pre-Merge Gates

1. **All Tests Pass**: Integration and unit tests MUST pass
2. **Type Safety**: No `any` types introduced (unless documented and justified)
3. **Environment Variables**: New env vars MUST be added to t3env schemas
4. **Database Schema**: Schema changes MUST include migration plan and NOT break existing data
5. **Performance**: No Lighthouse Performance score regressions >5 points
6. **Security**: No new dependencies with known vulnerabilities (`bun audit`)

### Post-Deployment Verification

1. **Sentry Health**: Verify error rate <1% of requests in Sentry dashboard
2. **Performance**: Verify p95 response times meet targets in Sentry Performance tab
3. **Real-time Updates**: Verify Convex subscriptions work in production
4. **Authentication**: Verify Better-Auth login/signup flows work

## Governance

### Constitution Authority

This constitution supersedes all other development practices. When conflicts arise between this constitution and other documentation, this constitution takes precedence.

### Amendment Process

1. **Proposal**: Open a GitHub issue with proposed amendment
2. **Discussion**: Team reviews and discusses implications
3. **Migration Plan**: If amendment requires code changes, document migration path
4. **Approval**: Requires consensus from project maintainers
5. **Versioning**: Update constitution version and last amended date
6. **Propagation**: Update dependent templates and documentation

### Versioning Policy

**Constitution versions follow semantic versioning**:
- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principles added or materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Compliance Review

- All pull requests MUST be reviewed against constitution principles
- Complex features (new auth flows, payment features, schema changes) MUST include constitution compliance checklist
- Quarterly reviews to ensure constitution remains aligned with project reality

### Complexity Justification

Any violation of constitution principles MUST be justified in pull request description with:
1. **Why Needed**: Specific technical requirement that cannot be met otherwise
2. **Alternatives Considered**: Why simpler approaches were insufficient
3. **Mitigation**: How violation risks are mitigated
4. **Approval**: Requires explicit maintainer approval

### Runtime Guidance

For additional runtime development guidance, consult `CLAUDE.md` in the repository root. That file provides Claude Code with detailed project setup, architecture, and Convex-specific guidelines.

**Version**: 1.0.0 | **Ratified**: 2025-11-14 | **Last Amended**: 2025-11-14
