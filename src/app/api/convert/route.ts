import { NextRequest, NextResponse } from 'next/server';
import { convertCurrency, isValidCurrencyCode } from '@/services/currencyService';
import currencyDB from '@/lib/memoryDB';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amountParam = searchParams.get('amount');

    // Validate required parameters
    if (!from || !to || !amountParam) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          message: 'Please provide from, to, and amount query parameters',
          example: '/api/convert?from=USD&to=EUR&amount=100'
        },
        { status: 400 }
      );
    }

    // Validate currency codes format
    if (!isValidCurrencyCode(from.toUpperCase())) {
      return NextResponse.json(
        { 
          error: 'Invalid from currency',
          message: 'From currency must be a valid 3-letter currency code (e.g., USD, EUR, GBP)'
        },
        { status: 400 }
      );
    }

    if (!isValidCurrencyCode(to.toUpperCase())) {
      return NextResponse.json(
        { 
          error: 'Invalid to currency',
          message: 'To currency must be a valid 3-letter currency code (e.g., USD, EUR, GBP)'
        },
        { status: 400 }
      );
    }

    // Validate and parse amount
    const amount = parseFloat(amountParam);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid amount',
          message: 'Amount must be a positive number greater than 0'
        },
        { status: 400 }
      );
    }

    // Check for reasonable amount limits (optional - adjust as needed)
    if (amount > 1000000000) { // 1 billion limit
      return NextResponse.json(
        { 
          error: 'Amount too large',
          message: 'Amount must be less than 1,000,000,000'
        },
        { status: 400 }
      );
    }

    // Perform currency conversion
    const startTime = Date.now();
    const result = await convertCurrency(from, to, amount);
    const responseTime = Date.now() - startTime;

    // Log conversion to database
    const userAgent = request.headers.get('user-agent') || 'unknown';
    currencyDB.logConversion(
      result.fromCurrency,
      result.toCurrency,
      result.originalAmount,
      result.convertedAmount,
      result.rateUsed,
      userAgent
    );

    // Log API usage
    currencyDB.logAPIUsage('/api/convert', 'GET', responseTime, 200, userAgent);

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('Currency conversion API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not supported') || error.message.includes('not available')) {
        return NextResponse.json(
          { 
            error: 'Unsupported currency',
            message: error.message
          },
          { status: 400 }
        );
      }

      if (error.message.includes('OPEN_EXCHANGE_RATES_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'Service configuration error',
            message: 'Currency conversion service is not properly configured'
          },
          { status: 500 }
        );
      }

      if (error.message.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.'
          },
          { status: 429 }
        );
      }

      if (error.message.includes('Unable to connect')) {
        return NextResponse.json(
          { 
            error: 'Service unavailable',
            message: 'Currency conversion service is temporarily unavailable'
          },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests'
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests'
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests'
    },
    { status: 405 }
  );
} 