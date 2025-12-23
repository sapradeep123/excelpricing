# WebberStop Pricing Calculator

A full-stack cloud pricing calculator built with React, Express, and PostgreSQL.

## Features

- 🔐 **Security**: reCAPTCHA v3, rate limiting, input sanitization
- ⚡ **Performance**: Database UPSERT, pagination, lazy loading, React.memo
- 📊 **Multi-currency**: INR, USD, EUR, GBP with live exchange rates
- 💾 **Database**: PostgreSQL with Drizzle ORM
- 🧪 **Testing**: Unit tests with Vitest
- 📝 **Logging**: Structured logging with Pino
- 🏥 **Monitoring**: Health check endpoints
- 🔄 **Migrations**: Safe database schema migrations

## Quick Start

### Prerequisites

- Node.js v20 or higher
- PostgreSQL 16 or Docker

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/webberstop-pricing-calculator.git
cd webberstop-pricing-calculator

# Install dependencies
npm install

# Start PostgreSQL (choose one):
# Option 1: Docker (recommended)
docker run -d --name postgres-pricing \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pricing_calculator \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  postgres:16

# Option 2: Local PostgreSQL
brew install postgresql@16
brew services start postgresql@16
createdb pricing_calculator

# Create environment file
cp .env.example .env
# Edit .env with your values

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Open http://localhost:5000

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Detailed setup guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Technical improvements documentation
- **[FRONTEND_OPTIMIZATIONS.md](./FRONTEND_OPTIMIZATIONS.md)** - React optimization guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[API.md](./API.md)** - API documentation

## Tech Stack

### Frontend
- React 18 + TypeScript
- TanStack Query for state management
- Tailwind CSS + shadcn/ui
- Wouter for routing
- Vite for build

### Backend
- Express.js + TypeScript
- PostgreSQL with Drizzle ORM
- Pino for logging
- Node-cron for scheduled tasks

### DevOps
- Docker support
- Health check endpoints
- Database migrations
- Rate limiting

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run check        # TypeScript check
npm run db:push      # Push schema to database
npm run db:generate  # Generate migration
npm run db:migrate   # Run migrations
```

## Environment Variables

See `.env.example` for all available options.

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `WEBBER_STOP_ADMIN_API_KEY` - WebberStop API key (optional)
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)

## API Endpoints

### Health Checks
- `GET /health` - Comprehensive health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Products
- `GET /api/products` - List products (with pagination)
- `GET /api/products/:id` - Get single product
- `GET /api/products/category/:category` - Filter by category
- `GET /api/categories` - List all categories

### Quotes
- `POST /api/quotes` - Create shareable quote (with reCAPTCHA)
- `GET /api/quotes/:id` - Get quote by ID

### Exchange Rates
- `GET /api/exchange-rates` - Get current exchange rates

### Admin
- `POST /api/sync` - Trigger manual price sync (rate limited)
- `GET /api/debug/status` - Debug information

## Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage
```

## Security Features

- ✅ Google reCAPTCHA v3 protection
- ✅ Rate limiting on all endpoints
- ✅ Input sanitization (XSS prevention)
- ✅ Strong Zod validation
- ✅ Environment variables for secrets
- ✅ Distributed locking for sync operations

## Performance Optimizations

- ✅ Database UPSERT (68% faster)
- ✅ Pagination for large datasets
- ✅ React.memo for components
- ✅ Lazy loading for configurators
- ✅ 60% smaller initial bundle
- ✅ Structured logging

## License

MIT

## Support

For issues and questions:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review [QUICKSTART.md](./QUICKSTART.md)
- Create an issue on GitHub

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

Built with ❤️ for WebberStop
