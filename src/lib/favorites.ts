const FAVORITES_KEY = 'currency-converter-favorites';
const RECENT_KEY = 'currency-converter-recent';

export interface FavoriteCurrency {
  code: string;
  name: string;
  lastUsed: number;
}

// Get favorite currencies from localStorage
export const getFavorites = (): string[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
};

// Add currency to favorites
export const addToFavorites = (currency: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavorites();
    if (!favorites.includes(currency)) {
      const updated = [...favorites, currency];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
};

// Remove currency from favorites
export const removeFromFavorites = (currency: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavorites();
    const updated = favorites.filter(fav => fav !== currency);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
};

// Get recently used currencies
export const getRecentCurrencies = (): string[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading recent currencies:', error);
    return [];
  }
};

// Add currency to recent list
export const addToRecent = (currency: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentCurrencies();
    // Remove if already exists
    const filtered = recent.filter(curr => curr !== currency);
    // Add to beginning, keep only last 5
    const updated = [currency, ...filtered].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding to recent:', error);
  }
};

// Get smart-sorted currencies (favorites first, then recent, then alphabetical)
export const getSmartSortedCurrencies = (allCurrencies: string[]): string[] => {
  const favorites = getFavorites();
  const recent = getRecentCurrencies();
  
  // Create sections
  const favoritesSection = allCurrencies.filter(curr => favorites.includes(curr));
  const recentSection = allCurrencies.filter(curr => 
    recent.includes(curr) && !favorites.includes(curr)
  );
  const othersSection = allCurrencies.filter(curr => 
    !favorites.includes(curr) && !recent.includes(curr)
  );
  
  return [...favoritesSection, ...recentSection, ...othersSection];
}; 