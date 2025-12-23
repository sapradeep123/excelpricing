# Production Deployment Guide

Complete guide to deploy WebberStop Pricing Calculator to production servers.

## Table of Contents
1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Application Deployment](#application-deployment)
4. [Platform-Specific Guides](#platform-specific-guides)
5. [Post-Deployment](#post-deployment)
6. [Maintenance](#maintenance)

---

## Server Requirements

### Minimum Specifications
- **CPU**: 2 vCPUs
- **RAM**: 2 GB
- **Disk**: 20 GB SSD
- **OS**: Ubuntu 22.04 LTS or similar
- **Network**: Public IP address

### Software Requirements
- Node.js v20 or higher
- PostgreSQL 16
- Nginx (for reverse proxy)
- PM2 (for process management)
- Git

---

## Initial Server Setup

### Step 1: Connect to Your Server

```bash
# SSH into your server
ssh root@your-server-ip

# Or with a key
ssh -i ~/.ssh/your-key.pem ubuntu@your-server-ip
```

### Step 2: Update System

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git build-essential
```

### Step 3: Install Node.js 20

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### Step 4: Install PostgreSQL 16

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install PostgreSQL 16
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version  # Should show 16.x
```

### Step 5: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE pricing_calculator;
CREATE USER pricingapp WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE pricing_calculator TO pricingapp;
ALTER DATABASE pricing_calculator OWNER TO pricingapp;

# Exit PostgreSQL
\q
```

### Step 6: Configure PostgreSQL for Remote Access (if needed)

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/16/main/postgresql.conf

# Find and change:
listen_addresses = 'localhost'  # Or '*' for all interfaces

# Edit authentication config
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add this line (adjust IP range as needed):
host    pricing_calculator    pricingapp    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 7: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs

# Verify installation
pm2 --version
```

### Step 8: Install Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
curl http://localhost  # Should show Nginx welcome page
```

### Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

---

## Application Deployment

### Step 10: Create Application User

```bash
# Create a dedicated user for the application
sudo useradd -m -s /bin/bash pricingapp
sudo usermod -aG sudo pricingapp

# Switch to application user
sudo su - pricingapp
```

### Step 11: Clone Repository

```bash
# Generate SSH key (if needed)
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # Add this to GitHub

# Clone repository
cd ~
git clone git@github.com:YOUR_USERNAME/webberstop-pricing-calculator.git
cd webberstop-pricing-calculator

# Or clone with HTTPS
git clone https://github.com/YOUR_USERNAME/webberstop-pricing-calculator.git
cd webberstop-pricing-calculator
```

### Step 12: Install Dependencies

```bash
# Install npm packages
npm install --production

# If you need dev dependencies for building:
npm install
```

### Step 13: Configure Environment Variables

```bash
# Create production .env file
nano .env
```

Add this content (replace with your actual values):

```env
# Database Configuration
DATABASE_URL=postgresql://pricingapp:your_secure_password_here@localhost:5432/pricing_calculator

# WebberStop API
WEBBER_STOP_ADMIN_API_KEY=your_webber_stop_api_key

# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Server Configuration
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_random_session_secret_here
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### Step 14: Run Database Migrations

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly
npm run db:push
```

### Step 15: Build Application

```bash
# Build the application
npm run build

# This creates the dist/ folder with compiled code
```

### Step 16: Test Application

```bash
# Start the application in production mode
NODE_ENV=production npm start

# In another terminal, test it:
curl http://localhost:5000/health

# Should return:
# {"status":"healthy", ...}

# Stop the test server (Ctrl+C)
```

### Step 17: Configure PM2

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add this content:

```javascript
module.exports = {
  apps: [{
    name: 'pricing-calculator',
    script: './dist/index.cjs',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100
  }]
};
```

Save and exit.

### Step 18: Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Check status
pm2 status

# View logs
pm2 logs pricing-calculator

# Monitor in real-time
pm2 monit
```

### Step 19: Configure Nginx Reverse Proxy

```bash
# Exit from pricingapp user
exit

# Back as root/sudo user
sudo nano /etc/nginx/sites-available/pricing-calculator
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logs
    access_log /var/log/nginx/pricing-calculator.access.log;
    error_log /var/log/nginx/pricing-calculator.error.log;

    # Client upload size
    client_max_body_size 10M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no caching)
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

Save and exit.

### Step 20: Enable Nginx Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pricing-calculator /etc/nginx/sites-enabled/

# Remove default site if needed
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 21: Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Test automatic renewal
sudo certbot renew --dry-run
```

### Step 22: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# Test health endpoint
curl https://your-domain.com/health

# Test application
curl https://your-domain.com/api/products
```

---

## Platform-Specific Guides

### Deploy to AWS EC2

```bash
# 1. Launch EC2 instance
# - Choose Ubuntu 22.04 LTS
# - Instance type: t3.small or larger
# - Security group: Allow ports 22, 80, 443

# 2. Connect to instance
ssh -i "your-key.pem" ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# 3. Follow steps 2-22 above

# 4. (Optional) Setup RDS for PostgreSQL
# - Create PostgreSQL RDS instance
# - Update DATABASE_URL in .env with RDS endpoint
```

### Deploy to DigitalOcean Droplet

```bash
# 1. Create Droplet
# - Choose Ubuntu 22.04
# - Size: Basic ($12/month or higher)
# - Add SSH key

# 2. Connect to droplet
ssh root@your-droplet-ip

# 3. Follow steps 2-22 above

# 4. (Optional) Use Managed Database
# - Create PostgreSQL cluster
# - Update DATABASE_URL in .env
```

### Deploy to Linode

```bash
# 1. Create Linode
# - Distribution: Ubuntu 22.04 LTS
# - Plan: Shared CPU (2GB RAM minimum)

# 2. Connect to Linode
ssh root@your-linode-ip

# 3. Follow steps 2-22 above
```

### Deploy to Railway (Simplified)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Deploy
railway up

# 6. Set environment variables
railway variables set RECAPTCHA_SECRET_KEY=your_key
railway variables set WEBBER_STOP_ADMIN_API_KEY=your_key

# 7. Generate domain
railway domain
```

### Deploy to Render (Simplified)

1. Connect GitHub repository to Render
2. Create Web Service
3. Add PostgreSQL database
4. Set environment variables
5. Deploy automatically on git push

### Deploy to Vercel + Neon (Serverless)

1. Push to GitHub
2. Import to Vercel
3. Create Neon PostgreSQL database
4. Set environment variables in Vercel
5. Deploy

---

## Post-Deployment

### Monitoring

```bash
# Setup PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor application
pm2 monit

# Check logs
pm2 logs pricing-calculator --lines 100
```

### Backup Setup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-pricing-db.sh
```

Add:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/pricingapp/backups"
DB_NAME="pricing_calculator"
DB_USER="pricingapp"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/pricing_${DATE}.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "pricing_*.sql.gz" -mtime +7 -delete

echo "Backup completed: pricing_${DATE}.sql.gz"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-pricing-db.sh
```

Setup cron job:

```bash
sudo crontab -e

# Add this line (backup daily at 2 AM):
0 2 * * * /usr/local/bin/backup-pricing-db.sh >> /var/log/pricing-backup.log 2>&1
```

### Setup Monitoring Tools

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor resources
htop                    # CPU and memory
iotop                   # Disk I/O
nethogs                 # Network usage
pm2 monit              # PM2 dashboard
```

---

## Maintenance

### Updating Application

```bash
# SSH into server
ssh pricingapp@your-server-ip

# Navigate to application directory
cd ~/webberstop-pricing-calculator

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --production

# Run migrations (if any)
npm run db:migrate

# Rebuild application
npm run build

# Restart PM2
pm2 restart pricing-calculator

# Check logs
pm2 logs pricing-calculator --lines 50
```

### Database Maintenance

```bash
# Connect to database
sudo -u postgres psql pricing_calculator

# Analyze and vacuum
ANALYZE;
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('pricing_calculator'));

# Exit
\q
```

### Log Rotation

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/pricing-calculator
```

Add:

```
/home/pricingapp/webberstop-pricing-calculator/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 pricingapp pricingapp
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Checks

```bash
# Create health check script
nano /usr/local/bin/check-pricing-health.sh
```

Add:

```bash
#!/bin/bash
HEALTH_URL="http://localhost:5000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed: HTTP $RESPONSE"
    pm2 restart pricing-calculator
    echo "Application restarted"
else
    echo "Health check passed"
fi
```

Make executable and add to cron:

```bash
chmod +x /usr/local/bin/check-pricing-health.sh

# Add to crontab (check every 5 minutes)
*/5 * * * * /usr/local/bin/check-pricing-health.sh >> /var/log/pricing-health.log 2>&1
```

---

## Troubleshooting Production Issues

### Application won't start

```bash
# Check PM2 logs
pm2 logs pricing-calculator

# Check for errors
pm2 describe pricing-calculator

# Try starting manually
cd ~/webberstop-pricing-calculator
NODE_ENV=production npm start
```

### Database connection issues

```bash
# Test database connection
psql -U pricingapp -d pricing_calculator -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### High memory usage

```bash
# Check memory
free -h

# Restart PM2 instances
pm2 restart pricing-calculator

# Reduce instances in ecosystem.config.js
nano ~/webberstop-pricing-calculator/ecosystem.config.js
# Change instances: 2 to instances: 1
pm2 restart pricing-calculator
```

### SSL certificate issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Test Nginx config
sudo nginx -t
sudo systemctl reload nginx
```

---

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key-based authentication only
- [ ] PostgreSQL not exposed to internet
- [ ] Strong database passwords
- [ ] Environment variables secured
- [ ] SSL/TLS certificate installed
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] reCAPTCHA configured
- [ ] Security headers in Nginx
- [ ] Application running as non-root user
- [ ] Latest security patches installed

---

## Performance Optimization

### Enable Nginx Caching

```bash
sudo nano /etc/nginx/sites-available/pricing-calculator
```

Add:

```nginx
# Add to http block or before server block
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

# Inside location block for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    proxy_cache api_cache;
    proxy_cache_valid 200 7d;
    proxy_cache_use_stale error timeout invalid_header updating;
    add_header X-Cache-Status $upstream_cache_status;
    proxy_pass http://localhost:5000;
}
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
```

---

## Support

For deployment issues:
1. Check logs: `pm2 logs pricing-calculator`
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Check health endpoint: `curl http://localhost:5000/health`

---

*Last updated: December 23, 2024*
