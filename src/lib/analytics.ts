export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface ConversionMetric {
  from: string;
  to: string;
  amount: number;
  duration: number;
  success: boolean;
  attempts: number;
  timestamp: number;
}

// Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }  // Time to First Byte
};

// Get rating based on metric value
const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

// Store metrics in memory (in production, you'd send to analytics service)
const performanceMetrics: PerformanceMetric[] = [];
const conversionMetrics: ConversionMetric[] = [];

// Track Web Vitals
export const trackWebVitals = () => {
  if (typeof window === 'undefined') return;

  // Polyfill for web-vitals library functionality
  const trackMetric = (name: string, value: number) => {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: getRating(name, value),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    performanceMetrics.push(metric);
    console.log(`🔍 ${name}: ${value}ms (${metric.rating})`);
    
    // In production, send to analytics service
    // sendToAnalytics(metric);
  };

  // Track Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          trackMetric('LCP', lastEntry.startTime);
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP tracking failed:', error);
    }
  }

  // Track First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            trackMetric('FID', entry.processingStart - entry.startTime);
          }
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID tracking failed:', error);
    }
  }

  // Track Cumulative Layout Shift (CLS)
  if ('PerformanceObserver' in window) {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        trackMetric('CLS', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS tracking failed:', error);
    }
  }

  // Track First Contentful Paint (FCP)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            trackMetric('FCP', entry.startTime);
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('FCP tracking failed:', error);
    }
  }

  // Track Time to First Byte (TTFB)
  if ('performance' in window && 'timing' in performance) {
    window.addEventListener('load', () => {
      const timing = performance.timing;
      const ttfb = timing.responseStart - timing.navigationStart;
      trackMetric('TTFB', ttfb);
    });
  }
};

// Track conversion performance
export const trackConversion = (
  from: string,
  to: string,
  amount: number,
  startTime: number,
  success: boolean,
  attempts: number = 1
) => {
  const metric: ConversionMetric = {
    from,
    to,
    amount,
    duration: Date.now() - startTime,
    success,
    attempts,
    timestamp: Date.now()
  };
  
  conversionMetrics.push(metric);
  
  const status = success ? '✅' : '❌';
  console.log(`💱 ${status} Conversion ${from}→${to}: ${metric.duration}ms (${attempts} attempts)`);
  
  // In production, send to analytics service
  // sendToAnalytics({ type: 'conversion', ...metric });
};

// Get performance summary
export const getPerformanceSummary = () => {
  const webVitals = performanceMetrics.reduce((acc, metric) => {
    if (!acc[metric.name]) acc[metric.name] = [];
    acc[metric.name].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  const conversions = {
    total: conversionMetrics.length,
    successful: conversionMetrics.filter(m => m.success).length,
    failed: conversionMetrics.filter(m => !m.success).length,
    averageDuration: conversionMetrics.length > 0 
      ? Math.round(conversionMetrics.reduce((sum, m) => sum + m.duration, 0) / conversionMetrics.length)
      : 0,
    averageAttempts: conversionMetrics.length > 0
      ? Math.round(conversionMetrics.reduce((sum, m) => sum + m.attempts, 0) / conversionMetrics.length * 10) / 10
      : 0
  };

  return { webVitals, conversions };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  if (typeof window !== 'undefined') {
    // Initialize tracking on client side
    trackWebVitals();
  }

  return {
    trackConversion,
    getPerformanceSummary
  };
}; 