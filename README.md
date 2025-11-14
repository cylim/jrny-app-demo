# JRNY - Journey Recording App

A real-time journey tracking application that allows users to record their travels, track time spent at locations, and discover who else is exploring the same cities.

**Live Demo**: [jrny-app-demo.cy.workers.dev](https://jrny-app-demo.cy.workers.dev)

## Overview

JRNY is a location-based social application designed for travelers, digital nomads, and anyone who wants to track their journeys and connect with others in the same location. Record your current position, log how long you stay at each place, and see fellow travelers who are sharing the same city experience.

## Features

### 🗺️ Location Tracking
- Record your current location in real-time
- Track multiple locations throughout your journey
- View your location history

### ⏱️ Time Tracking
- Log how long you stay at each location
- Automatic time calculation for location visits
- Historical time data for past locations

### 👥 Social Discovery
- See who else is currently in the same city as you
- Connect with fellow travelers and locals
- Real-time updates as people arrive and leave locations

### 🔒 Privacy & Authentication
- Secure authentication via Better-Auth
- Control your location sharing preferences
- Private journey mode available

### 📍 Smart Location Enrichment
- Automatic location data enrichment via Firecrawl
- Discover nearby attractions, restaurants, and points of interest
- Access travel guides and local information for your destinations
- Web-scraped content about cities and places you visit

### 💳 Premium Features
- Subscription plans powered by Autumn (Stripe integration)
- Unlock advanced journey analytics and insights
- Extended location history and data export
- Premium social features and priority support

## Tech Stack

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) - Full-stack React framework with SSR
- **Router**: [TanStack Router](https://tanstack.com/router) - Type-safe file-based routing
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) - Utility-first CSS framework
- **State Management**: [TanStack Query](https://tanstack.com/query) - Powerful data synchronization

### Backend
- **Backend**: [Convex](https://convex.dev) - Real-time backend-as-a-service
- **Authentication**: [Better-Auth](https://better-auth.com) - Modern authentication solution
- **Database**: Convex built-in transactional database with real-time sync

### Infrastructure
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com) - Global edge deployment
- **Error Monitoring**: [Sentry](https://sentry.io) - Full-stack error tracking and performance monitoring
- **Payments**: [Autumn](https://www.autumnpayments.com) + [Stripe](https://stripe.com) - Subscription and payment processing
- **Data Enrichment**: [Firecrawl](https://firecrawl.dev) - Web scraping for location information and travel content

### Developer Experience
- **Package Manager**: [Bun](https://bun.sh) - Fast JavaScript runtime and package manager
- **Language**: TypeScript with strict mode
- **Validation**: [Zod](https://zod.dev) - TypeScript-first schema validation
- **Environment**: [t3env](https://env.t3.gg) - Type-safe environment variables
- **Linting**: ESLint with TanStack and Convex configurations
- **Formatting**: Prettier
- **Code Review**: [CodeRabbit](https://coderabbit.ai) - AI-powered code review automation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.0+ (fast JavaScript runtime and package manager)
- [Convex](https://convex.dev) account (free tier available)
- [Cloudflare](https://cloudflare.com) account (for deployment)
- [Stripe](https://stripe.com) account (for payment features)
- [Firecrawl](https://firecrawl.dev) API key (for location enrichment)

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

   # Sentry (optional for development)
   VITE_SENTRY_DSN=your-sentry-dsn
   SENTRY_DSN=your-sentry-dsn

   # Firecrawl API (for location enrichment)
   FIRECRAWL_API_KEY=your-firecrawl-api-key

   # Stripe (for payments)
   STRIPE_SECRET_KEY=your-stripe-secret-key
   VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
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
- `bun run lint` - Run TypeScript and ESLint checks
- `bun run format` - Format code with Prettier
- `bun run deploy` - Deploy to Cloudflare Workers

### Project Structure

```
jrny-app-demo/
├── convex/              # Convex backend functions and schema
│   ├── auth.ts          # Authentication configuration
│   ├── schema.ts        # Database schema
│   └── myFunctions.ts   # Backend functions
├── src/
│   ├── routes/          # TanStack Router file-based routes
│   ├── env.client.ts    # Client-side environment validation
│   ├── env.server.ts    # Server-side environment validation
│   └── router.tsx       # Router configuration
├── public/              # Static assets
├── wrangler.jsonc       # Cloudflare Workers configuration
└── instrument.server.mjs # Sentry server-side instrumentation
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
- Session replay and performance monitoring with Sentry

### Error Tracking

Comprehensive error monitoring:
- Client-side error tracking with source maps
- Server-side error capture
- Session replay for debugging user issues
- Performance monitoring and traces

### Location Intelligence

Smart location data enrichment powered by Firecrawl:
- Automatic scraping of location information from the web
- Discover nearby points of interest, restaurants, and attractions
- Access curated travel guides and local tips
- Real-time updates on events and activities in your current city
- Enriched location profiles with photos, reviews, and recommendations

### Payment Processing

Seamless subscription management with Autumn + Stripe:
- Secure payment processing via Stripe
- Flexible subscription plans (free, premium, pro)
- Automatic billing and invoice generation
- Usage-based pricing for power users
- Payment method management
- Subscription upgrades and downgrades

### Code Quality

Automated code review with CodeRabbit:
- AI-powered code review on every pull request
- Catch bugs and security issues before deployment
- Consistent code quality across the team
- Automated suggestions for improvements
- Reduces manual code review time

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
- Payments by [Autumn](https://www.autumnpayments.com) + [Stripe](https://stripe.com)
- Location data enriched by [Firecrawl](https://firecrawl.dev)
- Code reviewed by [CodeRabbit](https://coderabbit.ai)

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Made for travelers, by travelers** ✈️ 🌍
