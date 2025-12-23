# Quick Start Guide - WebberStop Pricing Calculator

## Prerequisites

Before running the application, ensure you have:
- **Node.js** v20.x or higher
- **PostgreSQL** database
- **npm** package manager

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Navigate to project directory
cd /Users/rahulbaweja/Documents/Docs/etc/COde/project-download

# Install all packages
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Minimum required variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/pricing_calculator
WEBBER_STOP_ADMIN_API_KEY=your_api_key_here

# For reCAPTCHA (get from https://www.google.com/recaptcha/admin)
RECAPTCHA_SECRET_KEY=your_secret_key
RECAPTCHA_SITE_KEY=your_site_key
```

### 3. Set Up Database

```bash
# Generate migrations from schema
npm run db:generate

# Run migrations
npm run db:migrate

# OR use push for quick development (not recommended for production)
npm run db:push
```

### 4. Start the Development Server

```bash
# Start in development mode with hot reload
npm run dev
```

You should see output like:
```
[10:30:15] [express] serving on port 5000
[10:30:15] [express] 🚀 Initializing pricing system...
[10:30:16] [express] ✓ Pricing system initialized
```

### 5. Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:5000
- **API Health Check:** http://localhost:5000/health
- **API Products:** http://localhost:5000/api/products

## Testing the Improvements

### 1. Test Health Check Endpoints

```bash
# Comprehensive health check
curl http://localhost:5000/health | jq

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-23T10:30:00.000Z",
  "uptime": 120,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "memory": {
      "used": 245,
      "total": 512,
      "percentage": 48
    }
  }
}

# Liveness check
curl http://localhost:5000/health/live

# Readiness check
curl http://localhost:5000/health/ready
```

### 2. Test Pagination

```bash
# Get first page of products
curl "http://localhost:5000/api/products?page=1&limit=10" | jq

# Filter by category
curl "http://localhost:5000/api/products?category=compute&limit=5" | jq

# Search products
curl "http://localhost:5000/api/products?search=ubuntu&limit=20" | jq
```

### 3. Test Rate Limiting

```bash
# This will eventually hit the rate limit after 100 requests in 15 minutes
for i in {1..105}; do
  echo "Request $i"
  curl http://localhost:5000/api/products
done

# After limit is reached, you'll see:
{
  "message": "Too many requests from this IP, please try again in 15 minutes."
}
```

### 4. Test Quote Creation (with reCAPTCHA)

**Note:** You need a valid reCAPTCHA token from the frontend. For testing without frontend:

```bash
# Skip reCAPTCHA in development by not setting RECAPTCHA_SECRET_KEY
# Or get a token from the frontend and use it here

curl -X POST http://localhost:5000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "vm-1",
        "serviceType": "vm",
        "serviceName": "Virtual Machine",
        "description": "Ubuntu 22.04, 4 vCPU, 8GB RAM",
        "hourlyPrice": 9.40,
        "monthlyPrice": 3440,
        "config": {}
      }
    ],
    "billingCycle": "monthly",
    "currency": "INR",
    "recaptchaToken": "test_token_in_dev"
  }' | jq
```

### 5. Run Unit Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage
```

Expected output:
```
✓ server/utils/pricing.test.ts (15 tests)
  ✓ Pricing Calculations (15)
    ✓ Hourly to Monthly conversion (2)
    ✓ Monthly to Yearly conversion (2)
    ✓ Veeam retention multipliers (1)
    ✓ Combined pricing calculations (3)
    ✓ Edge cases (3)

Test Files  1 passed (1)
     Tests  15 passed (15)
```

### 6. Check Logs

The application now uses structured logging. Watch the logs:

```bash
# Development mode - pretty printed logs
npm run dev

# You'll see logs like:
[10:30:15] INFO: Starting API sync from admin API
[10:30:16] INFO: Exchange rates updated
  rates: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0094 }
[10:30:17] WARN: reCAPTCHA verification skipped in development mode
```

## Frontend Usage

### 1. Create an Estimate

