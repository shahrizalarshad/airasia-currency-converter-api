'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';



// Currency to country code mapping for flag API
const CURRENCY_TO_COUNTRY: { [key: string]: string } = {
  USD: 'us',
  EUR: 'eu', 
  GBP: 'gb',
  JPY: 'jp',
  SGD: 'sg',
  AUD: 'au',
  CAD: 'ca',
  CHF: 'ch',
  CNY: 'cn',
  HKD: 'hk',
  INR: 'in',
  KRW: 'kr',
  MYR: 'my',
  THB: 'th',
};

// Circular flag images using circle-flags (better for circular containers)
const renderFlag = (currency: string): React.ReactNode => {
  const countryCode = CURRENCY_TO_COUNTRY[currency];
  
  if (countryCode) {
    return (
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${countryCode}.svg`}
        alt={`${currency} flag`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }
  
  // Fallback for currencies without country mapping
  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-300">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-gray-600 text-xs font-bold">{currency}</div>
      </div>
    </div>
  );
};



const CURRENCIES = ['SGD', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'INR', 'KRW', 'MYR', 'THB'];

export default function FigmaCurrencyConverter() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [fromCurrency, setFromCurrency] = useState<string>('SGD');
  const [toCurrency, setToCurrency] = useState<string>('USD');
  const [amount, setAmount] = useState<string>('1000.00');
  const [convertedAmount, setConvertedAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const keypadRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Haptic feedback simulation
  const vibrate = useCallback(() => {
    if (isMounted && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [isMounted]);

  // Debounced conversion function
  const debouncedConversion = useCallback((from: string, to: string, amountValue: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performConversion(from, to, amountValue);
    }, 500);
  }, []);

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
      
      // Auto-convert with debounce if amount is valid
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0 && fromCurrency !== toCurrency) {
        debouncedConversion(fromCurrency, toCurrency, numValue);
      }
    }
  };

  const handleKeypadInput = (key: string) => {
    vibrate(); // Haptic feedback
    
    if (key === 'clear') {
      setAmount('');
    } else if (key === 'delete') {
      setAmount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        const newAmount = amount + '.';
        setAmount(newAmount);
        handleAmountChange(newAmount);
      }
    } else {
      const newAmount = amount + key;
      setAmount(newAmount);
      handleAmountChange(newAmount);
    }
  };

  const swapCurrencies = async () => {
    vibrate();
    setIsSwapping(true);
    
    const tempFrom = fromCurrency;
    const tempTo = toCurrency;
    
    // Animate swap
    setTimeout(() => {
      setFromCurrency(tempTo);
      setToCurrency(tempFrom);
      setIsSwapping(false);
      
      // Trigger conversion with swapped currencies
      if (amount) {
        performConversion(tempTo, tempFrom, parseFloat(amount));
      }
    }, 300);
  };

  const performConversion = async (from: string, to: string, amountValue: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/convert?from=${from}&to=${to}&amount=${amountValue}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setConvertedAmount(data.data.convertedAmount.toFixed(2));
        setExchangeRate(data.data.rateUsed.toFixed(4));
      } else {
        throw new Error(data.message || 'Conversion failed');
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during conversion');
      vibrate(); // Error feedback
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrencyChange = async (type: 'from' | 'to', currency: string) => {
    vibrate();
    
    if (type === 'from') {
      setFromCurrency(currency);
      if (amount && currency !== toCurrency) {
        await performConversion(currency, toCurrency, parseFloat(amount));
      }
    } else {
      setToCurrency(currency);
      if (amount && fromCurrency !== currency) {
        await performConversion(fromCurrency, currency, parseFloat(amount));
      }
    }
  };

  const handleAmountFocus = () => {
    // Only show keypad on explicit user click/touch
    setShowKeypad(true);
  };

  const handleAmountBlur = () => {
    // Don't auto-hide keypad on blur - let user control it manually
    // setShowKeypad(false);
  };

  // Handle click on amount input to show keypad
  const handleAmountClick = () => {
    setShowKeypad(true);
    inputRef.current?.focus();
  };

  const closeKeypad = () => {
    setShowKeypad(false);
    inputRef.current?.blur();
  };

  // Option 1: Outside-click detection for keypad
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      // Only close if keypad is open and click is outside keypad and amount input
      if (showKeypad && keypadRef.current && inputRef.current) {
        const target = event.target as Node;
        const isClickOutsideKeypad = !keypadRef.current.contains(target);
        const isClickOutsideInput = !inputRef.current.contains(target);
        const isClickOutsideAmountContainer = !(target as Element).closest('[data-amount-container="true"]');
        
        if (isClickOutsideKeypad && isClickOutsideInput && isClickOutsideAmountContainer) {
          closeKeypad();
        }
      }
    };

    // Add event listener when keypad is shown
    if (showKeypad) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showKeypad]);

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Perform initial conversion on component mount
  useEffect(() => {
    if (isMounted && amount && fromCurrency && toCurrency && fromCurrency !== toCurrency) {
      performConversion(fromCurrency, toCurrency, parseFloat(amount));
    }
  }, [isMounted, fromCurrency, toCurrency]); // Only run when mounted or currencies change

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

  return (
    <div className="relative w-[360px] h-[703px] mx-auto transition-all duration-300" style={{ background: '#F7F7F7' }}>
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
        } ${showKeypad ? 'transform scale-[0.98]' : ''}`}
        style={{ 
          background: '#FFFFFF',
          boxShadow: showKeypad ? '0px 8px 25px rgba(0, 0, 0, 0.15)' : '0px 4px 4px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 rounded-[20px] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600 font-medium">Converting...</span>
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
              color: showKeypad ? '#26278D' : '#989898'
            }}
          >
            Amount
          </label>
          
          {/* From Currency */}
          <div className="absolute w-[123px] h-[45px] left-0 top-[36px]">
            <div className={`absolute w-[45px] h-[45px] left-0 top-0 rounded-full overflow-hidden border transition-all duration-200 ${
              isSwapping ? 'transform rotate-180 scale-110' : ''
            } ${
              showKeypad ? 'border-blue-300 shadow-md' : 'border-gray-200'
            }`}>
              {renderFlag(fromCurrency)}
            </div>
            
            <select
              value={fromCurrency}
              onChange={(e) => handleCurrencyChange('from', e.target.value)}
              className="absolute w-[39px] h-[23px] left-[58px] top-[11px] text-[20px] leading-[23px] font-medium bg-transparent border-none outline-none appearance-none cursor-pointer transition-colors duration-200 hover:opacity-80"
              style={{ 
                fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                color: '#26278D' 
              }}
              title="Select source currency"
              aria-label="From currency"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            
            <div className="absolute w-[24px] h-[24px] left-[99px] top-[10px] opacity-50 pointer-events-none transition-transform duration-200 hover:scale-110">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M7 10L12 15L17 10" stroke="#3C3C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          {/* Amount Input */}
          <div 
            className={`absolute w-[141px] h-[45px] left-[139px] top-[36px] rounded-[7px] flex items-center justify-end px-3 transition-all duration-200 ml-4 cursor-pointer ${
              showKeypad ? 'bg-blue-50 ring-2 ring-blue-200' : ''
            }`}
            style={{ background: showKeypad ? '#EFF6FF' : '#EFEFEF' }}
            onClick={handleAmountClick}
            data-amount-container="true"
          >
            <input
              ref={inputRef}
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              className="w-full h-full bg-transparent border-none outline-none text-right text-[20px] leading-[23px] font-semibold transition-colors duration-200"
              style={{ 
                fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                color: showKeypad ? '#1E40AF' : '#3C3C3C'
              }}
              disabled={isLoading}
              title="Enter amount to convert"
              placeholder="0.00"
              aria-label="Amount to convert"
              readOnly
            />
          </div>
        </div>
        
        {/* Divider Line and Swap Button */}
        <div className="absolute w-[280px] h-0 left-[20px] top-[137px] border-t transition-colors duration-200" 
             style={{ borderColor: showKeypad ? '#BFDBFE' : '#E7E7EE' }} />
        
        <button
          onClick={swapCurrencies}
          disabled={isLoading || isSwapping}
          className={`absolute w-[48px] h-[48px] left-[136px] top-[113px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg ${
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
              {renderFlag(toCurrency)}
            </div>
            
            <select
              value={toCurrency}
              onChange={(e) => handleCurrencyChange('to', e.target.value)}
              className="absolute w-[39px] h-[23px] left-[58px] top-[11px] text-[20px] leading-[23px] font-medium bg-transparent border-none outline-none appearance-none cursor-pointer transition-colors duration-200 hover:opacity-80"
              style={{ 
                fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                color: '#26278D' 
              }}
              title="Select target currency"
              aria-label="To currency"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            
            <div className="absolute w-[24px] h-[24px] left-[99px] top-[10px] opacity-50 pointer-events-none transition-transform duration-200 hover:scale-110">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M7 10L12 15L17 10" stroke="#3C3C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          {/* Converted Amount Display */}
          <div 
            className="absolute w-[141px] h-[45px] left-[139px] top-[36px] rounded-[7px] flex items-center justify-end px-3 transition-all duration-200 ml-4"
            style={{ background: '#EFEFEF' }}
          >
                          <span
                className="text-right text-[20px] leading-[23px] font-semibold transition-all duration-200"
                style={{ 
                  fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                  color: '#3C3C3C'
                }}
            >
              {isLoading ? (
                <div className="flex items-center justify-end gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              ) : (convertedAmount || '0.00')}
            </span>
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
          className="absolute w-[164px] h-[21px] left-0 top-[32px] text-[18px] leading-[21px] font-medium transition-all duration-200"
          style={{ 
            fontFamily: 'var(--font-roboto), Roboto, sans-serif',
            color: '#000000'
          }}
        >
          1 {fromCurrency} = {exchangeRate || '--'} {toCurrency}
        </p>
      </div>
      
      {/* Numeric Keypad Overlay */}
      {showKeypad && (
        <div 
          ref={keypadRef}
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 rounded-t-[20px] p-4 z-50 transition-all duration-500 transform shadow-2xl translate-y-0" 
          style={{ height: '350px' }}
        >
          <div className="w-full max-w-[320px] mx-auto">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer hover:bg-gray-400 transition-colors duration-200" 
                 onClick={closeKeypad}></div>
            
            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Row 1 */}
              <button
                onClick={() => handleKeypadInput('1')}
                className="h-[60px] bg-gray-100 rounded-lg flex items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                1
              </button>
              <button
                onClick={() => handleKeypadInput('2')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>2</span>
                <span className="text-[10px] text-gray-500 leading-none">ABC</span>
              </button>
              <button
                onClick={() => handleKeypadInput('3')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>3</span>
                <span className="text-[10px] text-gray-500 leading-none">DEF</span>
              </button>
              
              {/* Row 2 */}
              <button
                onClick={() => handleKeypadInput('4')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>4</span>
                <span className="text-[10px] text-gray-500 leading-none">GHI</span>
              </button>
              <button
                onClick={() => handleKeypadInput('5')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>5</span>
                <span className="text-[10px] text-gray-500 leading-none">JKL</span>
              </button>
              <button
                onClick={() => handleKeypadInput('6')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>6</span>
                <span className="text-[10px] text-gray-500 leading-none">MNO</span>
              </button>
              
              {/* Row 3 */}
              <button
                onClick={() => handleKeypadInput('7')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>7</span>
                <span className="text-[10px] text-gray-500 leading-none">PQRS</span>
              </button>
              <button
                onClick={() => handleKeypadInput('8')}  
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>8</span>
                <span className="text-[10px] text-gray-500 leading-none">TUV</span>
              </button>
              <button
                onClick={() => handleKeypadInput('9')}
                className="h-[60px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                <span>9</span>
                <span className="text-[10px] text-gray-500 leading-none">WXYZ</span>
              </button>
              
              {/* Row 4 */}
              <button
                onClick={() => handleKeypadInput('*')}
                className="h-[60px] bg-gray-100 rounded-lg flex items-center justify-center text-[16px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                + * #
              </button>
              <button
                onClick={() => handleKeypadInput('0')}
                className="h-[60px] bg-gray-100 rounded-lg flex items-center justify-center text-[24px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                0
              </button>
              <button
                onClick={() => handleKeypadInput('delete')}
                className="h-[60px] bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 active:bg-gray-400 transition-all duration-150 transform active:scale-95"
                aria-label="Delete last digit"
                title="Delete"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M19 11H7L12 6M7 11L12 16" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            {/* Decimal Point and Close */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => handleKeypadInput('.')}
                className="w-[80px] h-[50px] bg-blue-100 rounded-lg flex items-center justify-center text-[24px] font-medium hover:bg-blue-200 active:bg-blue-300 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                .
              </button>
              <button
                onClick={closeKeypad}
                className="w-[80px] h-[50px] bg-blue-600 text-white rounded-lg flex items-center justify-center text-[14px] font-medium hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 transform active:scale-95"
                style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
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