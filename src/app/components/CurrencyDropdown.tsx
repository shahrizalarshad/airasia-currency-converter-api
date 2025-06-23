'use client';

import React from 'react';

interface CurrencyDropdownProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  currencies: string[];
  disabled?: boolean;
  className?: string;
}

// Common currency display names and flags
const currencyInfo: { [key: string]: { name: string; flag?: string } } = {
  USD: { name: 'US Dollar', flag: '🇺🇸' },
  EUR: { name: 'Euro', flag: '🇪🇺' },
  GBP: { name: 'British Pound', flag: '🇬🇧' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦' },
  CHF: { name: 'Swiss Franc', flag: '🇨🇭' },
  CNY: { name: 'Chinese Yuan', flag: '🇨🇳' },
  SEK: { name: 'Swedish Krona', flag: '🇸🇪' },
  NZD: { name: 'New Zealand Dollar', flag: '🇳🇿' },
  MXN: { name: 'Mexican Peso', flag: '🇲🇽' },
  SGD: { name: 'Singapore Dollar', flag: '🇸🇬' },
  HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰' },
  NOK: { name: 'Norwegian Krone', flag: '🇳🇴' },
  INR: { name: 'Indian Rupee', flag: '🇮🇳' },
  BRL: { name: 'Brazilian Real', flag: '🇧🇷' },
  ZAR: { name: 'South African Rand', flag: '🇿🇦' },
  KRW: { name: 'South Korean Won', flag: '🇰🇷' },
  MYR: { name: 'Malaysian Ringgit', flag: '🇲🇾' },
  THB: { name: 'Thai Baht', flag: '🇹🇭' },
  PHP: { name: 'Philippine Peso', flag: '🇵🇭' },
  IDR: { name: 'Indonesian Rupiah', flag: '🇮🇩' },
  VND: { name: 'Vietnamese Dong', flag: '🇻🇳' },
  RUB: { name: 'Russian Ruble', flag: '🇷🇺' },
  TRY: { name: 'Turkish Lira', flag: '🇹🇷' },
  PLN: { name: 'Polish Zloty', flag: '🇵🇱' },
  CZK: { name: 'Czech Koruna', flag: '🇨🇿' },
  HUF: { name: 'Hungarian Forint', flag: '🇭🇺' },
  ILS: { name: 'Israeli Shekel', flag: '🇮🇱' },
  AED: { name: 'UAE Dirham', flag: '🇦🇪' },
  SAR: { name: 'Saudi Riyal', flag: '🇸🇦' },
  EGP: { name: 'Egyptian Pound', flag: '🇪🇬' },
  QAR: { name: 'Qatari Riyal', flag: '🇶🇦' },
  KWD: { name: 'Kuwaiti Dinar', flag: '🇰🇼' },
};

export default function CurrencyDropdown({
  id,
  label,
  value,
  onChange,
  currencies,
  disabled = false,
  className = ''
}: CurrencyDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const formatCurrencyOption = (currency: string) => {
    const info = currencyInfo[currency];
    if (info) {
      return `${info.flag ? info.flag + ' ' : ''}${currency} - ${info.name}`;
    }
    return currency;
  };

  // Sort currencies with popular ones first
  const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];
  const sortedCurrencies = [
    ...popularCurrencies.filter(currency => currencies.includes(currency)),
    ...currencies.filter(currency => !popularCurrencies.includes(currency)).sort()
  ];

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg bg-white appearance-none"
        >
          {sortedCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {formatCurrencyOption(currency)}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Selected currency info */}
      {currencyInfo[value] && (
        <div className="mt-2 text-sm text-gray-600 flex items-center">
          <span className="mr-2">{currencyInfo[value].flag}</span>
          <span>{currencyInfo[value].name}</span>
        </div>
      )}
    </div>
  );
} 