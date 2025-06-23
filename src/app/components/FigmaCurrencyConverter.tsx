'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getFavorites, addToRecent } from '@/lib/favorites';
import { usePerformanceMonitoring, trackConversion } from '@/lib/analytics';

// Currency to country code mapping for flag API
const CURRENCY_TO_COUNTRY: { [key: string]: string } = {
  // Major currencies
  USD: 'us',    // United States Dollar
  EUR: 'eu',    // Euro
  GBP: 'gb',    // British Pound Sterling
  JPY: 'jp',    // Japanese Yen
  CHF: 'ch',    // Swiss Franc
  CAD: 'ca',    // Canadian Dollar
  AUD: 'au',    // Australian Dollar
  
  // Asian currencies
  SGD: 'sg',    // Singapore Dollar
  CNY: 'cn',    // Chinese Yuan
  HKD: 'hk',    // Hong Kong Dollar
  INR: 'in',    // Indian Rupee
  KRW: 'kr',    // South Korean Won
  MYR: 'my',    // Malaysian Ringgit
  THB: 'th',    // Thai Baht
  PHP: 'ph',    // Philippine Peso
  IDR: 'id',    // Indonesian Rupiah
  VND: 'vn',    // Vietnamese Dong
  TWD: 'tw',    // Taiwan Dollar
  CNH: 'cn',    // Chinese Yuan (Offshore)
  
  // Middle East & Africa
  AED: 'ae',    // UAE Dirham
  SAR: 'sa',    // Saudi Riyal
  ZAR: 'za',    // South African Rand
  EGP: 'eg',    // Egyptian Pound
  QAR: 'qa',    // Qatari Riyal
  KWD: 'kw',    // Kuwaiti Dinar
  BHD: 'bh',    // Bahraini Dinar
  OMR: 'om',    // Omani Rial
  JOD: 'jo',    // Jordanian Dinar
  ILS: 'il',    // Israeli Shekel
  LBP: 'lb',    // Lebanese Pound
  TND: 'tn',    // Tunisian Dinar
  MAD: 'ma',    // Moroccan Dirham
  DZD: 'dz',    // Algerian Dinar
  LYD: 'ly',    // Libyan Dinar
  SDG: 'sd',    // Sudanese Pound
  ETB: 'et',    // Ethiopian Birr
  KES: 'ke',    // Kenyan Shilling
  UGX: 'ug',    // Ugandan Shilling
  TZS: 'tz',    // Tanzanian Shilling
  RWF: 'rw',    // Rwandan Franc
  NGN: 'ng',    // Nigerian Naira
  GHS: 'gh',    // Ghanaian Cedi
  XOF: 'sn',    // West African CFA Franc (using Senegal)
  XAF: 'cm',    // Central African CFA Franc (using Cameroon)
  
  // European currencies
  NOK: 'no',    // Norwegian Krone
  SEK: 'se',    // Swedish Krona
  DKK: 'dk',    // Danish Krone
  PLN: 'pl',    // Polish Zloty
  CZK: 'cz',    // Czech Koruna
  HUF: 'hu',    // Hungarian Forint
  RON: 'ro',    // Romanian Leu
  BGN: 'bg',    // Bulgarian Lev
  HRK: 'hr',    // Croatian Kuna
  RSD: 'rs',    // Serbian Dinar
  BAM: 'ba',    // Bosnia-Herzegovina Convertible Mark
  MKD: 'mk',    // North Macedonian Denar
  ALL: 'al',    // Albanian Lek
  MDL: 'md',    // Moldovan Leu
  UAH: 'ua',    // Ukrainian Hryvnia
  BYN: 'by',    // Belarusian Ruble
  ISK: 'is',    // Icelandic Krona
  
  // Americas
  BRL: 'br',    // Brazilian Real
  MXN: 'mx',    // Mexican Peso
  ARS: 'ar',    // Argentine Peso
  CLP: 'cl',    // Chilean Peso
  COP: 'co',    // Colombian Peso
  PEN: 'pe',    // Peruvian Sol
  UYU: 'uy',    // Uruguayan Peso
  PYG: 'py',    // Paraguayan Guarani
  BOB: 'bo',    // Bolivian Boliviano
  VES: 've',    // Venezuelan Bolívar
  GYD: 'gy',    // Guyanese Dollar
  SRD: 'sr',    // Surinamese Dollar
  TTD: 'tt',    // Trinidad and Tobago Dollar
  JMD: 'jm',    // Jamaican Dollar
  BBD: 'bb',    // Barbadian Dollar
  BSD: 'bs',    // Bahamian Dollar
  BZD: 'bz',    // Belize Dollar
  GTQ: 'gt',    // Guatemalan Quetzal
  HNL: 'hn',    // Honduran Lempira
  NIO: 'ni',    // Nicaraguan Córdoba
  CRC: 'cr',    // Costa Rican Colón
  PAB: 'pa',    // Panamanian Balboa
  DOP: 'do',    // Dominican Peso
  HTG: 'ht',    // Haitian Gourde
  CUP: 'cu',    // Cuban Peso
  CUC: 'cu',    // Cuban Convertible Peso
  
  // Asia-Pacific
  NZD: 'nz',    // New Zealand Dollar
  FJD: 'fj',    // Fijian Dollar
  PGK: 'pg',    // Papua New Guinea Kina
  VUV: 'vu',    // Vanuatu Vatu
  WST: 'ws',    // Samoan Tala
  TOP: 'to',    // Tongan Paʻanga
  SBD: 'sb',    // Solomon Islands Dollar
  
  // South Asia
  PKR: 'pk',    // Pakistani Rupee
  BDT: 'bd',    // Bangladeshi Taka
  LKR: 'lk',    // Sri Lankan Rupee
  NPR: 'np',    // Nepalese Rupee
  BTN: 'bt',    // Bhutanese Ngultrum
  MVR: 'mv',    // Maldivian Rufiyaa
  AFN: 'af',    // Afghan Afghani
  
  // Central Asia & Caucasus
  KZT: 'kz',    // Kazakhstani Tenge
  UZS: 'uz',    // Uzbekistani Som
  KGS: 'kg',    // Kyrgyzstani Som
  TJS: 'tj',    // Tajikistani Somoni
  TMT: 'tm',    // Turkmenistani Manat
  AZN: 'az',    // Azerbaijani Manat
  AMD: 'am',    // Armenian Dram
  GEL: 'ge',    // Georgian Lari
  
  // East Asia
  MNT: 'mn',    // Mongolian Tugrik
  KPW: 'kp',    // North Korean Won
  
  // Southeast Asia
  LAK: 'la',    // Laotian Kip
  KHR: 'kh',    // Cambodian Riel
  MMK: 'mm',    // Myanmar Kyat
  BND: 'bn',    // Brunei Dollar
  MOP: 'mo',    // Macanese Pataca
  
  // Others
  RUB: 'ru',    // Russian Ruble
  TRY: 'tr',    // Turkish Lira
  IRR: 'ir',    // Iranian Rial
  IQD: 'iq',    // Iraqi Dinar
  SYP: 'sy',    // Syrian Pound
  YER: 'ye',    // Yemeni Rial
  
  // Caribbean & Small Islands
  XCD: 'ag',    // East Caribbean Dollar (using Antigua)
  AWG: 'aw',    // Aruban Florin
  ANG: 'cw',    // Netherlands Antillean Guilder (using Curaçao)
  KYD: 'ky',    // Cayman Islands Dollar
  BMD: 'bm',    // Bermudian Dollar
  
  // British Territories
  GIP: 'gi',    // Gibraltar Pound
  FKP: 'fk',    // Falkland Islands Pound
  SHP: 'sh',    // Saint Helena Pound
  JEP: 'je',    // Jersey Pound
  GGP: 'gg',    // Guernsey Pound
  IMP: 'im',    // Isle of Man Pound
  
  // African currencies
  BWP: 'bw',    // Botswana Pula
  LSL: 'ls',    // Lesotho Loti
  SZL: 'sz',    // Swazi Lilangeni
  NAD: 'na',    // Namibian Dollar
  MWK: 'mw',    // Malawian Kwacha
  ZMW: 'zm',    // Zambian Kwacha
  ZWL: 'zw',    // Zimbabwean Dollar
  AOA: 'ao',    // Angolan Kwanza
  MZN: 'mz',    // Mozambican Metical
  MGA: 'mg',    // Malagasy Ariary
  MUR: 'mu',    // Mauritian Rupee
  SCR: 'sc',    // Seychellois Rupee
  KMF: 'km',    // Comorian Franc
  DJF: 'dj',    // Djiboutian Franc
  ERN: 'er',    // Eritrean Nakfa
  SOS: 'so',    // Somali Shilling
  CDF: 'cd',    // Congolese Franc
  BIF: 'bi',    // Burundian Franc
  GMD: 'gm',    // Gambian Dalasi
  GNF: 'gn',    // Guinean Franc
  SLL: 'sl',    // Sierra Leonean Leone
  LRD: 'lr',    // Liberian Dollar
  CVE: 'cv',    // Cape Verdean Escudo
  STN: 'st',    // São Tomé and Príncipe Dobra
  STD: 'st',    // São Tomé and Príncipe Dobra (old)
  
  // Precious Metals & Special
  XAU: 'gold',     // Gold
  XAG: 'silver',   // Silver
  XPT: 'platinum', // Platinum
  XPD: 'palladium',// Palladium
  XDR: 'imf',      // Special Drawing Rights
  
  // Crypto (if supported by API)
  BTC: 'bitcoin',   // Bitcoin (using a generic icon)
  ETH: 'ethereum',  // Ethereum (using a generic icon)
};

