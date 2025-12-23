# GitHub Setup & Deployment Guide

Step-by-step guide to upload your code to GitHub and deploy to a server.

## Part 1: Upload to GitHub

### Step 1: Create GitHub Repository

1. Go to https://github.com
2. Click the **"+"** icon → **"New repository"**
3. Fill in the details:
   - **Repository name**: `webberstop-pricing-calculator`
   - **Description**: "Cloud pricing calculator with React, Express, and PostgreSQL"
   - **Visibility**: Public or Private
   - **DO NOT** initialize with README (we have one)
4. Click **"Create repository"**

### Step 2: Initialize Git (if not already done)

Open Terminal in your project directory:

```bash
cd /Users/rahulbaweja/Documents/Docs/etc/COde/project-download

# Initialize git (if not done)
git init

# Check if already initialized
git status
```

### Step 3: Add Files to Git

```bash
# Add all files
git add .

# Check what will be committed
git status

# Commit the files
git commit -m "Initial commit: WebberStop Pricing Calculator with all improvements"
```

### Step 4: Connect to GitHub

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/webberstop-pricing-calculator.git

# Or if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/webberstop-pricing-calculator.git

# Verify remote
git remote -v
```

### Step 5: Push to GitHub

```bash
# Push to main branch
git branch -M main
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your password)

#### Creating a Personal Access Token

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a note: "Pricing Calculator Deploy"
4. Select scopes: `repo` (all)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

### Step 6: Verify Upload

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/webberstop-pricing-calculator`
2. You should see all your files
3. Verify README.md is displayed

---

## Part 2: Deploy to Server

### Option A: Deploy to Your Own VPS (Ubuntu Server)

#### Prerequisites
- A server with Ubuntu 22.04 LTS
- SSH access to the server
- Root or sudo privileges

#### Step 1: Connect to Server

```bash
# Replace with your server IP
ssh root@YOUR_SERVER_IP

# Or with a specific user
ssh ubuntu@YOUR_SERVER_IP
```

#### Step 2: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node --version  # Should show v20.x.x

# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (web server)
sudo apt install -y nginx
```

#### Step 3: Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Run these commands in PostgreSQL prompt:
CREATE DATABASE pricing_calculator;
CREATE USER pricingapp WITH ENCRYPTED PASSWORD 'ChangeThisPassword123!';
GRANT ALL PRIVILEGES ON DATABASE pricing_calculator TO pricingapp;
ALTER DATABASE pricing_calculator OWNER TO pricingapp;

# Exit PostgreSQL
\q
```

#### Step 4: Clone Repository

```bash
# Create application user
sudo useradd -m -s /bin/bash pricingapp
sudo su - pricingapp

# Clone your repository
git clone https://github.com/YOUR_USERNAME/webberstop-pricing-calculator.git
cd webberstop-pricing-calculator
```

#### Step 5: Configure Environment

```bash
# Create .env file
nano .env
```

Paste this (update with your values):

```env
DATABASE_URL=postgresql://pricingapp:ChangeThisPassword123!@localhost:5432/pricing_calculator
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
WEBBER_STOP_ADMIN_API_KEY=your_api_key_here
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

Save: `Ctrl+X`, then `Y`, then `Enter`

#### Step 6: Install and Build

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Build application
npm run build
```

#### Step 7: Start with PM2

```bash
# Start application
pm2 start dist/index.cjs --name pricing-calculator

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Copy and run the command it outputs
```

#### Step 8: Configure Nginx

Exit from pricingapp user:

```bash
exit
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/pricing-calculator
```

Paste this (replace `your-domain.com` with your domain or IP):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pricing-calculator /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 9: Install SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts
```

#### Step 10: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
```

#### Step 11: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs pricing-calculator --lines 50

# Test health endpoint
curl http://localhost:5000/health

# Test from outside
curl https://your-domain.com/health
```

🎉 **Your application is now live at https://your-domain.com!**

---

### Option B: Deploy to Railway (Easiest)

#### Step 1: Sign up for Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Authorize Railway to access your repositories

#### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose `webberstop-pricing-calculator`
4. Railway will detect it's a Node.js app

#### Step 3: Add PostgreSQL

1. Click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will create a database and provide DATABASE_URL

#### Step 4: Add Environment Variables

1. Click on your service
2. Go to **"Variables"** tab
3. Add these variables:
   ```
   NODE_ENV=production
   PORT=5000
   WEBBER_STOP_ADMIN_API_KEY=your_key
   RECAPTCHA_SECRET_KEY=your_key
   ```
