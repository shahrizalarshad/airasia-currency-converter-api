import { NextRequest, NextResponse } from 'next/server';
import currencyDB from '@/lib/memoryDB';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const includeHistory = searchParams.get('include_history') === 'true';
    const includeRaw = searchParams.get('include_raw') === 'true';

    // Get database statistics
    const dbStats = currencyDB.getStats();
    
    // Get API usage statistics
    const apiStats = currencyDB.getAPIStats(hours);
    
    // Get conversion history if requested
    let conversionHistory = null;
    if (includeHistory) {
      conversionHistory = currencyDB.getConversionHistory(50); // Last 50 conversions
    }

    // Get raw database data if requested (for debugging)
    let rawData = null;
    if (includeRaw) {
      const db = currencyDB.getDB();
      rawData = {
        tables: db.listTables(),
        totalRecords: dbStats.reduce((sum: number, table: any) => sum + table.totalRecords, 0)
      };
    }

    const responseTime = Date.now() - startTime;

    // Clean up expired records
    const cleanedRecords = currencyDB.cleanup();

    const response = {
      success: true,
      data: {
        database: {
          tables: dbStats,
          cleanedRecords,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        },
        api: {
          ...apiStats,
          periodHours: hours
        },
        performance: {
          responseTime,
          timestamp: Date.now()
        },
        ...(conversionHistory && { conversionHistory }),
        ...(rawData && { rawData })
      }
    };

    // Log this API call
    const userAgent = request.headers.get('user-agent') || 'unknown';
    currencyDB.logAPIUsage('/api/stats', 'GET', responseTime, 200, userAgent);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Stats API error:', error);

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching statistics'
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