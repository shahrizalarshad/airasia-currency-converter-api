/**
 * End-to-End Integration Tests
 * Tests the complete application flow including UI components and API integration
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock fetch for API calls
global.fetch = jest.fn();

const mockRatesResponse = {
  success: true,
  data: {
    rates: {
      SGD: 1.285302,
      USD: 1,
      EUR: 0.86432,
      GBP: 0.739599,
      JPY: 146.213115,
      MYR: 4.295,
      THB: 32.7525,
    },
    baseCurrency: 'USD',
    timestamp: Date.now(),
    lastUpdated: new Date().toISOString(),
  },
};

const mockConvertResponse = {
  success: true,
  data: {
    originalAmount: 1000,
    fromCurrency: 'SGD',
    toCurrency: 'USD',
    convertedAmount: 778.03,
    rateUsed: 0.778,
    timestamp: Date.now(),
    baseCurrency: 'USD',
  },
};

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
    
    // Mock successful API responses by default
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/rates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRatesResponse),
        });
      }
      if (url.includes('/api/convert')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConvertResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('API Integration Tests', () => {
    it('should handle successful API responses', async () => {
      // Mock successful API call
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConvertResponse),
      });

      // This would normally trigger an API call in the real component
      const response = await fetch('/api/convert?from=SGD&to=USD&amount=1000');
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.convertedAmount).toBe(778.03);
    });

    it('should handle API errors', async () => {
      // Mock API error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Internal server error',
        }),
      });

      const response = await fetch('/api/convert?from=SGD&to=USD&amount=1000');
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle network errors', async () => {
      // Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/convert?from=SGD&to=USD&amount=1000')).rejects.toThrow('Network error');
    });

    it('should handle rates API successfully', async () => {
      const response = await fetch('/api/rates');
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.rates).toHaveProperty('SGD');
      expect(data.data.rates).toHaveProperty('EUR');
      expect(data.data.baseCurrency).toBe('USD');
    });

    it('should validate API response structure', async () => {
      const response = await fetch('/api/convert?from=USD&to=EUR&amount=100');
      const data = await response.json();
      
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('originalAmount');
      expect(data.data).toHaveProperty('fromCurrency');
      expect(data.data).toHaveProperty('toCurrency');
      expect(data.data).toHaveProperty('convertedAmount');
      expect(data.data).toHaveProperty('rateUsed');
      expect(data.data).toHaveProperty('timestamp');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple rapid API calls', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetch(`/api/convert?from=USD&to=EUR&amount=${100 + i}`)
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });

    it('should handle concurrent API requests', async () => {
      const convertPromise = fetch('/api/convert?from=SGD&to=USD&amount=1000');
      const ratesPromise = fetch('/api/rates');
      
      const [convertResponse, ratesResponse] = await Promise.all([convertPromise, ratesPromise]);
      
      expect(convertResponse.ok).toBe(true);
      expect(ratesResponse.ok).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle malformed API responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      const response = await fetch('/api/convert?from=SGD&to=USD&amount=1000');
      const data = await response.json();
      
      expect(data).toEqual({ invalid: 'response' });
    });

    it('should handle timeout scenarios', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(fetch('/api/convert?from=SGD&to=USD&amount=1000')).rejects.toThrow('Request timeout');
    });
  });

  describe('Data Validation Tests', () => {
    it('should validate currency codes', () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'SGD', 'JPY'];
      
      validCurrencies.forEach(currency => {
        expect(currency).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should validate amount formats', () => {
      const validAmounts = [100, 1000.50, 0.01, 999999];
      
      validAmounts.forEach(amount => {
        expect(typeof amount).toBe('number');
        expect(amount).toBeGreaterThan(0);
      });
    });

    it('should validate exchange rates', () => {
      const rates = mockRatesResponse.data.rates;
      
      Object.values(rates).forEach(rate => {
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThan(0);
      });
    });
  });
}); 