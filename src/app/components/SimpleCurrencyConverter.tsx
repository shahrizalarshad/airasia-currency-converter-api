'use client';

import React, { useState } from 'react';
import CurrencyDropdown from './CurrencyDropdown';

interface ConversionResult {
  originalAmount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rateUsed: number;
  timestamp: number;
  baseCurrency: string;
}

const BASIC_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'INR', 'BRL', 'ZAR', 'KRW', 'MYR', 'THB'
];

export default function SimpleCurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('EUR');
  const [amount, setAmount] = useState<string>('');
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (fromCurrency === toCurrency) {
      setError('Please select different currencies');
      return;
    }

    setIsLoading(true);
    setError(null);
    setConversionResult(null);

    try {
      const response = await fetch(
        `/api/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setConversionResult(data.data);
      } else {
        throw new Error(data.message || 'Conversion failed');
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during conversion');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
              disabled={isLoading}
            />
          </div>

          {/* From Currency */}
          <CurrencyDropdown
            id="fromCurrency"
            label="From"
            value={fromCurrency}
            onChange={setFromCurrency}
            currencies={BASIC_CURRENCIES}
            disabled={isLoading}
          />

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swapCurrencies}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              disabled={isLoading}
              title="Swap currencies"
              aria-label="Swap currencies"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </div>

          {/* To Currency */}
          <CurrencyDropdown
            id="toCurrency"
            label="To"
            value={toCurrency}
            onChange={setToCurrency}
            currencies={BASIC_CURRENCIES}
            disabled={isLoading}
          />

          {/* Convert Button */}
          <button
            type="submit"
            disabled={isLoading || !amount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Converting...
              </>
            ) : (
              'Convert'
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Conversion Result */}
          {conversionResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900 mb-2">
                  {formatCurrency(conversionResult.convertedAmount, conversionResult.toCurrency)}
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    {formatCurrency(conversionResult.originalAmount, conversionResult.fromCurrency)} = {' '}
                    {formatCurrency(conversionResult.convertedAmount, conversionResult.toCurrency)}
                  </p>
                  <p>
                    Rate: 1 {conversionResult.fromCurrency} = {conversionResult.rateUsed.toFixed(4)} {conversionResult.toCurrency}
                  </p>
                  <p className="text-xs text-green-600">
                    Last updated: {formatDate(conversionResult.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 