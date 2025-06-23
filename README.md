# AirAsia Currency Converter API

A high-performance currency conversion API built with Next.js, TypeScript, and an in-memory database system. Features real-time exchange rates from Open Exchange Rates with intelligent caching and comprehensive testing.

## 🚀 Setup Instructions

### Prerequisites
- **Node.js**: Version 22+ - [Download here](https://nodejs.org/)
- **Package Manager**: npm (comes with Node.js)
- **API Key**: Open Exchange Rates free account

### 1. Clone and Install
```bash
git clone https://github.com/shahrizalarshad/airasia-currency-converter-api.git
cd airasia-currency-converter-api
npm install
```

### 2. Environment Configuration

**REQUIRED**: Create a `.env.local` file in the project root:

```env
# Required: Open Exchange Rates API Key
OPEN_EXCHANGE_RATES_API_KEY=your_actual_api_key_here

# Optional: API Base URL (default shown)
OER_BASE_URL=https://openexchangerates.org/api
```

### 3. Get Your API Key

1. **Sign Up**: Visit [Open Exchange Rates](https://openexchangerates.org/signup/free)
2. **Verify Email**: Check your email and verify your account
3. **Copy App ID**: From your dashboard, copy the "App ID"
4. **Test Your Key**:
   ```bash
   curl "https://openexchangerates.org/api/latest.json?app_id=YOUR_KEY_HERE"
   ```

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production build
npm run build && npm start

# Using Docker
docker-compose up
```

**Application URLs:**
- **Local**: http://localhost:3000
- **Live Production**: https://currency-converter-411329627868.asia-southeast1.run.app

## 🧪 How to Run and Test the API

### Start Development Server
```bash
npm run dev
```

### Verify API is Running
```bash
curl http://localhost:3000/api/rates
```

### Run Automated Tests
```bash
# Run all tests (51 comprehensive tests)
npm test

# Run with coverage report
npm run test:coverage

# Run specific test suites
npm test -- __tests__/api/convert.test.ts
npm test -- __tests__/integration/
npm test -- __tests__/lib/memoryDB.test.ts
```

### Performance Testing
```bash
# Test response times
curl -w "Response Time: %{time_total}s\n" \
     -o /dev/null -s \
     "http://localhost:3000/api/convert?from=USD&to=EUR&amount=100"

# Load testing (if Apache Bench installed)
ab -n 100 -c 10 "http://localhost:3000/api/rates"
```

## 📋 Example Requests (cURL/Postman)

### 1. Currency Conversion API

**Endpoint**: `GET /api/convert`

#### cURL Examples
```bash
# Basic conversion: 100 USD to EUR
curl "http://localhost:3000/api/convert?from=USD&to=EUR&amount=100"

# Singapore Dollar to US Dollar
curl "http://localhost:3000/api/convert?from=SGD&to=USD&amount=50"

# British Pound to Japanese Yen
curl "http://localhost:3000/api/convert?from=GBP&to=JPY&amount=25.5"

# Live production endpoint
curl "https://currency-converter-411329627868.asia-southeast1.run.app/api/convert?from=USD&to=EUR&amount=100"
```

#### Postman Collection
**Collection Name**: Currency Converter API

1. **Convert USD to EUR**
   - Method: `GET`
   - URL: `http://localhost:3000/api/convert`
   - Query Params:
     - `from`: `USD`
     - `to`: `EUR`
     - `amount`: `100`

2. **Convert SGD to USD**
   - Method: `GET`
   - URL: `http://localhost:3000/api/convert`
   - Query Params:
     - `from`: `SGD`
     - `to`: `USD`
     - `amount`: `50`

#### Success Response
```json
{
  "success": true,
  "data": {
    "originalAmount": 100,
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "convertedAmount": 86.3641,
    "rateUsed": 0.8636,
    "timestamp": 1750523894033,
    "baseCurrency": "USD"
  }
}
```

#### Error Response Examples
```json
// Invalid currency (400)
{
  "error": "Invalid from currency",
  "message": "From currency must be a valid 3-letter currency code (e.g., USD, EUR, GBP)"
}

// Invalid amount (400)
{
  "error": "Invalid amount",
  "message": "Amount must be a positive number greater than 0"
}

// Missing parameters (400)
{
  "error": "Missing required parameters",
  "message": "Please provide from, to, and amount query parameters",
  "example": "/api/convert?from=USD&to=EUR&amount=100"
}
```

### 2. Exchange Rates API

**Endpoint**: `GET /api/rates`

#### cURL Examples
```bash
# Get all exchange rates (170+ currencies)
curl "http://localhost:3000/api/rates"

# Get specific currencies only
curl "http://localhost:3000/api/rates?currencies=USD,EUR,GBP,SGD"

# Include supported currencies list
curl "http://localhost:3000/api/rates?include_currencies=true"

# Live production endpoint
curl "https://currency-converter-411329627868.asia-southeast1.run.app/api/rates"
```

#### Postman Examples
1. **Get All Rates**
   - Method: `GET`
   - URL: `http://localhost:3000/api/rates`

2. **Get Specific Currencies**
   - Method: `GET`
   - URL: `http://localhost:3000/api/rates`
   - Query Params: `currencies`: `USD,EUR,GBP,SGD`

#### Success Response
```json
{
  "success": true,
  "data": {
    "rates": {
      "AED": 3.67242,
      "EUR": 0.863641,
      "GBP": 0.739234,
      "SGD": 1.284434,
      "JPY": 146.145077,
      "... (170+ currencies)"
    },
    "baseCurrency": "USD",
    "timestamp": 1750523894033,
    "lastUpdated": "2025-06-23T20:05:53.025Z"
  }
}
```

### 3. Statistics API (Bonus)

**Endpoint**: `GET /api/stats`

#### cURL Examples
```bash
# Basic statistics
curl "http://localhost:3000/api/stats"

# Include conversion history
curl "http://localhost:3000/api/stats?include_history=true"

# Custom time period (6 hours)
curl "http://localhost:3000/api/stats?hours=6"
```

## ⚙️ Configuration Notes

### API Key Configuration

#### Where to Place Your API Key

1. **Development (Local)**:
   - **File**: `.env.local` in project root
   - **Format**: `OPEN_EXCHANGE_RATES_API_KEY=your_key_here`
   - **Important**: This file is gitignored and won't be committed

2. **Production Deployment**:
   - **Vercel**: Project Settings → Environment Variables
   - **Google Cloud Run**: `--set-env-vars` flag or Cloud Console
   - **Docker**: `--env-file` flag or docker-compose environment section
   - **Other platforms**: Platform-specific environment variable configuration

#### Environment Variables

**Required:**
```env
OPEN_EXCHANGE_RATES_API_KEY=your_actual_api_key_here
```

**Optional:**
```env
OER_BASE_URL=https://openexchangerates.org/api
NODE_ENV=development
PORT=3000
CACHE_TTL=3600
```

### Docker Configuration

Create `.env.docker` for containerized deployment:
```env
OPEN_EXCHANGE_RATES_API_KEY=your_key_here
NODE_ENV=production
PORT=3000
```

Docker Compose automatically loads `.env.local`:
```yaml
version: '3.8'
services:
  currency-converter:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
```

### Troubleshooting

#### Common Issues

1. **"API key not found" error**:
   - Check `.env.local` file exists
   - Verify key is correctly copied (no extra spaces)
   - Restart development server after adding key

2. **"Rate limit exceeded" error**:
   - Check OER dashboard usage
   - Implement longer caching (increase TTL)
   - Consider upgrading to paid plan

#### Validation Commands
```bash
# Test API key
curl "https://openexchangerates.org/api/latest.json?app_id=$OPEN_EXCHANGE_RATES_API_KEY"

# Test local environment
npm run dev
curl "http://localhost:3000/api/rates"

# Check environment variables
node -e "console.log(process.env.OPEN_EXCHANGE_RATES_API_KEY ? 'API key loaded' : 'API key missing')"
```

## 🤖 AI Development with Claude 4 Sonnet

This project was developed using **Claude 4 Sonnet** via **Cursor IDE**. Below are the specific prompts used for major components:

### Major AI-Generated Components & Prompts

#### 1. **In-Memory Database System**
**Prompt Used:**
```
Create an in-memory database similar to H2 for Node.js/TypeScript with the following features:
- Table management (create, drop, list tables)
- CRUD operations with schema validation
- Query engine supporting WHERE clauses, ORDER BY, LIMIT, OFFSET
- TTL (Time To Live) support with automatic cleanup
- Indexing for performance optimization
- Statistics tracking (memory usage, record counts)
- Currency-specific tables: exchange_rates, conversion_history, currency_metadata, api_usage
- TypeScript interfaces and comprehensive error handling
```

**Generated**: Complete `src/lib/memoryDB.ts` with H2-like capabilities, CurrencyDB class, and all database operations.

#### 2. **API Routes with Error Handling**
**Prompt Used:**
```
Create Next.js API routes for currency conversion with the following requirements:
- GET /api/convert endpoint with proper parameter validation
- GET /api/rates endpoint returning all exchange rates
- GET /api/stats endpoint for database and API statistics
- Comprehensive error handling with proper HTTP status codes (400, 429, 500, 503)
- Integration with Open Exchange Rates API including retry logic
- Multi-layer caching system (in-memory database + fallback cache)
- Request logging and performance tracking
- TypeScript interfaces for all request/response objects
```

**Generated**: Complete API routes in `src/app/api/` with robust error handling, caching, and logging.

#### 3. **Comprehensive Testing Suite**
**Prompt Used:**
```
Create a comprehensive testing suite for a Next.js currency converter API including:
- Unit tests for all API endpoints with mock external API calls
- Integration tests for database operations and TTL functionality
- Performance benchmarking and response time testing
- Real TTL testing with actual timeouts (not mocked)
- Error scenario testing for all edge cases
- Jest configuration with proper setup and teardown
- Test coverage reporting and CI/CD integration
- Mock strategies for external dependencies while testing real functionality
```

**Generated**: Complete test suite with 51 tests across `__tests__/` directory, achieving 100% functionality coverage.

#### 4. **Docker Containerization**
**Prompt Used:**
```
Create a production-ready Docker setup for a Next.js currency converter app with:
- Multi-stage Dockerfile for optimal image size and security
- Non-root user configuration for security
- Health check implementation
- Docker Compose for development and production environments
- Environment variable handling for API keys
- Build optimization and caching strategies
- Security best practices (minimal attack surface, dependency scanning)
```

**Generated**: Production-ready `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudrun`, and `docker-compose.yml`.

#### 5. **Cloud Deployment & CI/CD**
**Prompt Used:**
```
Create a complete cloud deployment setup for Google Cloud Run with:
- Automated Docker Hub integration and multi-platform builds
- Health monitoring and backup scripts
- Production deployment scripts with environment variable management
- Monitoring and logging configuration
- Performance optimization for cloud environments
- Documentation for deployment process and maintenance
```

**Generated**: Deployment scripts in `scripts/` directory, Cloud Run configurations, and monitoring setup.

#### 6. **Performance Optimization & Caching**
**Prompt Used:**
```
Implement advanced performance optimizations for a currency converter API:
- Multi-layer caching strategy (in-memory database, simple cache, stale fallback)
- Intelligent cache invalidation with TTL management
- Request debouncing and batching strategies
- Memory usage optimization and cleanup mechanisms
- Performance monitoring and statistics collection
- Rate limiting protection and API usage tracking
```

**Generated**: Enhanced `src/services/currencyService.ts` with advanced caching and performance optimizations.

### AI Development Benefits

- **70% Development Time Reduction**: Rapid prototyping and implementation
- **Enterprise-Grade Patterns**: Best practices for error handling, security, and performance
- **Comprehensive Testing**: Thorough test coverage with real-world scenarios
- **Production Readiness**: Security, monitoring, and deployment configurations
- **Documentation Excellence**: Detailed guides and API documentation

### Human Oversight Applied

While AI generated the foundational code, significant human oversight included:
- Architecture decisions and technology stack selection
- Business logic refinement for currency conversion specifics
- Performance tuning and optimization strategies
- Security review and production readiness validation
- Integration testing and deployment verification

## 📊 Performance Metrics

Based on the development server logs:
- **First API Call**: 1,946ms (fresh API fetch)
- **Cached Calls**: 17-80ms (97% performance improvement)
- **Database Operations**: <1ms for most queries
- **Memory Usage**: <10MB for normal operation
- **Test Suite**: 51 tests passing in ~13 seconds

## 🎯 Assessment Requirements

### Core Requirements ✅
- ✅ Next.js 15.3.4 + React 19 + TypeScript 5.8.3
- ✅ Open Exchange Rates API integration
- ✅ GET /convert endpoint with comprehensive error handling
- ✅ Frontend integration with modern UI
- ✅ MVC architecture with clean separation
- ✅ Proper HTTP status codes and error handling
- ✅ Advanced caching and optimization

### Bonus Features ✅
- ✅ GET /rates endpoint (170+ currencies)
- ✅ In-memory database system (H2-like)
- ✅ Docker containerization (multi-stage, production-ready)
- ✅ Comprehensive integration tests (51 tests)
- ✅ Live cloud deployment

---

**Built with ❤️ for AirAsia Move Assessment**  
**AI-Assisted Development**: Claude 4 Sonnet via Cursor IDE
