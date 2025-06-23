import { fetchLatestRates } from './openExchangeRatesService';
import { getFromCache, setToCache } from '../lib/cache';
import { retryWithBackoff, isOnline, waitForOnline } from '../lib/retry';

const CACHE_KEY_LATEST_RATES = 'latest_rates';
const CACHE_TTL_HOURS = 1; // Cache rates for 1 hour

export interface ConversionResult {
  originalAmount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rateUsed: number;
  timestamp: number;
  baseCurrency: string;
}

export interface RatesResponse {
  rates: { [key: string]: number };
  timestamp: number;
  baseCurrency: string;
}

export async function getRates(): Promise<RatesResponse> {
  try {
    // Try to get rates from cache first
    const cachedRates = getFromCache<RatesResponse>(CACHE_KEY_LATEST_RATES);
    
    if (cachedRates) {
      console.log('Using cached exchange rates');
      return cachedRates;
    }

    // Check if we're online before making API call
    if (!isOnline()) {
      console.warn('Device is offline, waiting for connection...');
      await waitForOnline();
    }

    // If not in cache or expired, fetch fresh rates with retry logic
    console.log('Fetching fresh exchange rates from API with retry logic');
    
    const result = await retryWithBackoff(
      async () => {
        const rates = await fetchLatestRates();
        return rates;
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 2
      }
    );

    if (!result.success) {
      console.error('Failed to fetch rates after retries:', result.error);
      throw result.error;
    }

    const ratesResponse: RatesResponse = {
      rates: result.data!,
      timestamp: Date.now(),
      baseCurrency: 'USD' // OER free plan uses USD as base
    };

    // Cache the rates
    setToCache(CACHE_KEY_LATEST_RATES, ratesResponse, CACHE_TTL_HOURS);
    
    console.log(`Successfully fetched rates after ${result.attempts} attempts`);
    return ratesResponse;
  } catch (error) {
    console.error('Error getting rates:', error);
    
    // If we have stale cached data, return it as fallback
    const staleCache = getFromCache<RatesResponse>(CACHE_KEY_LATEST_RATES, false); // Don't check expiry
    if (staleCache) {
      console.warn('Using stale cached data as fallback');
      return staleCache;
    }
    
    throw error;
  }
}

export async function convertCurrency(
  from: string,
  to: string,
  amount: number
): Promise<ConversionResult> {
  // Input validation
  if (!from || !to || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid input parameters for currency conversion');
  }

  // Normalize currency codes to uppercase
  const fromCurrency = from.toUpperCase();
  const toCurrency = to.toUpperCase();

  try {
    const ratesData = await getRates();
    const { rates, timestamp, baseCurrency } = ratesData;

    // Check if currencies exist in rates
    if (fromCurrency !== baseCurrency && !rates[fromCurrency]) {
      throw new Error(`Currency '${fromCurrency}' is not supported or available`);
    }
    
    if (toCurrency !== baseCurrency && !rates[toCurrency]) {
      throw new Error(`Currency '${toCurrency}' is not supported or available`);
    }

    // Handle same currency conversion
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        convertedAmount: amount,
        rateUsed: 1,
        timestamp,
        baseCurrency
      };
    }

    // Calculate conversion rate
    let rateUsed: number;
    let convertedAmount: number;

    if (fromCurrency === baseCurrency) {
      // Converting from base currency (USD) to another currency
      rateUsed = rates[toCurrency];
      convertedAmount = amount * rateUsed;
    } else if (toCurrency === baseCurrency) {
      // Converting from another currency to base currency (USD)
      rateUsed = 1 / rates[fromCurrency];
      convertedAmount = amount * rateUsed;
    } else {
      // Converting between two non-base currencies
      // Formula: amount * (rates[to] / rates[from])
      rateUsed = rates[toCurrency] / rates[fromCurrency];
      convertedAmount = amount * rateUsed;
    }

    // Round to 4 decimal places for currency precision
    convertedAmount = Math.round(convertedAmount * 10000) / 10000;
    rateUsed = Math.round(rateUsed * 10000) / 10000;

    return {
      originalAmount: amount,
      fromCurrency,
      toCurrency,
      convertedAmount,
      rateUsed,
      timestamp,
      baseCurrency
    };
  } catch (error) {
    console.error('Error in currency conversion:', error);
    throw error;
  }
}

export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const ratesData = await getRates();
    const currencies = [ratesData.baseCurrency, ...Object.keys(ratesData.rates)];
    return currencies.sort();
  } catch (error) {
    console.error('Error getting supported currencies:', error);
    throw error;
  }
}

export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
} 