// All 170 currencies supported by Open Exchange Rates
const CURRENCIES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTC', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLF',
  'CLP', 'CNH', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF',
  'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP',
  'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL',
  'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK',
  'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW',
  'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD',
  'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK',
  'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR',
  'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD',
  'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLL',
  'SOS', 'SRD', 'SSP', 'STD', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS',
  'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD',
  'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XAG', 'XAU', 'XCD',
  'XDR', 'XOF', 'XPD', 'XPF', 'XPT', 'YER', 'ZAR', 'ZMW', 'ZWL'
];

// Hydration-safe flag rendering with external images
const renderFlag = (currency: string, isMounted: boolean): React.ReactNode => {
  const countryCode = CURRENCY_TO_COUNTRY[currency];
  
  // Special handling for different currency types
  const isCrypto = ['BTC', 'ETH'].includes(currency);
  const isPreciousMetal = ['XAU', 'XAG', 'XPT', 'XPD'].includes(currency);
  const isSpecial = ['XDR', 'XOF', 'XAF', 'XCD', 'XPF'].includes(currency);
  
  // Always render the same container structure for hydration safety
  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-100 rounded-full">
      {countryCode && isMounted && !isCrypto && !isPreciousMetal && !isSpecial ? (
        <img
          src={`https://hatscripts.github.io/circle-flags/flags/${countryCode}.svg`}
          alt={`${currency} flag`}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : null}
      
      {/* Special crypto icons */}
      {isCrypto && isMounted ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-400 to-yellow-500 text-white text-xs font-bold">
          {currency === 'BTC' ? '₿' : currency === 'ETH' ? 'Ξ' : currency}
        </div>
      ) : null}
      
      {/* Precious metals icons */}
      {isPreciousMetal && isMounted ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-xs font-bold">
          {currency === 'XAU' ? '🥇' : currency === 'XAG' ? '🥈' : currency === 'XPT' ? '⚪' : currency === 'XPD' ? '⚫' : currency}
        </div>
      ) : null}
      
      {/* Special currencies icons */}
      {isSpecial && isMounted ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold">
          {currency === 'XDR' ? '🏛️' : currency}
        </div>
      ) : null}
      
      {/* Fallback content - always present but hidden when image loads */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          (countryCode && isMounted && !isCrypto && !isPreciousMetal && !isSpecial) || 
          (isCrypto && isMounted) || 
          (isPreciousMetal && isMounted) || 
          (isSpecial && isMounted) ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="text-gray-500 text-xs font-bold">{currency}</div>
      </div>
    </div>
  );
};

