'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getFavorites, addToFavorites, removeFromFavorites, addToRecent, getSmartSortedCurrencies } from '@/lib/favorites';

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
  // Major currencies
  USD: { name: 'US Dollar', flag: '🇺🇸' },
  EUR: { name: 'Euro', flag: '🇪🇺' },
  GBP: { name: 'British Pound', flag: '🇬🇧' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦' },
  CHF: { name: 'Swiss Franc', flag: '🇨🇭' },
  
  // Asian currencies
  CNY: { name: 'Chinese Yuan', flag: '🇨🇳' },
  CNH: { name: 'Chinese Yuan (Offshore)', flag: '🇨🇳' },
  SGD: { name: 'Singapore Dollar', flag: '🇸🇬' },
  HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰' },
  INR: { name: 'Indian Rupee', flag: '🇮🇳' },
  KRW: { name: 'South Korean Won', flag: '🇰🇷' },
  MYR: { name: 'Malaysian Ringgit', flag: '🇲🇾' },
  THB: { name: 'Thai Baht', flag: '🇹🇭' },
  PHP: { name: 'Philippine Peso', flag: '🇵🇭' },
  IDR: { name: 'Indonesian Rupiah', flag: '🇮🇩' },
  VND: { name: 'Vietnamese Dong', flag: '🇻🇳' },
  TWD: { name: 'Taiwan Dollar', flag: '🇹🇼' },
  PKR: { name: 'Pakistani Rupee', flag: '🇵🇰' },
  BDT: { name: 'Bangladeshi Taka', flag: '🇧🇩' },
  LKR: { name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  NPR: { name: 'Nepalese Rupee', flag: '🇳🇵' },
  BTN: { name: 'Bhutanese Ngultrum', flag: '🇧🇹' },
  MVR: { name: 'Maldivian Rufiyaa', flag: '🇲🇻' },
  AFN: { name: 'Afghan Afghani', flag: '🇦🇫' },
  LAK: { name: 'Laotian Kip', flag: '🇱🇦' },
  KHR: { name: 'Cambodian Riel', flag: '🇰🇭' },
  MMK: { name: 'Myanmar Kyat', flag: '🇲🇲' },
  BND: { name: 'Brunei Dollar', flag: '🇧🇳' },
  MOP: { name: 'Macanese Pataca', flag: '🇲🇴' },
  MNT: { name: 'Mongolian Tugrik', flag: '🇲🇳' },
  KPW: { name: 'North Korean Won', flag: '🇰🇵' },
  
  // Middle East & Africa
  AED: { name: 'UAE Dirham', flag: '🇦🇪' },
  SAR: { name: 'Saudi Riyal', flag: '🇸🇦' },
  QAR: { name: 'Qatari Riyal', flag: '🇶🇦' },
  KWD: { name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  BHD: { name: 'Bahraini Dinar', flag: '🇧🇭' },
  OMR: { name: 'Omani Rial', flag: '🇴🇲' },
  JOD: { name: 'Jordanian Dinar', flag: '🇯🇴' },
  ILS: { name: 'Israeli Shekel', flag: '🇮🇱' },
  LBP: { name: 'Lebanese Pound', flag: '🇱🇧' },
  SYP: { name: 'Syrian Pound', flag: '🇸🇾' },
  IRR: { name: 'Iranian Rial', flag: '🇮🇷' },
  IQD: { name: 'Iraqi Dinar', flag: '🇮🇶' },
  YER: { name: 'Yemeni Rial', flag: '🇾🇪' },
  TRY: { name: 'Turkish Lira', flag: '🇹🇷' },
  EGP: { name: 'Egyptian Pound', flag: '🇪🇬' },
  TND: { name: 'Tunisian Dinar', flag: '🇹🇳' },
  MAD: { name: 'Moroccan Dirham', flag: '🇲🇦' },
  DZD: { name: 'Algerian Dinar', flag: '🇩🇿' },
  LYD: { name: 'Libyan Dinar', flag: '🇱🇾' },
  SDG: { name: 'Sudanese Pound', flag: '🇸🇩' },
  ETB: { name: 'Ethiopian Birr', flag: '🇪🇹' },
  KES: { name: 'Kenyan Shilling', flag: '🇰🇪' },
  UGX: { name: 'Ugandan Shilling', flag: '🇺🇬' },
  TZS: { name: 'Tanzanian Shilling', flag: '🇹🇿' },
  RWF: { name: 'Rwandan Franc', flag: '🇷🇼' },
  BIF: { name: 'Burundian Franc', flag: '🇧🇮' },
  NGN: { name: 'Nigerian Naira', flag: '🇳🇬' },
  GHS: { name: 'Ghanaian Cedi', flag: '🇬🇭' },
  ZAR: { name: 'South African Rand', flag: '🇿🇦' },
  BWP: { name: 'Botswana Pula', flag: '🇧🇼' },
  LSL: { name: 'Lesotho Loti', flag: '🇱🇸' },
  SZL: { name: 'Swazi Lilangeni', flag: '🇸🇿' },
  NAD: { name: 'Namibian Dollar', flag: '🇳🇦' },
  MWK: { name: 'Malawian Kwacha', flag: '🇲🇼' },
  ZMW: { name: 'Zambian Kwacha', flag: '🇿🇲' },
  ZWL: { name: 'Zimbabwean Dollar', flag: '🇿🇼' },
  AOA: { name: 'Angolan Kwanza', flag: '🇦🇴' },
  MZN: { name: 'Mozambican Metical', flag: '🇲🇿' },
  MGA: { name: 'Malagasy Ariary', flag: '🇲🇬' },
  MUR: { name: 'Mauritian Rupee', flag: '🇲🇺' },
  SCR: { name: 'Seychellois Rupee', flag: '🇸🇨' },
  KMF: { name: 'Comorian Franc', flag: '🇰🇲' },
  DJF: { name: 'Djiboutian Franc', flag: '🇩🇯' },
  ERN: { name: 'Eritrean Nakfa', flag: '🇪🇷' },
  SOS: { name: 'Somali Shilling', flag: '🇸🇴' },
  CDF: { name: 'Congolese Franc', flag: '🇨🇩' },
  GMD: { name: 'Gambian Dalasi', flag: '🇬🇲' },
  GNF: { name: 'Guinean Franc', flag: '🇬🇳' },
  SLL: { name: 'Sierra Leonean Leone', flag: '🇸🇱' },
  LRD: { name: 'Liberian Dollar', flag: '🇱🇷' },
  CVE: { name: 'Cape Verdean Escudo', flag: '🇨🇻' },
  STN: { name: 'São Tomé and Príncipe Dobra', flag: '🇸🇹' },
  STD: { name: 'São Tomé and Príncipe Dobra (old)', flag: '🇸🇹' },
  XOF: { name: 'West African CFA Franc', flag: '🌍' },
  XAF: { name: 'Central African CFA Franc', flag: '🌍' },
  
  // European currencies
  SEK: { name: 'Swedish Krona', flag: '🇸🇪' },
  NOK: { name: 'Norwegian Krone', flag: '🇳🇴' },
  DKK: { name: 'Danish Krone', flag: '🇩🇰' },
  PLN: { name: 'Polish Zloty', flag: '🇵🇱' },
  CZK: { name: 'Czech Koruna', flag: '🇨🇿' },
  HUF: { name: 'Hungarian Forint', flag: '🇭🇺' },
  RON: { name: 'Romanian Leu', flag: '🇷🇴' },
  BGN: { name: 'Bulgarian Lev', flag: '🇧🇬' },
  HRK: { name: 'Croatian Kuna', flag: '🇭🇷' },
  RSD: { name: 'Serbian Dinar', flag: '🇷🇸' },
  BAM: { name: 'Bosnia-Herzegovina Convertible Mark', flag: '🇧🇦' },
  MKD: { name: 'North Macedonian Denar', flag: '🇲🇰' },
  ALL: { name: 'Albanian Lek', flag: '🇦🇱' },
  MDL: { name: 'Moldovan Leu', flag: '🇲🇩' },
  UAH: { name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
  BYN: { name: 'Belarusian Ruble', flag: '🇧🇾' },
  RUB: { name: 'Russian Ruble', flag: '🇷🇺' },
  ISK: { name: 'Icelandic Krona', flag: '🇮🇸' },
  
  // Central Asia & Caucasus
  KZT: { name: 'Kazakhstani Tenge', flag: '🇰🇿' },
  UZS: { name: 'Uzbekistani Som', flag: '🇺🇿' },
  KGS: { name: 'Kyrgyzstani Som', flag: '🇰🇬' },
  TJS: { name: 'Tajikistani Somoni', flag: '🇹🇯' },
  TMT: { name: 'Turkmenistani Manat', flag: '🇹🇲' },
  AZN: { name: 'Azerbaijani Manat', flag: '🇦🇿' },
  AMD: { name: 'Armenian Dram', flag: '🇦🇲' },
  GEL: { name: 'Georgian Lari', flag: '🇬🇪' },
  
  // Americas
  BRL: { name: 'Brazilian Real', flag: '🇧🇷' },
  MXN: { name: 'Mexican Peso', flag: '🇲🇽' },
  ARS: { name: 'Argentine Peso', flag: '🇦🇷' },
  CLP: { name: 'Chilean Peso', flag: '🇨🇱' },
  COP: { name: 'Colombian Peso', flag: '🇨🇴' },
  PEN: { name: 'Peruvian Sol', flag: '🇵🇪' },
  UYU: { name: 'Uruguayan Peso', flag: '🇺🇾' },
  PYG: { name: 'Paraguayan Guarani', flag: '🇵🇾' },
  BOB: { name: 'Bolivian Boliviano', flag: '🇧🇴' },
  VES: { name: 'Venezuelan Bolívar', flag: '🇻🇪' },
  GYD: { name: 'Guyanese Dollar', flag: '🇬🇾' },
  SRD: { name: 'Surinamese Dollar', flag: '🇸🇷' },
  TTD: { name: 'Trinidad and Tobago Dollar', flag: '🇹🇹' },
  JMD: { name: 'Jamaican Dollar', flag: '🇯🇲' },
  BBD: { name: 'Barbadian Dollar', flag: '🇧🇧' },
  BSD: { name: 'Bahamian Dollar', flag: '🇧🇸' },
  BZD: { name: 'Belize Dollar', flag: '🇧🇿' },
  GTQ: { name: 'Guatemalan Quetzal', flag: '🇬🇹' },
  HNL: { name: 'Honduran Lempira', flag: '🇭🇳' },
  NIO: { name: 'Nicaraguan Córdoba', flag: '🇳🇮' },
  CRC: { name: 'Costa Rican Colón', flag: '🇨🇷' },
  PAB: { name: 'Panamanian Balboa', flag: '🇵🇦' },
  DOP: { name: 'Dominican Peso', flag: '🇩🇴' },
  HTG: { name: 'Haitian Gourde', flag: '🇭🇹' },
  CUP: { name: 'Cuban Peso', flag: '🇨🇺' },
  CUC: { name: 'Cuban Convertible Peso', flag: '🇨🇺' },
  
  // Asia-Pacific
  NZD: { name: 'New Zealand Dollar', flag: '🇳🇿' },
  FJD: { name: 'Fijian Dollar', flag: '🇫🇯' },
  PGK: { name: 'Papua New Guinea Kina', flag: '🇵🇬' },
  VUV: { name: 'Vanuatu Vatu', flag: '🇻🇺' },
  WST: { name: 'Samoan Tala', flag: '🇼🇸' },
  TOP: { name: 'Tongan Paʻanga', flag: '🇹🇴' },
  SBD: { name: 'Solomon Islands Dollar', flag: '🇸🇧' },
  
  // Caribbean & Small Islands
  XCD: { name: 'East Caribbean Dollar', flag: '🏝️' },
  AWG: { name: 'Aruban Florin', flag: '🇦🇼' },
  ANG: { name: 'Netherlands Antillean Guilder', flag: '🇨🇼' },
  KYD: { name: 'Cayman Islands Dollar', flag: '🇰🇾' },
  BMD: { name: 'Bermudian Dollar', flag: '🇧🇲' },
  
  // British Territories
  GIP: { name: 'Gibraltar Pound', flag: '🇬🇮' },
  FKP: { name: 'Falkland Islands Pound', flag: '🇫🇰' },
  SHP: { name: 'Saint Helena Pound', flag: '🇸🇭' },
  JEP: { name: 'Jersey Pound', flag: '🇯🇪' },
  GGP: { name: 'Guernsey Pound', flag: '🇬🇬' },
  IMP: { name: 'Isle of Man Pound', flag: '🇮🇲' },
  
  // Precious Metals
  XAU: { name: 'Gold', flag: '🥇' },
  XAG: { name: 'Silver', flag: '🥈' },
  XPT: { name: 'Platinum', flag: '⚪' },
  XPD: { name: 'Palladium', flag: '⚫' },
  
  // Special
  XDR: { name: 'Special Drawing Rights', flag: '🏛️' },
  XPF: { name: 'CFP Franc', flag: '🏝️' },
  CLF: { name: 'Chilean Unit of Account', flag: '🇨🇱' },
  MRU: { name: 'Mauritanian Ouguiya', flag: '🇲🇷' },
  SSP: { name: 'South Sudanese Pound', flag: '🇸🇸' },
  SVC: { name: 'Salvadoran Colón', flag: '🇸🇻' },
  
  // Crypto
  BTC: { name: 'Bitcoin', flag: '₿' },
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load favorites on mount
  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  // Use existing sorted currencies for now (we'll enhance this later)
  const filteredCurrencies = sortedCurrencies.filter(currency => 
    currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currencyInfo[currency]?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={className} ref={dropdownRef}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-12 px-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <div className="text-lg">
              {currencyInfo[value]?.flag}
            </div>
            <span className="font-medium text-gray-900">
              {value}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search currencies..."
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

                         <div className="overflow-y-auto max-h-48">
               {filteredCurrencies.length === 0 ? (
                 <div className="px-4 py-3 text-gray-500 text-sm">
                   No currencies found
                 </div>
               ) : (
                 filteredCurrencies.map((currency) => {
                   const isFavorite = favorites.includes(currency);
                   
                   return (
                     <div
                       key={currency}
                       onClick={() => {
                         onChange(currency);
                         addToRecent(currency);
                         setIsOpen(false);
                         setSearchTerm('');
                       }}
                       className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between group ${
                         currency === value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                         <div className="text-lg">
                           {currencyInfo[currency]?.flag}
                         </div>
                         <div>
                           <div className="font-medium">
                             {currency}
                             {isFavorite && (
                               <span className="ml-2 text-yellow-500 text-xs">★</span>
                             )}
                           </div>
                           <div className="text-sm text-gray-500">
                             {currencyInfo[currency]?.name}
                           </div>
                         </div>
                       </div>
                       
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           const newFavorites = isFavorite 
                             ? favorites.filter(fav => fav !== currency)
                             : [...favorites, currency];
                           setFavorites(newFavorites);
                           if (isFavorite) {
                             removeFromFavorites(currency);
                           } else {
                             addToFavorites(currency);
                           }
                         }}
                         className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-gray-100 ${
                           isFavorite ? 'text-yellow-500 opacity-100' : 'text-gray-400'
                         }`}
                         title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                       >
                         <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                         </svg>
                       </button>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        )}
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