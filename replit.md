# replit.md

## Overview

This is a cloud services pricing calculator application built for WebberStop. Users can browse cloud service offerings (virtual machines, storage, networking) and build cost estimates by selecting services and quantities. The application features a step-by-step wizard interface for selecting services across categories, with a live summary panel showing the running total.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, React useState for local UI state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with React plugin

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (Calculator is the main page)
- Reusable UI components in `client/src/components/ui/` (shadcn/ui)
- Custom components in `client/src/components/` (ProductCard, CartSummary, SummaryPanel, etc.)
- Custom hooks in `client/src/hooks/` for data fetching and utilities

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Style**: RESTful JSON API
- **Server**: Node.js with HTTP server

The backend serves:
- Static files in production (built frontend)
- API routes for products, categories, and pricing data
- Vite dev server integration in development mode

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Migrations**: Drizzle Kit with `db:push` command

### External Data Integration
The application syncs pricing data from the WebberStop API:
- Fetches offerings from `https://portal.webberstop.com/backend/api`
- Requires `WEBBER_STOP_API_KEY` environment variable
- Includes fallback pricing data if API is unavailable
- Uses node-cron for scheduled price synchronization

### Shared Code
The `shared/` directory contains:
- `schema.ts`: Drizzle table definitions and Zod schemas for validation
- `routes.ts`: API contract definitions with typed paths and response schemas

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database for storing product/pricing data
- **Connection**: Via `DATABASE_URL` environment variable
- **Session Store**: connect-pg-simple for Express sessions

### External APIs
- **WebberStop API**: `https://portal.webberstop.com/backend/api`
  - Provides cloud service offerings and pricing
  - Requires API key authentication via `WEBBER_STOP_API_KEY`
  - Used to sync and update product catalog

### Key NPM Packages
- **UI**: Radix UI primitives, shadcn/ui components, Lucide icons
- **Data**: TanStack React Query, Drizzle ORM, Zod validation
- **Styling**: Tailwind CSS, class-variance-authority, clsx, tailwind-merge
- **Animation**: Framer Motion, embla-carousel-react
- **Server**: Express, node-cron for scheduled tasks

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `WEBBER_STOP_API_KEY`: API key for WebberStop pricing service