1. Open http://localhost:5000
2. Click "Create Estimate"
3. Select a region
4. Configure services:
   - Virtual Machine
   - Object Storage
   - Kubernetes
   - Veeam Backup
5. View your estimate in the sidebar
6. Click "Get Shareable Link" to create a quote

### 2. Load a Shared Quote

When you create a quote, you'll get a URL like:
```
http://localhost:5000/?quote=123e4567-e89b-12d3-a456-426614174000
```

Share this URL with others to show your estimate.

## Debugging

### Check if Server is Running

```bash
# Check if process is listening on port 5000
lsof -i :5000

# Or use curl
curl http://localhost:5000/health/live
```

### View Database Contents

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# List all products
SELECT COUNT(*) FROM products;

# List all quotes
SELECT id, billing_cycle, currency, created_at FROM quotes;

# Check for active advisory locks (distributed locks)
SELECT * FROM pg_locks WHERE locktype = 'advisory';
```

### Check Environment Variables

```bash
# Verify env vars are loaded
node -e "console.log(process.env.DATABASE_URL ? 'DB configured' : 'DB NOT configured')"
node -e "console.log(process.env.RECAPTCHA_SECRET_KEY ? 'reCAPTCHA configured' : 'reCAPTCHA NOT configured')"
```

## Production Deployment

### 1. Build the Application

```bash
npm run build
```

This creates a production bundle in `dist/`

### 2. Run Migrations

```bash
NODE_ENV=production npm run db:migrate
```

### 3. Start Production Server

```bash
NODE_ENV=production npm start
```

### 4. Set Up Monitoring

```bash
# Add to your monitoring system (e.g., UptimeRobot, Pingdom)
curl https://your-domain.com/health

# Set up alerts for:
# - status !== "healthy"
# - HTTP 503 responses
# - HTTP 429 (rate limit) spikes
```

## Troubleshooting

### Issue: "DATABASE_URL is not set"
**Solution:** Create `.env` file with `DATABASE_URL=...`

### Issue: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "Port 5000 already in use"
**Solution:** Change port in `.env`:
```env
PORT=3000
```

### Issue: "Migration failed"
**Solution:** Check database connection and permissions:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: "reCAPTCHA verification failed"
**Solution:** For development, unset `RECAPTCHA_SECRET_KEY` to skip verification

### Issue: "Too many requests" (429 error)
**Solution:** Rate limits are working! Wait 15 minutes or restart server in development

## Performance Monitoring

### Check API Response Times

```bash
# Using curl with timing
curl -w "\nTime: %{time_total}s\n" http://localhost:5000/api/products

# Expected: < 0.1s for most endpoints
```

### Monitor Memory Usage

```bash
# Check heap usage
curl http://localhost:5000/health | jq '.checks.memory'

# Expected: < 512MB
```

### Database Query Performance

```bash
# Enable query logging in PostgreSQL
# Add to postgresql.conf:
log_min_duration_statement = 100  # Log queries taking > 100ms

# Then watch logs:
tail -f /var/log/postgresql/postgresql.log
```

## Next Steps

1. ✅ Application is running
2. ✅ Tests are passing
3. ✅ Health checks are working
4. 📝 Review the IMPROVEMENTS.md for detailed documentation
5. 🔧 Customize rate limits if needed
6. 🚀 Deploy to production

## Common Commands Reference

```bash
# Development
npm run dev                 # Start dev server
npm test                    # Run tests
npm run test:ui             # Tests with UI
npm run check               # TypeScript check

# Database
npm run db:generate         # Generate migration
npm run db:migrate          # Run migrations
npm run db:push             # Push schema (dev only)

# Production
npm run build               # Build for production
npm start                   # Start production server

# Logs
npm run dev | pino-pretty   # Pretty logs (already default in dev)
```

## Support

- **Documentation:** See IMPROVEMENTS.md
- **Tests:** `npm test`
- **Health Check:** http://localhost:5000/health
- **Logs:** Check console output

---

**You're all set! The application should now be running with all improvements active.** 🚀
