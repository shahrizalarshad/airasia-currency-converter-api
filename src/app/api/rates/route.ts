import { NextRequest, NextResponse } from 'next/server';
import { getRates, getSupportedCurrencies } from '@/services/currencyService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeList = searchParams.get('currencies');
    const includeCurrencies = searchParams.get('include_currencies') === 'true';

    // Get latest exchange rates
    const ratesData = await getRates();

    let response: any = {
      success: true,
      data: {
        rates: ratesData.rates,
        baseCurrency: ratesData.baseCurrency,
        timestamp: ratesData.timestamp,
        lastUpdated: new Date(ratesData.timestamp).toISOString()
      }
    };

    // If specific currencies are requested, filter the rates
    if (includeList) {
      const requestedCurrencies = includeList.toUpperCase().split(',').map(c => c.trim());
      const filteredRates: { [key: string]: number } = {};
      
      for (const currency of requestedCurrencies) {
        if (currency === ratesData.baseCurrency) {
          // Base currency has rate of 1
          filteredRates[currency] = 1;
        } else if (ratesData.rates[currency]) {
          filteredRates[currency] = ratesData.rates[currency];
        }
      }
      
      response.data.rates = filteredRates;
      response.data.requestedCurrencies = requestedCurrencies;
      response.data.availableCurrencies = Object.keys(filteredRates);
    }

    // Optionally include supported currencies list
    if (includeCurrencies) {
      const supportedCurrencies = await getSupportedCurrencies();
      response.data.supportedCurrencies = supportedCurrencies;
      response.data.totalCurrencies = supportedCurrencies.length;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Exchange rates API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('OPEN_EXCHANGE_RATES_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'Service configuration error',
            message: 'Exchange rates service is not properly configured'
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
            message: 'Exchange rates service is temporarily unavailable'
          },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching exchange rates'
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