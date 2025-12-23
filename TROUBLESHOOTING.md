# Troubleshooting Guide

## Error: ECONNREFUSED (PostgreSQL not running)

**Error Message:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** PostgreSQL database is not running

**Solutions:**

### Option 1: Using Homebrew (Recommended)
```bash
# Install PostgreSQL if not installed
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create the database
createdb pricing_calculator

# Verify it's running
psql -l
```

### Option 2: Using PostgreSQL.app
1. Download from https://postgresapp.com/
2. Install and open PostgreSQL.app
3. Click "Initialize" to create a new server
4. Create database:
```bash
psql -h localhost
CREATE DATABASE pricing_calculator;
\q
```

### Option 3: Using Docker
```bash
# Run PostgreSQL in Docker
docker run --name postgres-pricing \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pricing_calculator \
  -p 5432:5432 \
  -d postgres:16

# Verify it's running
docker ps
```

### Set DATABASE_URL

After starting PostgreSQL, update your `.env` file:

```bash
# For local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pricing_calculator

# For Docker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pricing_calculator

# For PostgreSQL.app
DATABASE_URL=postgresql://localhost:5432/pricing_calculator
```

---

## Error: ENOTSUP (Socket binding issue)

**Error Message:**
```
Error: listen ENOTSUP: operation not supported on socket 0.0.0.0:5000
```

**Cause:** Node.js v25 doesn't support `reusePort: true` option on macOS

**Solution:** ✅ **ALREADY FIXED** in `server/index.ts`

The code has been updated from:
```typescript
httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, callback);
```

To:
```typescript
httpServer.listen(port, "0.0.0.0", callback);
```

---

## Complete Setup Steps

### 1. Start PostgreSQL

```bash
# Using Homebrew
brew services start postgresql@16

# OR using Docker
docker run --name postgres-pricing \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pricing_calculator \
  -p 5432:5432 \
  -d postgres:16
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE pricing_calculator;

# Exit
\q
```

### 3. Set Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pricing_calculator
NODE_ENV=development
PORT=5000
```

### 4. Run Migrations

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

You should see:
```
🚀 Initializing pricing system...
📡 Starting API sync from admin API...
💾 Total products from API: 0
⚠️  API pricing data limited, using comprehensive fallback data
✓ Pricing system initialized
[10:30:15] [express] serving on port 5000
```

### 6. Open Browser

Navigate to: http://localhost:5000

---

## Common Issues

### Issue: "DATABASE_URL is not set"

**Solution:**
```bash
# Create .env file
cp .env.example .env

# Edit and add:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pricing_calculator
```

### Issue: "database 'pricing_calculator' does not exist"

**Solution:**
```bash
# Create the database
createdb pricing_calculator

# OR using psql
psql postgres -c "CREATE DATABASE pricing_calculator;"
```

### Issue: "port 5000 already in use"

**Solution:**
```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# OR change port in .env
PORT=3000
```

### Issue: "role 'postgres' does not exist"

**Solution:**
```bash
# Create postgres user
createuser -s postgres

# Set password
psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### Issue: "peer authentication failed"

**Solution:**

Edit PostgreSQL config (`/usr/local/var/postgres/pg_hba.conf` or similar):

Change this line:
```
local   all             all                                     peer
```

To:
```
local   all             all                                     trust
```

Restart PostgreSQL:
```bash
brew services restart postgresql@16
```

---

## Verification Steps

### Check PostgreSQL is Running

```bash
# Check if PostgreSQL process is running
ps aux | grep postgres

# Test connection
psql -h localhost -U postgres -d pricing_calculator -c "SELECT 1;"

# Check port
lsof -i :5432
```

### Check Application is Running

```bash
# Check if app is listening
lsof -i :5000

# Test health endpoint
curl http://localhost:5000/health

# Test API
curl http://localhost:5000/api/products
```

### Check Database Has Data

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Count products
SELECT COUNT(*) FROM products;

# Exit
\q
```

---

## Quick Commands Reference

```bash
# PostgreSQL
brew services start postgresql@16      # Start PostgreSQL
brew services stop postgresql@16       # Stop PostgreSQL
brew services restart postgresql@16    # Restart PostgreSQL
psql postgres                          # Connect to PostgreSQL
createdb pricing_calculator            # Create database
dropdb pricing_calculator              # Delete database

# Application
npm install                            # Install dependencies
npm run dev                            # Start development
npm run build                          # Build for production
npm start                              # Start production
npm test                               # Run tests
npm run db:push                        # Push database schema
npm run db:generate                    # Generate migration
npm run db:migrate                     # Run migration

# Debugging
lsof -i :5000                          # Check what's on port 5000
lsof -i :5432                          # Check what's on port 5432
ps aux | grep postgres                 # Find PostgreSQL process
ps aux | grep node                     # Find Node process
```

---

## Success Indicators

When everything is working, you should see:

### Terminal Output
```
🚀 Initializing pricing system...
📡 Starting API sync from admin API...
💾 Total products from API: 0
⚠️  API pricing data limited, using comprehensive fallback data
✓ Pricing system initialized
[10:30:15] [express] serving on port 5000
```

### Browser
- Navigate to http://localhost:5000
- See WebberStop Pricing Calculator
- Click "Create Estimate"
- See services available

### Health Check
```bash
curl http://localhost:5000/health

# Should return:
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 120,
  "checks": {
    "database": { "status": "up", "responseTime": 15 },
    "memory": { ... }
  }
}
```

---

## Still Having Issues?

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

### Check Full Error Stack

Look at the complete error message, not just the first line.

### Check PostgreSQL Logs

```bash
# Homebrew
tail -f /usr/local/var/log/postgres.log

# PostgreSQL.app
tail -f ~/Library/Application\ Support/Postgres/var-16/postgresql.log
```

### Get Help

1. Check this troubleshooting guide
2. Review QUICKSTART.md
3. Check the error logs
4. Verify all environment variables
5. Test database connection separately

---

## Clean Slate (Nuclear Option)

If nothing works, start fresh:

```bash
# Stop everything
brew services stop postgresql@16
pkill -f node

# Drop and recreate database
dropdb pricing_calculator
createdb pricing_calculator

# Clean node modules
rm -rf node_modules package-lock.json
npm install

# Clean .env
rm .env
cp .env.example .env
# Edit .env with correct values

# Push schema
npm run db:push

# Start fresh
npm run dev
```

---

*Last updated: December 23, 2024*
