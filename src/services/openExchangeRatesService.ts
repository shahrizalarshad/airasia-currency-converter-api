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