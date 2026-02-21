# Excel Pricing Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

> 🚀 A full-stack cloud pricing calculator built with React, Express, and PostgreSQL. Perfect for SaaS businesses, cloud providers, and e-commerce platforms looking to implement dynamic pricing with multi-currency support.

**Keywords:** pricing-calculator, excel-pricing, cloud-pricing, saas-pricing, multi-currency, react-express, postgresql-drizzle, webberstop, pricing-engine, quote-generator

---

## 📚 Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

- 🔐 **Security**: reCAPTCHA v3, rate limiting, input sanitization
- ⚡ **Performance**: Database UPSERT, pagination, lazy loading, React.memo
- 📊 **Multi-currency**: INR, USD, EUR, GBP with live exchange rates
- 💾 **Database**: PostgreSQL with Drizzle ORM
- 🧪 **Testing**: Unit tests with Vitest
- 📝 **Logging**: Structured logging with Pino
- 🏥 **Monitoring**: Health check endpoints
- 🔄 **Migrations**: Safe database schema migrations

---

## 🚀 Quick Start

### Prerequisites

- Node.js v20 or higher
- PostgreSQL 16 or Docker

### Local Development

`ash
# Clone the repository
git clone https://github.com/sapradeep123/excelpricing.git
cd excelpricing

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
`

Open http://localhost:5000

---

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Detailed setup guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[API.md](./API.md)** - API documentation
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Technical improvements documentation
- **[FRONTEND_OPTIMIZATIONS.md](./FRONTEND_OPTIMIZATIONS.md)** - React optimization guide

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI Framework |
| TypeScript | 5.0+ | Type Safety |
| TanStack Query | Latest | State Management |
| Tailwind CSS | Latest | Styling |
| shadcn/ui | Latest | UI Components |
| Vite | Latest | Build Tool |
| Vitest | Latest | Testing |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | Latest | API Framework |
| PostgreSQL | 16 | Database |
| Drizzle ORM | Latest | Database ORM |
| Pino | Latest | Logging |
| Node-cron | Latest | Scheduled Tasks |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| PM2 | Process Management |
| GitHub Actions | CI/CD (ready) |

---

## 🔌 API Endpoints

### Health Checks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Comprehensive health check |
| GET | /health/live | Liveness probe |
| GET | /health/ready | Readiness probe |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products (with pagination) |
| GET | /api/products/:id | Get single product |
| GET | /api/products/category/:category | Filter by category |
| GET | /api/categories | List all categories |

### Quotes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/quotes | Create shareable quote (with reCAPTCHA) |
| GET | /api/quotes/:id | Get quote by ID |

### Exchange Rates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/exchange-rates | Get current exchange rates |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/sync | Trigger manual price sync (rate limited) |
| GET | /api/debug/status | Debug information |

---

## 📜 Available Scripts

`ash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run check        # TypeScript check
npm run db:push      # Push schema to database
npm run db:generate  # Generate migration
npm run db:migrate   # Run migrations
`

---

## 🔒 Security Features

- ✅ Google reCAPTCHA v3 protection
- ✅ Rate limiting on all endpoints
- ✅ Input sanitization (XSS prevention)
- ✅ Strong Zod validation
- ✅ Environment variables for secrets
- ✅ Distributed locking for sync operations

---

## ⚡ Performance Optimizations

- ✅ Database UPSERT (68% faster)
- ✅ Pagination for large datasets
- ✅ React.memo for components
- ✅ Lazy loading for configurators
- ✅ 60% smaller initial bundle
- ✅ Structured logging with Pino

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contributing Steps:
1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- UI Components from [shadcn/ui](https://ui.shadcn.com/)
- Database ORM by [Drizzle](https://orm.drizzle.team/)

---

## 📞 Support

- 🐛 [Report Bug](https://github.com/sapradeep123/excelpricing/issues)
- 💡 [Request Feature](https://github.com/sapradeep123/excelpricing/issues)
- 💬 [Discussions](https://github.com/sapradeep123/excelpricing/discussions)

---

## 🔗 Related Projects

- [WebberStop](https://webberstop.com) - Cloud services platform
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI component library

---

**⭐ Star this repository if you find it helpful!**

Built with ❤️ for the open-source community
