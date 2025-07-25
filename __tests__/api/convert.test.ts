/**
 * @jest-environment node
 */

import { GET } from '@/app/api/convert/route';
import { NextRequest } from 'next/server';

// Mock the currency service
jest.mock('@/services/currencyService', () => ({
  convertCurrency: jest.fn(),
  isValidCurrencyCode: jest.fn(() => true),
}));

// Mock the Open Exchange Rates service
jest.mock('@/services/openExchangeRatesService', () => ({
  getLatestRates: jest.fn(),
}));

import { convertCurrency } from '@/services/currencyService';

const mockConvertCurrency = convertCurrency as jest.MockedFunction<typeof convertCurrency>;

describe('/api/convert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should convert currency successfully', async () => {
    // Arrange
    const mockResult = {
      originalAmount: 100,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      convertedAmount: 86.77,
      rateUsed: 0.8677,
      timestamp: Date.now(),
      baseCurrency: 'USD',
    };

    mockConvertCurrency.mockResolvedValue(mockResult);

    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR&amount=100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockResult);
    expect(mockConvertCurrency).toHaveBeenCalledWith('USD', 'EUR', 100);
  });

  it('should return 400 for missing parameters', async () => {
    // Arrange
    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required parameters');
    expect(data.message).toBeDefined();
  });

  it('should return 400 for invalid amount', async () => {
    // Arrange
    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR&amount=invalid');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid amount');
    expect(data.message).toBeDefined();
  });

  it('should return 400 for negative amount', async () => {
    // Arrange
    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR&amount=-100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid amount');
    expect(data.message).toBeDefined();
  });

  it('should handle same currencies correctly', async () => {
    // Arrange
    const mockResult = {
      originalAmount: 100,
      fromCurrency: 'USD',
      toCurrency: 'USD',
      convertedAmount: 100,
      rateUsed: 1,
      timestamp: Date.now(),
      baseCurrency: 'USD',
    };

    mockConvertCurrency.mockResolvedValue(mockResult);

    const url = new URL('http://localhost:3000/api/convert?from=USD&to=USD&amount=100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.convertedAmount).toBe(100);
  });

  it('should handle service errors gracefully', async () => {
    // Arrange
    mockConvertCurrency.mockRejectedValue(new Error('API rate limit exceeded'));

    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR&amount=100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBeDefined();
  });

  it('should handle invalid currency codes', async () => {
    // Arrange - Mock isValidCurrencyCode to return false for XYZ
    const { isValidCurrencyCode } = require('@/services/currencyService');
    isValidCurrencyCode.mockImplementation((code: string) => code !== 'XYZ');

    const url = new URL('http://localhost:3000/api/convert?from=XYZ&to=EUR&amount=100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid from currency');
    expect(data.message).toBeDefined();
  });

  it('should handle large amounts correctly', async () => {
    // Arrange
    const mockResult = {
      originalAmount: 1000000,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      convertedAmount: 867700,
      rateUsed: 0.8677,
      timestamp: Date.now(),
      baseCurrency: 'USD',
    };

    mockConvertCurrency.mockResolvedValue(mockResult);

    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR&amount=1000000');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.convertedAmount).toBe(867700);
  });

  it('should handle decimal amounts correctly', async () => {
    // Arrange
    const mockResult = {
      originalAmount: 100.50,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      convertedAmount: 87.20,
      rateUsed: 0.8677,
      timestamp: Date.now(),
      baseCurrency: 'USD',
    };

    mockConvertCurrency.mockResolvedValue(mockResult);

    const url = new URL('http://localhost:3000/api/convert?from=USD&to=EUR&amount=100.50');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.originalAmount).toBe(100.50);
  });
}); 