import { GET } from '@/app/api/convert/route';
import { NextRequest } from 'next/server';

// Mock the currency service
jest.mock('@/services/currencyService', () => ({
  convertCurrency: jest.fn(),
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
    expect(data.success).toBe(false);
    expect(data.error).toBe('Validation error');
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
    expect(data.success).toBe(false);
    expect(data.error).toBe('Validation error');
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
    expect(data.success).toBe(false);
    expect(data.error).toBe('Validation error');
  });

  it('should return 400 for same currencies', async () => {
    // Arrange
    const url = new URL('http://localhost:3000/api/convert?from=USD&to=USD&amount=100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Validation error');
    expect(data.message).toContain('same currency');
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
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal server error');
  });

  it('should handle invalid currency codes', async () => {
    // Arrange
    mockConvertCurrency.mockRejectedValue(new Error('Currency XYZ is not supported'));

    const url = new URL('http://localhost:3000/api/convert?from=XYZ&to=EUR&amount=100');
    const request = new NextRequest(url);

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal server error');
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