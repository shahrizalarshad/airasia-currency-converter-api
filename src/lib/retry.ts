export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  data?: T;
  error?: Error;
  attempts: number;
  success: boolean;
}

// Default retry condition - retry on network errors and 5xx server errors
const defaultRetryCondition = (error: any): boolean => {
  // Network errors
  if (!navigator.onLine) return true;
  if (error.message?.includes('Failed to fetch')) return true;
  if (error.message?.includes('Network request failed')) return true;
  
  // HTTP status code based retries
  if (error.status) {
    // Retry on server errors (5xx) and rate limiting (429)
    return error.status >= 500 || error.status === 429;
  }
  
  return false;
};

// Sleep utility for delays
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff with jitter
const calculateDelay = (
  attempt: number, 
  baseDelay: number, 
  maxDelay: number, 
  backoffFactor: number
): number => {
  const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
};

// Main retry function with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition
  } = options;

  let lastError: Error;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;
    
    try {
      const data = await operation();
      return { data, attempts, success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt or retry condition fails
      if (attempt === maxAttempts || !retryCondition(error)) {
        break;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, baseDelay, maxDelay, backoffFactor);
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await sleep(delay);
    }
  }

  return { error: lastError!, attempts, success: false };
}

// HTTP-specific retry wrapper
export async function retryHttpRequest<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<RetryResult<T>> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    return response.json();
  }, retryOptions);
}

// Network status utilities
export const isOnline = (): boolean => {
  // On server side, assume we're online
  if (typeof window === 'undefined') return true;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const waitForOnline = (): Promise<void> => {
  return new Promise((resolve) => {
    // On server side, resolve immediately
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    
    if (isOnline()) {
      resolve();
      return;
    }
    
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };
    
    window.addEventListener('online', handleOnline);
  });
}; 