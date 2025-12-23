# API Documentation

Complete API reference for the WebberStop Pricing Calculator.

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints are public. Admin endpoints (sync) are protected by rate limiting.

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Quote Creation | 10 requests | 1 hour |
| Sync | 5 requests | 1 hour |
| Exchange Rates | 30 requests | 15 minutes |

## Response Format

All responses are JSON:

```json
{
  "data": {},
  "error": "Optional error message"
}
```

---

## Endpoints

### Health Check

#### GET /health
Comprehensive health check with database and memory status.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2024-12-23T10:30:00.000Z",
  "uptime": 3600,
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
```

#### GET /health/live
Kubernetes liveness probe endpoint.

**Response** (200 OK):
```json
{
  "status": "alive"
}
```

#### GET /health/ready
Kubernetes readiness probe endpoint.

**Response** (200 OK):
```json
{
  "status": "ready",
  "database": {
    "status": "up",
    "responseTime": 12
  }
}
```

---

### Products

#### GET /api/products
List all products with pagination.

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `category` (string, optional): Filter by category
- `search` (string, optional): Search in name and description

**Example**:
```bash
GET /api/products?page=1&limit=20&category=compute&search=ubuntu
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "BP_4vC-8GB",
      "description": "4 vCPU, 8.0 GB RAM",
      "category": "compute",
      "subcategory": "Basic Compute Plans",
      "unit": "per month",
      "priceHourly": "9.40",
      "priceMonthly": "3440.00",
      "priceYearly": "37152.00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

#### GET /api/products/:id
Get single product by ID.

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "BP_4vC-8GB",
  "description": "4 vCPU, 8.0 GB RAM",
  "category": "compute",
  "subcategory": "Basic Compute Plans",
  "unit": "per month",
  "priceHourly": "9.40",
  "priceMonthly": "3440.00",
  "priceYearly": "37152.00"
}
```

**Response** (404 Not Found):
```json
{
  "message": "Product not found"
}
```

#### GET /api/products/category/:category
Filter products by category.

**Categories**:
- `compute`
- `storage`
- `networking-ip`
- `networking-vpc`
- `networking-lb`
- `k8s-compute`
- `k8s-version`
- `k8s-ha`
- `object-storage`
- `veeam`
- `os`
- `region`
- `addon`
- `addon-windows`

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "BP_4vC-8GB",
    "category": "compute",
    ...
  }
]
```

#### GET /api/categories
List all available categories.

**Response** (200 OK):
```json
[
  {
    "id": "compute",
    "name": "Compute",
    "icon": "💻",
    "description": "Virtual machines for running your applications"
  },
  {
    "id": "storage",
    "name": "Storage",
    "icon": "💾",
    "description": "Block and object storage for your data"
  }
]
```

---

### Exchange Rates

#### GET /api/exchange-rates
Get current exchange rates (cached for 30 minutes).

**Response** (200 OK):
```json
{
  "base": "INR",
  "rates": {
    "INR": 1,
    "USD": 0.012,
    "EUR": 0.011,
    "GBP": 0.0094
  },
  "updatedAt": "2024-12-23T10:30:00.000Z"
}
```

---

### Quotes

#### POST /api/quotes
Create a shareable quote (protected by reCAPTCHA and rate limiting).

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "items": [
    {
      "id": "vm-1",
      "serviceType": "vm",
      "serviceName": "Virtual Machine",
      "description": "Ubuntu 22.04, 4 vCPU, 8GB RAM",
      "hourlyPrice": 9.40,
      "monthlyPrice": 3440,
      "config": {
        "region": "Mumbai",
        "os": {...},
        "compute": {...}
      }
    }
  ],
  "billingCycle": "monthly",
  "currency": "INR",
  "recaptchaToken": "03AGdBq26..."
}
```

**Validation Rules**:
- `items`: Array, min 1 item, max 50 items
- `billingCycle`: Enum ["hourly", "monthly", "yearly"]
- `currency`: Enum ["INR", "USD", "EUR", "GBP"]
- `recaptchaToken`: Required string

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2025-01-23T10:30:00.000Z"
}
```

**Response** (400 Bad Request):
```json
{
  "message": "At least one item is required",
  "errors": [...]
}
```

**Response** (429 Too Many Requests):
```json
{
  "message": "Too many quote creation requests. Please try again in an hour."
}
```

#### GET /api/quotes/:id
Retrieve a quote by UUID.

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [...],
  "billingCycle": "monthly",
  "currency": "INR",
  "createdAt": "2024-12-23T10:30:00.000Z",
  "expiresAt": "2025-01-23T10:30:00.000Z"
}
```

**Response** (404 Not Found):
```json
{
  "message": "Quote not found or expired"
}
```

---

### Admin Endpoints

#### POST /api/sync
Manually trigger price synchronization from WebberStop API.

**Rate Limit**: 5 requests per hour

**Response** (200 OK):
```json
{
  "status": "Sync completed",
  "totalProducts": 145,
  "categories": {
    "compute": {
      "count": 14,
      "names": ["BP_4vC-8GB", ...]
    },
    "storage": {
      "count": 5,
      "names": ["50 GB Block Storage", ...]
    }
  }
}
```

**Response** (429 Too Many Requests):
```json
{
  "message": "Too many sync requests. Please try again in an hour."
}
```

#### GET /api/debug/status
Get debug information about current data status.

**Response** (200 OK):
```json
{
  "status": "Using fallback data",
  "note": "The WebberStop API is not accessible",
  "apiEndpoint": "https://portal.webberstop.com/backend/api",
  "totalProducts": 145,
  "categories": {...},
  "products": [...]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid request",
  "errors": [
    {
      "field": "billingCycle",
      "message": "Invalid enum value"
    }
  ]
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "message": "Too many requests. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

### 503 Service Unavailable
```json
{
  "message": "Service temporarily unavailable"
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Fetch products
const response = await fetch('https://api.example.com/api/products?page=1&limit=20');
const data = await response.json();

// Create quote
const quote = await fetch('https://api.example.com/api/quotes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    items: [...],
    billingCycle: 'monthly',
    currency: 'INR',
    recaptchaToken: token
  })
});

const result = await quote.json();
```

### cURL

```bash
# Get products
curl https://api.example.com/api/products?page=1&limit=20

# Get health
curl https://api.example.com/health

# Create quote
curl -X POST https://api.example.com/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "billingCycle": "monthly",
    "currency": "INR",
    "recaptchaToken": "token"
  }'
```

### Python

```python
import requests

# Get products
response = requests.get('https://api.example.com/api/products', params={
    'page': 1,
    'limit': 20,
    'category': 'compute'
})
products = response.json()

# Create quote
quote = requests.post('https://api.example.com/api/quotes', json={
    'items': [...],
    'billingCycle': 'monthly',
    'currency': 'INR',
    'recaptchaToken': 'token'
})
result = quote.json()
```

---

## Webhooks

Currently not implemented. Future versions may include webhook support for:
- Quote creation notifications
- Price update notifications
- System alerts

---

## Changelog

### v2.0.0 (2024-12-23)
- Added pagination to products endpoint
- Added reCAPTCHA protection
- Added rate limiting
- Added health check endpoints
- Improved error responses

### v1.0.0 (Initial Release)
- Basic CRUD operations
- Quote creation
- Multi-currency support

---

*Last updated: December 23, 2024*