export default function FigmaCurrencyConverter() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [fromCurrency, setFromCurrency] = useState<string>('SGD');
  const [toCurrency, setToCurrency] = useState<string>('USD');
  const [amount, setAmount] = useState<string>('1.00');
  const [convertedAmount, setConvertedAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string>('');

  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [showFromDropdown, setShowFromDropdown] = useState<boolean>(false);
  const [showToDropdown, setShowToDropdown] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const toDropdownRef = useRef<HTMLDivElement>(null);

  // Haptic feedback simulation
  const vibrate = useCallback(() => {
    if (isMounted && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [isMounted]);

  // Custom dropdown component with flags
  const renderCurrencyDropdown = (
    selectedCurrency: string,
    isOpen: boolean,
    onToggle: () => void,
    onSelect: (currency: string) => void,
    dropdownRef: React.RefObject<HTMLDivElement | null>,
    type: 'from' | 'to'
  ) => {
    return (
      <div className="relative" ref={dropdownRef}>
        {/* Selected Currency Display */}
        <button
          type="button"
          onClick={onToggle}
          className="absolute w-[39px] h-[23px] left-[58px] top-[11px] text-[20px] leading-[23px] font-medium bg-transparent border-none outline-none cursor-pointer transition-colors duration-200 hover:opacity-80 flex items-center"
          style={{ 
            fontFamily: 'var(--font-roboto), Roboto, sans-serif',
            color: '#26278D' 
          }}
          title={`Select ${type} currency`}
          aria-label={`${type} currency`}
        >
          {selectedCurrency}
        </button>

        {/* Dropdown Arrow */}
        <div 
          className="absolute w-[24px] h-[24px] left-[99px] top-[10px] opacity-50 pointer-events-none transition-transform duration-200 hover:scale-110"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M7 10L12 15L17 10" stroke="#3C3C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-[35px] left-[0px] w-[120px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
            {CURRENCIES.map((currency) => (
              <button
                key={currency}
                type="button"
                onClick={() => {
                  onSelect(currency);
                  onToggle();
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                style={{ 
                  fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                  color: selectedCurrency === currency ? '#26278D' : '#3C3C3C'
                }}
              >
                {/* Flag */}
                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                  {renderFlag(currency, isMounted)}
                </div>
                {/* Currency Code */}
                <span className="text-sm font-medium">{currency}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };



  // Format number with commas and 2 decimal places
  const formatAmountDisplay = (value: string): string => {
    if (!value) return '';
    
    // Remove existing commas and non-numeric characters except decimal
    const cleanValue = value.replace(/[^\d.]/g, '');
    const numValue = parseFloat(cleanValue);
    
    if (isNaN(numValue)) return '';
    
    // Format with commas and exactly 2 decimal places
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get raw numeric value from formatted string
  const getRawValue = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    const cleanValue = formattedValue.replace(/[^\d.]/g, '');
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Simple amount input handler - just store the value, no auto-conversion
  const handleAmountChange = (value: string) => {
    // Check if the value would exceed the limit while typing
    const numValue = getRawValue(value);
    if (numValue >= 1000000000) {
      // Don't update if it would exceed the limit
      setError('Maximum amount is 999,999,999');
      return;
    }
    
    setAmount(value);
    setError(null);
    
    // Clear any pending conversion
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // No auto-conversion while typing - only convert on blur
  };

  const swapCurrencies = async () => {
    vibrate();
    setIsSwapping(true);
    
    const tempFrom = fromCurrency;
    const tempTo = toCurrency;
    
    // Check for amount limit before swap
    const numValue = getRawValue(amount);
    if (numValue >= 1000000000) {
      setError('Maximum amount is 999,999,999');
      setIsSwapping(false);
      return;
    }
    
    // Animate swap
    setTimeout(() => {
      setFromCurrency(tempTo);
      setToCurrency(tempFrom);
      setIsSwapping(false);
      
      // Trigger conversion with swapped currencies
      if (amount && numValue > 0) {
        performConversion(tempTo, tempFrom, numValue);
      }
    }, 300);
  };

  const performConversion = async (from: string, to: string, amountValue: number) => {
    // Skip conversion if currencies are the same
    if (from === to) {
      const formattedSame = amountValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      setConvertedAmount(formattedSame);
      setExchangeRate('1.0000');
      setIsLoading(false);
      return;
    }

    // Skip conversion for invalid amounts
    if (!amountValue || amountValue <= 0 || isNaN(amountValue)) {
      setConvertedAmount('0');
      setExchangeRate('');
      setIsLoading(false);
      return;
    }

    const startTime = Date.now();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${amountValue}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();

      if (data.success && data.data) {
        const convertedAmount = data.data.convertedAmount;
        const rateUsed = data.data.rateUsed;
        
        if (typeof convertedAmount === 'number' && typeof rateUsed === 'number') {
          // Format converted amount with exactly 2 decimal places
          const formattedConverted = convertedAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          setConvertedAmount(formattedConverted);
          setExchangeRate(rateUsed.toFixed(4));
        } else {
          throw new Error('Invalid response format from API');
        }
        
        // Cache rates for future optimistic updates (non-blocking)
        fetch('/api/rates')
          .then(response => response.json())
          .then(ratesData => {
            if (ratesData.success && ratesData.data && ratesData.data.rates) {
              // Rates cached successfully
              console.log('💾 Exchange rates cached for future use');
            }
          })
          .catch(error => {
            console.warn('Failed to cache rates:', error);
          });
        
        // Track successful conversion
        if (typeof trackConversion === 'function') {
          trackConversion(from, to, amountValue, startTime, true);
        }
      } else {
        throw new Error(data.message || 'Conversion failed - invalid response');
      }
    } catch (err) {
      console.error('Conversion error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setError(`Failed to convert: ${errorMessage}`);
      setConvertedAmount('');
      setExchangeRate('');
      
      // Provide haptic feedback for errors
      if (typeof vibrate === 'function') {
        vibrate();
      }
      
      // Track failed conversion
      if (typeof trackConversion === 'function') {
        trackConversion(from, to, amountValue, startTime, false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrencyChange = async (type: 'from' | 'to', currency: string) => {
    vibrate();
    
    // Track currency usage
    addToRecent(currency);
    
    const numValue = getRawValue(amount);
    
    // Check for amount limit before conversion
    if (numValue >= 1000000000) {
      setError('Maximum amount is 999,999,999');
      return;
    }
    
    if (type === 'from') {
      setFromCurrency(currency);
      if (amount && currency !== toCurrency && numValue > 0) {
        await performConversion(currency, toCurrency, numValue);
      }
    } else {
      setToCurrency(currency);
      if (amount && fromCurrency !== currency && numValue > 0) {
        await performConversion(fromCurrency, currency, numValue);
      }
    }
  };

  const handleAmountFocus = () => {
    // Clear any existing error when user starts typing
    setError(null);
  };

  const handleAmountBlur = () => {
    // Simple validation on blur - set to 1.00 if empty or invalid
    if (!amount || amount.trim() === '') {
      setAmount('1.00');
      performConversion(fromCurrency, toCurrency, 1);
      return;
    }
    
    const numValue = getRawValue(amount);
    
    // Check for invalid amount
    if (numValue <= 0) {
      setAmount('1.00');
      setError('Please enter a valid amount');
      performConversion(fromCurrency, toCurrency, 1);
      return;
    }
    
    // Check for amount too large (API limit is 1 billion)
    if (numValue >= 1000000000) {
      setAmount('999,999,999.00');
      setError('Maximum amount is 999,999,999');
      performConversion(fromCurrency, toCurrency, 999999999);
      return;
    }
    
    // Format the amount with commas and 2 decimal places
    const formattedAmount = formatAmountDisplay(amount);
    setAmount(formattedAmount);
    
    // Trigger conversion only after user finishes input (on blur)
    performConversion(fromCurrency, toCurrency, numValue);
  };

  // Initialize performance monitoring
  usePerformanceMonitoring();

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
    // Load favorites when component mounts
    getFavorites();
  }, []);

  // Preload exchange rates and perform initial conversion on component mount
  useEffect(() => {
    if (isMounted) {
      // Preload rates in background
      fetch('/api/rates')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('💾 Exchange rates preloaded for responsiveness');
          }
        })
        .catch(error => {
          console.warn('⚠️ Failed to preload rates:', error);
        });
      
      // Perform initial conversion with default 1.00 SGD to USD
      if (amount) {
        const numValue = getRawValue(amount);
        if (numValue > 0) {
          performConversion(fromCurrency, toCurrency, numValue);
        }
      }
    }
  }, [isMounted]); // Only run when mounted

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target as Node)) {
        setShowToDropdown(false);
      }
    };

    if (showFromDropdown || showToDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFromDropdown, showToDropdown]);



  // Prevent hydration mismatch by ensuring client-side rendering
  if (!isMounted) {
    return (
      <div className="relative w-[360px] h-[703px] transition-all duration-300" style={{ background: '#F7F7F7' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[360px] h-[703px] transition-all duration-300" style={{ background: '#F7F7F7' }}>
      {/* Background Gradient Ellipse */}
      <div 
        className="absolute w-[751px] h-[751px] -left-[302px] -top-[393px] rounded-full transition-opacity duration-1000"
        style={{ 
          background: 'radial-gradient(50% 50% at 50% 50%, #EAEAFE 0%, rgba(221, 246, 243, 0) 100%)'
        }}
      />
      
      {/* Title */}
      <h1 
        className="absolute w-[220px] h-[29px] left-[69px] top-[50px] text-center font-bold text-[25px] leading-[29px] transition-all duration-300"
        style={{ 
          fontFamily: 'var(--font-roboto), Roboto, sans-serif',
          color: '#1F2261' 
        }}
      >
        Currency Converter
      </h1>
      
      {/* Subtitle */}
      <p 
        className="absolute w-[320px] h-[38px] left-[20px] top-[89px] text-center text-[16px] leading-[19px] transition-all duration-300"
        style={{ 
          fontFamily: 'var(--font-roboto), Roboto, sans-serif',
          color: '#808080' 
        }}
      >
        Check live rates, set rate alerts, receive notifications and more.
      </p>
      
      {/* Main Card */}
      <div 
        className={`absolute w-[320px] h-[290px] left-[20px] top-[168px] rounded-[20px] transition-all duration-300 ${
          isLoading ? 'animate-pulse' : ''
        }`}
        style={{ 
          background: '#FFFFFF',
          boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Enhanced Loading Overlay with Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 rounded-[20px] flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 border-3 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-r-blue-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-700 font-medium mb-1">Converting...</div>
                <div className="text-xs text-gray-500">Getting live rates</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Amount Section */}
        <div className={`absolute w-[280px] h-[85px] left-[20px] top-[24px] transition-all duration-300 ${
          isSwapping ? 'transform translate-y-2 opacity-50' : ''
        }`}>
          <label 
            className="absolute w-[53px] h-[18px] left-0 top-0 text-[15px] leading-[18px] transition-colors duration-200 mb-3"
            style={{ 
              fontFamily: 'var(--font-roboto), Roboto, sans-serif',
              color: '#989898'
            }}
          >
            Amount
          </label>
          
          {/* From Currency */}
          <div className="absolute w-[123px] h-[45px] left-0 top-[36px]">
            <div className={`absolute w-[45px] h-[45px] left-0 top-0 rounded-full overflow-hidden border transition-all duration-200 border-gray-200 ${
              isSwapping ? 'transform rotate-180 scale-110' : ''
            }`}>
              {renderFlag(fromCurrency, isMounted)}
            </div>
            
            {renderCurrencyDropdown(
              fromCurrency,
              showFromDropdown,
              () => setShowFromDropdown(!showFromDropdown),
              (currency) => handleCurrencyChange('from', currency),
              fromDropdownRef,
              'from'
            )}
          </div>
          
          {/* Amount Input */}
          <div 
            className="absolute w-[141px] h-[45px] left-[139px] top-[36px] rounded-[7px] flex items-center justify-end px-3 transition-all duration-200 ml-4"
            style={{ background: '#EFEFEF' }}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              className="w-full h-full bg-transparent border-none outline-none text-right text-[20px] leading-[23px] font-semibold transition-colors duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ 
                fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                color: '#3C3C3C'
              }}
              disabled={isLoading}
              title="Enter amount to convert"
              placeholder={isMounted ? "Enter amount" : ""}
              aria-label="Amount to convert"
              step="0.01"
            />
          </div>
        </div>
        
        {/* Divider Line and Swap Button */}
        <div className="absolute w-[280px] h-0 left-[20px] top-[137px] border-t transition-colors duration-200" 
             style={{ borderColor: '#E7E7EE' }} />
        
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            swapCurrencies();
          }}
          disabled={isLoading || isSwapping}
          className={`absolute w-[48px] h-[48px] left-[136px] top-[113px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg touch-manipulation ${
            isSwapping ? 'animate-spin' : ''
          } ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'
          }`}
          style={{ background: '#26278D' }}
          aria-label="Swap currencies"
        >
          <div className="w-4 h-4 relative">
            <img 
              src="/arrow-down.svg" 
              alt="Down arrow"
              className="absolute w-2 h-3 top-0 right-0 opacity-90"
            />
            <img 
              src="/arrow-up.svg" 
              alt="Up arrow"
              className="absolute w-2 h-3 bottom-0 left-0 opacity-90"
            />
          </div>
        </button>
        
        {/* Converted Amount Section */}
        <div className={`absolute w-[280px] h-[85px] left-[20px] top-[165px] transition-all duration-300 ${
          isSwapping ? 'transform -translate-y-2 opacity-50' : ''
        }`}>
          <label 
            className="absolute w-[126px] h-[18px] left-0 top-0 text-[15px] leading-[18px] transition-colors duration-200 mb-3"
            style={{ 
              fontFamily: 'var(--font-roboto), Roboto, sans-serif',
              color: '#989898'
            }}
          >
            Converted Amount
          </label>
          
          {/* To Currency */}
          <div className="absolute w-[123px] h-[45px] left-0 top-[36px]">
            <div className={`absolute w-[45px] h-[45px] left-0 top-0 rounded-full overflow-hidden border transition-all duration-200 border-gray-200 ${
              isSwapping ? 'transform -rotate-180 scale-110' : ''
            }`}>
              {renderFlag(toCurrency, isMounted)}
            </div>
            
            {renderCurrencyDropdown(
              toCurrency,
              showToDropdown,
              () => setShowToDropdown(!showToDropdown),
              (currency) => handleCurrencyChange('to', currency),
              toDropdownRef,
              'to'
            )}
          </div>
          
          {/* Converted Amount Display with Enhanced Loading */}
          <div 
            className={`absolute w-[141px] h-[45px] left-[139px] top-[36px] rounded-[7px] flex items-center justify-end px-3 ml-4 transition-all duration-300 ${
              isLoading ? 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-pulse' : ''
            }`}
            style={{ background: isLoading ? undefined : '#EFEFEF' }}
          >
            {isLoading ? (
              <div className="flex items-center justify-end gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce opacity-70"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce opacity-80" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce opacity-90" style={{ animationDelay: '0.3s' }}></div>
              </div>
            ) : (
              <span
                className={`text-right text-[20px] leading-[23px] font-semibold transition-all duration-300 ${
                  convertedAmount && convertedAmount !== '0.00' ? 'animate-fadeIn' : ''
                }`}
                style={{ 
                  fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                  color: '#3C3C3C'
                }}
              >
                {convertedAmount || '0.00'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Exchange Rate Info */}
      <div className="absolute w-[178px] h-[53px] left-[20px] top-[488px] transition-all duration-300">
        <p 
          className="absolute w-[178px] h-[19px] left-0 top-0 text-[16px] leading-[19px] transition-colors duration-200"
          style={{ 
            fontFamily: 'var(--font-roboto), Roboto, sans-serif',
            color: '#A2A2A2'
          }}
        >
          Indicative Exchange Rate
        </p>
        
        <p 
          className="absolute w-[164px] h-[21px] left-0 top-[32px] text-[18px] leading-[21px] font-medium transition-all duration-300"
          style={{ 
            fontFamily: 'var(--font-roboto), Roboto, sans-serif',
            color: '#000000'
          }}
        >
          1 {fromCurrency} = {isLoading ? (
            <span className="inline-flex items-center gap-1">
              <span className="w-8 h-3 bg-gray-200 rounded animate-pulse inline-block"></span>
            </span>
          ) : (
            <span className={exchangeRate && exchangeRate !== '--' ? 'animate-fadeIn' : ''}>
              {exchangeRate || '--'}
            </span>
          )} {toCurrency}
        </p>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className={`absolute w-[320px] left-[20px] top-[560px] p-4 bg-red-50 border border-red-200 rounded-lg transition-all duration-300 transform ${
          error ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700 transition-colors duration-200"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 