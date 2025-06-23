import { convertCurrency, getRates } from '@/services/currencyService';
import * as openExchangeRatesService from '@/services/openExchangeRatesService';
import * as cache from '@/lib/cache';

// Mock the dependencies
jest.mock('@/services/openExchangeRatesService');
jest.mock('@/lib/cache');

const mockGetLatestRates = openExchangeRatesService.getLatestRates as jest.MockedFunction<typeof openExchangeRatesService.getLatestRates>;
const mockGetFromCache = cache.getFromCache as jest.MockedFunction<typeof cache.getFromCache>;
const mockSetToCache = cache.setToCache as jest.MockedFunction<typeof cache.setToCache>;

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
      mockGetLatestRates.mockResolvedValue(mockRatesData);

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
      mockGetFromCache.mockReturnValue(mockRatesData);

      // Act
      const result = await convertCurrency('USD', 'EUR', 100);

      // Assert
      expect(result.convertedAmount).toBe(86.77);
      expect(mockGetLatestRates).not.toHaveBeenCalled();
      expect(mockSetToCache).not.toHaveBeenCalled();
    });

    it('should handle reverse conversion (non-USD base)', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockGetLatestRates.mockResolvedValue(mockRatesData);

      // Act
      const result = await convertCurrency('EUR', 'GBP', 100);

      // Assert
      expect(result.originalAmount).toBe(100);
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('GBP');
      // EUR to USD: 100 / 0.8677 = 115.25
      // USD to GBP: 115.25 * 0.7534 = 86.81
      expect(result.convertedAmount).toBeCloseTo(86.81, 2);
    });

    it('should convert from non-USD to USD', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockGetLatestRates.mockResolvedValue(mockRatesData);

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
      mockGetLatestRates.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(convertCurrency('USD', 'EUR', 100)).rejects.toThrow('API error');
    });

    it('should throw error for unsupported currencies', async () => {
      // Arrange
      const ratesWithoutCurrency = {
        base: 'USD',
        rates: {
          EUR: 0.8677,
        },
        timestamp: 1640995200,
      };
      
      mockGetFromCache.mockReturnValue(null);
      mockGetLatestRates.mockResolvedValue(ratesWithoutCurrency);

      // Act & Assert
      await expect(convertCurrency('USD', 'XYZ', 100)).rejects.toThrow();
    });

    it('should handle zero amount', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockGetLatestRates.mockResolvedValue(mockRatesData);

      // Act
      const result = await convertCurrency('USD', 'EUR', 0);

      // Assert
      expect(result.originalAmount).toBe(0);
      expect(result.convertedAmount).toBe(0);
    });

    it('should handle decimal amounts correctly', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockGetLatestRates.mockResolvedValue(mockRatesData);

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
      mockGetLatestRates.mockResolvedValue(mockRatesData);

      // Act
      const result = await getRates();

      // Assert
      expect(result.rates).toEqual(mockRatesData.rates);
      expect(result.baseCurrency).toBe('USD');
      expect(result.timestamp).toBe(1640995200);
      expect(mockSetToCache).toHaveBeenCalled();
    });

    it('should use cached rates when available', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(mockRatesData);

      // Act
      const result = await getRates();

      // Assert
      expect(result.rates).toEqual(mockRatesData.rates);
      expect(mockGetLatestRates).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      // Arrange
      mockGetFromCache.mockReturnValue(null);
      mockGetLatestRates.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(getRates()).rejects.toThrow('Network error');
    });
  });
}); 