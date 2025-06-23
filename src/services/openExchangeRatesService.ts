import axios from 'axios';

const OER_API_KEY = process.env.OPEN_EXCHANGE_RATES_API_KEY;
const OER_BASE_URL = process.env.OER_BASE_URL || 'https://openexchangerates.org/api';

interface OERLatestResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: { [key: string]: number };
}

interface OERCurrenciesResponse {
  [key: string]: string;
}

interface OERConvertResponse {
  disclaimer: string;
  license: string;
  request: {
    query: string;
    amount: number;
    from: string;
    to: string;
  };
  meta: {
    timestamp: number;
    rate: number;
  };
  response: number;
}

interface OERUsageResponse {
  status: number;
  data: {
    app_id: string;
    status: string;
    plan: {
      name: string;
      quota: string;
      update_frequency: string;
      features: {
        base: boolean;
        symbols: boolean;
        experimental: boolean;
        time_series: boolean;
        convert: boolean;
      };
    };
    usage: {
      requests: number;
      requests_quota: number;
      requests_remaining: number;
      days_elapsed: number;
      days_remaining: number;
      daily_average: number;
    };
  };
}

interface OERErrorResponse {
  error: boolean;
  status: number;
  message: string;
  description: string;
}

export async function fetchLatestRates(): Promise<{ [key: string]: number }> {
  if (!OER_API_KEY) {
    console.error("Missing Open Exchange Rates API Key in environment variables");
    throw new Error("OPEN_EXCHANGE_RATES_API_KEY is required but not configured");
  }

  try {
    const response = await axios.get<OERLatestResponse>(
      `${OER_BASE_URL}/latest.json?app_id=${OER_API_KEY}`,
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Currency-Converter-App/1.0'
        }
      }
    );

    if (!response.data.rates) {
      throw new Error("Invalid response format: missing rates data");
    }

    return response.data.rates;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios-specific errors
      if (error.response) {
        // Server responded with error status
        const errorData = error.response.data as OERErrorResponse;
        console.error("OER API Error:", {
          status: error.response.status,
          message: errorData.message || error.message,
          description: errorData.description
        });
        
        if (error.response.status === 401) {
          throw new Error("Invalid API key or unauthorized access to Open Exchange Rates");
        } else if (error.response.status === 429) {
          throw new Error("Rate limit exceeded for Open Exchange Rates API");
        } else if (error.response.status >= 500) {
          throw new Error("Open Exchange Rates service is temporarily unavailable");
        }
        
        throw new Error(`Open Exchange Rates API error: ${errorData.message || error.message}`);
      } else if (error.request) {
        // Request was made but no response received
        console.error("Network error when fetching rates:", error.message);
        throw new Error("Unable to connect to Open Exchange Rates service");
      }
    }
    
    // Generic error handling
    console.error("Unexpected error fetching latest rates:", error);
    throw new Error("Failed to fetch exchange rates");
  }
}

export async function fetchHistoricalRates(date: string): Promise<{ [key: string]: number }> {
  if (!OER_API_KEY) {
    throw new Error("OPEN_EXCHANGE_RATES_API_KEY is required but not configured");
  }

  try {
    const response = await axios.get<OERLatestResponse>(
      `${OER_BASE_URL}/historical/${date}.json?app_id=${OER_API_KEY}`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Currency-Converter-App/1.0'
        }
      }
    );

    return response.data.rates;
  } catch (error) {
    console.error("Error fetching historical rates:", error);
    throw new Error("Failed to fetch historical exchange rates");
  }
}

/**
 * Fetch all supported currencies with their full names
 * Based on /currencies.json endpoint from OER API documentation
 */
export async function fetchSupportedCurrencies(): Promise<{ [key: string]: string }> {
  if (!OER_API_KEY) {
    throw new Error("OPEN_EXCHANGE_RATES_API_KEY is required but not configured");
  }

  try {
    const response = await axios.get<OERCurrenciesResponse>(
      `${OER_BASE_URL}/currencies.json?app_id=${OER_API_KEY}`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Currency-Converter-App/1.0'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching supported currencies:", error);
    throw new Error("Failed to fetch supported currencies");
  }
}

/**
 * Open Exchange Rates API Plan Information
 * 
 * Your current Free plan includes:
 * ✅ /latest.json - Latest exchange rates (all 170 currencies)
 * ✅ /historical/YYYY-MM-DD.json - Historical rates  
 * ✅ /currencies.json - Official currency names
 * ✅ /usage.json - API usage statistics
 * ✅ 1,000 requests per month
 * ✅ Hourly rate updates
 * 
 * Paid plan features (not available on Free):
 * ❌ /convert - Direct conversion endpoint
 * ❌ 'base' parameter - Change base currency from USD
 * ❌ 'symbols' parameter - Request specific currencies only
 * ❌ /time-series.json - Time series data
 * ❌ HTTPS support (Free plan uses HTTPS anyway)
 * ❌ Higher request limits
 * 
 * Your app works perfectly with the Free plan since:
 * - You get all 170 currencies in each request
 * - Manual conversion calculation is very accurate
 * - 1,000 requests/month is sufficient for moderate usage
 */

/**
 * Get API usage statistics
 * Useful for monitoring quota and rate limits
 */
export async function getUsageStats(): Promise<OERUsageResponse['data']> {
  if (!OER_API_KEY) {
    throw new Error("OPEN_EXCHANGE_RATES_API_KEY is required but not configured");
  }

  try {
    const response = await axios.get<OERUsageResponse>(
      `${OER_BASE_URL}/usage.json?app_id=${OER_API_KEY}`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Currency-Converter-App/1.0'
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    throw new Error("Failed to fetch API usage statistics");
  }
}

/**
 * Note: The 'symbols' parameter for fetching specific currencies
 * is only available on paid plans, not on the Free plan
 * 
 * Free plan always returns all available currency rates (~170 currencies)
 * which is actually beneficial for your app since you support all currencies
 */ 