4. DATABASE_URL is automatically added

#### Step 5: Configure Build

1. Go to **"Settings"** tab
2. Add build command: `npm run build`
3. Add start command: `npm start`
4. Add install command: `npm install`

#### Step 6: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Railway will provide a URL: `your-app.railway.app`

#### Step 7: Add Custom Domain (Optional)

1. Go to **"Settings"**
2. Click **"Generate Domain"** or add your custom domain
3. Follow DNS instructions if using custom domain

🎉 **Your application is now live on Railway!**

---

### Option C: Deploy to Render

#### Step 1: Sign up for Render

1. Go to https://render.com
2. Sign in with GitHub

#### Step 2: Create Web Service

1. Click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub repository
4. Select `webberstop-pricing-calculator`

#### Step 3: Configure Service

Fill in these settings:
- **Name**: `pricing-calculator`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free or Starter

#### Step 4: Add PostgreSQL

1. Go back to dashboard
2. Click **"New +"**
3. Select **"PostgreSQL"**
4. Choose Free plan
5. Create database

#### Step 5: Add Environment Variables

In your web service settings, add:

```env
DATABASE_URL=<copy from PostgreSQL service>
NODE_ENV=production
PORT=5000
WEBBER_STOP_ADMIN_API_KEY=your_key
RECAPTCHA_SECRET_KEY=your_key
```

#### Step 6: Deploy

1. Click **"Create Web Service"**
2. Render will automatically deploy
3. You'll get a URL: `pricing-calculator.onrender.com`

🎉 **Your application is now live on Render!**

---

### Option D: Deploy to Vercel + Neon

#### Step 1: Setup Neon Database

1. Go to https://neon.tech
2. Sign up with GitHub
3. Create new project
4. Copy the connection string

#### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"Import Project"**
4. Select your repository
5. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### Step 3: Add Environment Variables

```env
DATABASE_URL=<your_neon_connection_string>
NODE_ENV=production
WEBBER_STOP_ADMIN_API_KEY=your_key
RECAPTCHA_SECRET_KEY=your_key
```

#### Step 4: Deploy

Click **"Deploy"**

🎉 **Your application is now live on Vercel!**

---

## Updating Your Deployment

### Update GitHub

```bash
# Make changes to your code
git add .
git commit -m "Description of changes"
git push origin main
```

### Update Server (VPS)

```bash
# SSH into server
ssh pricingapp@your-server-ip

# Go to project directory
cd ~/webberstop-pricing-calculator

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Run migrations if needed
npm run db:migrate

# Rebuild
npm run build

# Restart PM2
pm2 restart pricing-calculator

# Check logs
pm2 logs pricing-calculator
```

### Update Railway/Render/Vercel

1. Push to GitHub
2. Automatic deployment will trigger
3. Wait for deployment to complete

---

## Monitoring Your Application

### Check Application Status

```bash
# PM2 status
pm2 status

# View logs
pm2 logs pricing-calculator

# Monitor in real-time
pm2 monit
```

### Check Health

```bash
# Local
curl http://localhost:5000/health

# Remote
curl https://your-domain.com/health
```

### Database Status

```bash
# Connect to database
psql -U pricingapp -d pricing_calculator

# Check size
SELECT pg_size_pretty(pg_database_size('pricing_calculator'));

# Count products
SELECT COUNT(*) FROM products;

# Exit
\q
```

---

## Backup Your Data

### Manual Backup

```bash
# Backup database
pg_dump -U pricingapp pricing_calculator > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql
```

### Automated Backups

See [DEPLOYMENT.md](./DEPLOYMENT.md) for automated backup setup.

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs pricing-calculator

# Check if port is in use
lsof -i :5000

# Restart application
pm2 restart pricing-calculator
```

### Database connection failed

```bash
# Test connection
psql -U pricingapp -d pricing_calculator

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Domain not working

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Next Steps

1. ✅ Code uploaded to GitHub
2. ✅ Application deployed to server
3. ✅ SSL certificate installed
4. ✅ Health checks configured
5. 📝 Set up monitoring (optional)
6. 📝 Configure backups (recommended)
7. 📝 Set up domain name (if not done)

---

## Support

- **Deployment Issues**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Application Issues**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **API Documentation**: See [API.md](./API.md)

---

*Last updated: December 23, 2024*
