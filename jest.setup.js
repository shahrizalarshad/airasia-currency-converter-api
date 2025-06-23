// jest.setup.js
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    observe() {
        return null;
    }
    disconnect() {
        return null;
    }
    unobserve() {
        return null;
    }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    observe() {
        return null;
    }
    disconnect() {
        return null;
    }
    unobserve() {
        return null;
    }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    value: jest.fn(),
});

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock environment variables
process.env.OPEN_EXCHANGE_RATES_API_KEY = 'test-api-key';
process.env.OER_BASE_URL = 'https://openexchangerates.org/api';

// Setup default fetch mock
beforeEach(() => {
    fetch.mockClear();
}); 