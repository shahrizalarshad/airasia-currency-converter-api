import { convertCurrency, getRates } from '@/services/currencyService';

// Mock the dependencies
jest.mock('@/services/openExchangeRatesService', () => ({
  fetchLatestRates: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  getFromCache: jest.fn(),
  setToCache: jest.fn(),
}));

jest.mock('@/lib/retry', () => ({
  retryWithBackoff: jest.fn(),
  isOnline: jest.fn(() => true),
  waitForOnline: jest.fn(),
}));

import { fetchLatestRates } from '@/services/openExchangeRatesService';
import { getFromCache, setToCache } from '@/lib/cache';
import { retryWithBackoff } from '@/lib/retry';

const mockFetchLatestRates = fetchLatestRates as jest.MockedFunction<typeof fetchLatestRates>;
const mockGetFromCache = getFromCache as jest.MockedFunction<typeof getFromCache>;
const mockSetToCache = setToCache as jest.MockedFunction<typeof setToCache>;
const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;

describe('Currency Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertCurrency', () => {
    const mockRatesData = {
      base: 'USD',
      rates: {
        EUR: 0.8677,
        GBP: 0.7534,
        SGD: 1.286,
        JPY: 110.234,
      },
      timestamp: 1640995200,
    };

    it('should convert currency successfully', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: true,
        data: mockRatesData.rates,
        attempts: 1,
        error: null
      });

      // Act
      const result = await convertCurrency('USD', 'EUR', 100);

      // Assert
      expect(result.originalAmount).toBe(100);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.convertedAmount).toBe(86.77);
      expect(result.rateUsed).toBe(0.8677);
      expect(result.baseCurrency).toBe('USD');
      expect(mockSetToCache).toHaveBeenCalled();
    });

    it('should use cached data when available', async () => {
      // Arrange
      const cachedData = {
        rates: mockRatesData.rates,
        timestamp: Date.now(),
        baseCurrency: 'USD'
      };
      mockGetFromCache.mockReturnValue(cachedData);

      // Act
      const result = await convertCurrency('USD', 'EUR', 100);

      // Assert
      expect(result.convertedAmount).toBe(86.77);
      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
      expect(mockSetToCache).not.toHaveBeenCalled();
    });

    it('should handle reverse conversion (non-USD base)', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: true,
        data: mockRatesData.rates,
        attempts: 1,
        error: null
      });

      // Act
      const result = await convertCurrency('EUR', 'GBP', 100);

      // Assert
      expect(result.originalAmount).toBe(100);
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('GBP');
      // EUR to USD: 100 / 0.8677 = 115.25
      // USD to GBP: 115.25 * 0.7534 = 86.81
      expect(result.convertedAmount).toBeCloseTo(86.83, 2);
    });

    it('should convert from non-USD to USD', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: true,
        data: mockRatesData.rates,
        attempts: 1,
        error: null
      });

      // Act
      const result = await convertCurrency('EUR', 'USD', 100);

      // Assert
      expect(result.originalAmount).toBe(100);
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('USD');
      // EUR to USD: 100 / 0.8677 = 115.25
      expect(result.convertedAmount).toBeCloseTo(115.25, 2);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: false,
        data: null,
        attempts: 3,
        error: new Error('API error')
      });

      // Act & Assert
      await expect(convertCurrency('USD', 'EUR', 100)).rejects.toThrow('API error');
    });

    it('should throw error for unsupported currencies', async () => {
      // Arrange
      const ratesWithoutCurrency = {
        rates: {
          EUR: 0.8677,
        },
        timestamp: Date.now(),
        baseCurrency: 'USD'
      };
      
      mockGetFromCache.mockReturnValue(ratesWithoutCurrency);

      // Act & Assert
      await expect(convertCurrency('USD', 'XYZ', 100)).rejects.toThrow();
    });

    it('should handle zero amount', async () => {
      // Act & Assert
      await expect(convertCurrency('USD', 'EUR', 0)).rejects.toThrow('Invalid input parameters');
    });

    it('should handle decimal amounts correctly', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: true,
        data: mockRatesData.rates,
        attempts: 1,
        error: null
      });

      // Act
      const result = await convertCurrency('USD', 'EUR', 99.99);

      // Assert
      expect(result.originalAmount).toBe(99.99);
      expect(result.convertedAmount).toBeCloseTo(86.76, 2);
    });
  });

  describe('getRates', () => {
    const mockRatesData = {
      base: 'USD',
      rates: {
        EUR: 0.8677,
        GBP: 0.7534,
        SGD: 1.286,
        JPY: 110.234,
      },
      timestamp: 1640995200,
    };

    it('should return rates successfully', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: true,
        data: mockRatesData.rates,
        attempts: 1,
        error: null
      });

      // Act
      const result = await getRates();

      // Assert
      expect(result.rates).toEqual(mockRatesData.rates);
      expect(result.baseCurrency).toBe('USD');
      expect(result.timestamp).toBeDefined();
      expect(mockSetToCache).toHaveBeenCalled();
    });

    it('should use cached rates when available', async () => {
      // Arrange
      const cachedData = {
        rates: mockRatesData.rates,
        timestamp: Date.now(),
        baseCurrency: 'USD'
      };
      mockGetFromCache.mockReturnValue(cachedData);

      // Act
      const result = await getRates();

      // Assert
      expect(result.rates).toEqual(mockRatesData.rates);
      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockRetryWithBackoff.mockResolvedValue({
        success: false,
        data: null,
        attempts: 3,
        error: new Error('Network error')
      });

      // Act & Assert
      await expect(getRates()).rejects.toThrow('Network error');
    });
  });
}); 