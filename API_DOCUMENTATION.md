# Currency Converter API Documentation

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Open Exchange Rates API Configuration
# Get your free API key from: https://openexchangerates.org/signup/free
OPEN_EXCHANGE_RATES_API_KEY=your_api_key_here

# Optional: Override the base URL (defaults to https://openexchangerates.org/api)
# OER_BASE_URL=https://openexchangerates.org/api
```

### 2. Getting Your API Key

1. Go to [Open Exchange Rates](https://openexchangerates.org/signup/free)
2. Sign up for a free account
3. Copy your API key from the dashboard
4. Add it to your `.env.local` file

### 3. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Currency Conversion

**Endpoint:** `GET /api/convert`

**Description:** Convert an amount from one currency to another.

**Query Parameters:**
- `from` (required): Source currency code (3-letter ISO code, e.g., "USD")
- `to` (required): Target currency code (3-letter ISO code, e.g., "EUR")
- `amount` (required): Amount to convert (positive number)

**Example Request:**
```
GET /api/convert?from=USD&to=EUR&amount=100
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "originalAmount": 100,
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "convertedAmount": 85.23,
    "rateUsed": 0.8523,
    "timestamp": 1703123456789,
    "baseCurrency": "USD"
  }
}
```

**Error Responses:**

400 Bad Request - Missing or invalid parameters:
```json
{
  "error": "Missing required parameters",
  "message": "Please provide from, to, and amount query parameters",
  "example": "/api/convert?from=USD&to=EUR&amount=100"
}
```

400 Bad Request - Unsupported currency:
```json
{
  "error": "Unsupported currency",
  "message": "Currency 'XYZ' is not supported or available"
}
```

### 2. Exchange Rates

**Endpoint:** `GET /api/rates`

**Description:** Get current exchange rates for all supported currencies.

**Query Parameters:**
- `currencies` (optional): Comma-separated list of currency codes to filter results
- `include_currencies` (optional): Set to "true" to include list of all supported currencies

**Example Request:**
```
GET /api/rates
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "rates": {
      "EUR": 0.8523,
      "GBP": 0.7832,
      "JPY": 110.25,
      "CAD": 1.2456
    },
    "baseCurrency": "USD",
    "timestamp": 1703123456789,
    "lastUpdated": "2023-12-21T10:30:56.789Z"
  }
}
```

**Filtered Request:**
```
GET /api/rates?currencies=EUR,GBP,JPY
```

**With Currency List:**
```
GET /api/rates?include_currencies=true
```

## Backend Architecture

### Directory Structure

```
src/
├── app/
│   └── api/
│       ├── convert/
│       │   └── route.ts          # Currency conversion endpoint
│       └── rates/
│           └── route.ts          # Exchange rates endpoint
├── components/                   # React components (for future UI)
├── lib/
│   └── cache.ts                 # In-memory caching with TTL
└── services/
    ├── currencyService.ts       # Business logic for conversions
    └── openExchangeRatesService.ts # API client for Open Exchange Rates
```

### Key Features

1. **Caching**: Exchange rates are cached for 1 hour to reduce API calls
2. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
3. **Validation**: Input validation for currency codes and amounts
4. **Rate Limiting**: Handles API rate limit errors gracefully
5. **TypeScript**: Full TypeScript support with proper type definitions

### Caching Strategy

- Exchange rates are cached in memory for 1 hour
- Cache key: `'latest_rates'`
- Automatic cache expiration and cleanup
- Falls back to fresh API call when cache is empty or expired

### Error Handling

The API handles various error scenarios:

- **400 Bad Request**: Invalid input parameters
- **401 Unauthorized**: Invalid API key
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server configuration issues
- **503 Service Unavailable**: External API temporarily unavailable

### Testing the API

You can test the endpoints using:

1. **Browser** (for GET requests):
   - `http://localhost:3000/api/rates`
   - `http://localhost:3000/api/convert?from=USD&to=EUR&amount=100`

2. **cURL**:
   ```bash
   # Get all rates
   curl "http://localhost:3000/api/rates"
   
   # Convert currency
   curl "http://localhost:3000/api/convert?from=USD&to=EUR&amount=100"
   
   # Get specific currencies
   curl "http://localhost:3000/api/rates?currencies=EUR,GBP,JPY"
   ```

3. **Postman/Insomnia**: Import these endpoints for testing

### Rate Limits

Free Open Exchange Rates plan includes:
- 1,000 requests per month
- Hourly rate updates
- 200+ currencies
- HTTPS access

For production use, consider upgrading to a paid plan for more requests and features.

## Next Steps

1. Set up your environment variables
2. Test the API endpoints
3. Build the frontend React components
4. Add additional features like historical rates or currency charts
5. Deploy to production with proper environment configuration 