// Enhanced In-Memory Database for Currency Converter
// Similar to H2 database but using Node.js/TypeScript

interface TableSchema {
  [key: string]: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

interface DBRecord {
  id: string;
  data: any;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

interface QueryOptions {
  where?: { [key: string]: any };
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

class InMemoryDB {
  private tables: Map<string, Map<string, DBRecord>> = new Map();
  private schemas: Map<string, TableSchema> = new Map();
  private indexes: Map<string, Map<string, Map<string, Set<string>>>> = new Map();

  // Create a table with schema
  createTable(tableName: string, schema: TableSchema): void {
    if (this.tables.has(tableName)) {
      throw new Error(`Table '${tableName}' already exists`);
    }
    
    this.tables.set(tableName, new Map());
    this.schemas.set(tableName, schema);
    this.indexes.set(tableName, new Map<string, Map<string, Set<string>>>());
    
    console.log(`✅ Created table: ${tableName}`);
  }

  // Insert data into table
  insert(tableName: string, data: any, ttlHours?: number): string {
    const table = this.getTable(tableName);
    const schema = this.schemas.get(tableName);
    
    if (!schema) {
      throw new Error(`Schema not found for table '${tableName}'`);
    }

    // Validate data against schema
    this.validateData(data, schema);

    const id = this.generateId();
    const now = Date.now();
    const record: DBRecord = {
      id,
      data,
      createdAt: now,
      updatedAt: now,
      expiresAt: ttlHours ? now + (ttlHours * 60 * 60 * 1000) : undefined
    };

    table.set(id, record);
    this.updateIndexes(tableName, id, data);
    
    return id;
  }

  // Find records by query
  find(tableName: string, options: QueryOptions = {}): DBRecord[] {
    const table = this.getTable(tableName);
    let records = Array.from(table.values());

    // Filter expired records
    records = records.filter(record => 
      !record.expiresAt || Date.now() < record.expiresAt
    );

    // Apply where clause
    if (options.where) {
      records = records.filter(record => 
        this.matchesWhere(record.data, options.where!)
      );
    }

    // Apply ordering
    if (options.orderBy) {
      records.sort((a, b) => {
        const aVal = this.getNestedValue(a.data, options.orderBy!);
        const bVal = this.getNestedValue(b.data, options.orderBy!);
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.orderDirection === 'DESC' ? -comparison : comparison;
      });
    }

    // Apply pagination
    if (options.offset) {
      records = records.slice(options.offset);
    }
    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  // Find single record by ID
  findById(tableName: string, id: string): DBRecord | null {
    const table = this.getTable(tableName);
    const record = table.get(id);
    
    if (!record) return null;
    
    // Check if expired
    if (record.expiresAt && Date.now() > record.expiresAt) {
      table.delete(id);
      return null;
    }
    
    return record;
  }

  // Update record
  update(tableName: string, id: string, data: Partial<any>): boolean {
    const table = this.getTable(tableName);
    const record = table.get(id);
    
    if (!record) return false;
    
    // Check if expired
    if (record.expiresAt && Date.now() > record.expiresAt) {
      table.delete(id);
      return false;
    }

    const schema = this.schemas.get(tableName)!;
    const updatedData = { ...record.data, ...data };
    this.validateData(updatedData, schema);

    record.data = updatedData;
    record.updatedAt = Date.now();
    
    this.updateIndexes(tableName, id, updatedData);
    return true;
  }

  // Delete record
  delete(tableName: string, id: string): boolean {
    const table = this.getTable(tableName);
    return table.delete(id);
  }

  // Count records
  count(tableName: string, options: QueryOptions = {}): number {
    return this.find(tableName, options).length;
  }

  // Clear expired records
  cleanupExpired(): number {
    let deletedCount = 0;
    const now = Date.now();
    
    for (const [tableName, table] of this.tables) {
      for (const [id, record] of table) {
        if (record.expiresAt && now > record.expiresAt) {
          table.delete(id);
          deletedCount++;
        }
      }
    }
    
    return deletedCount;
  }

  // Get table statistics
  getStats(tableName: string): any {
    const table = this.getTable(tableName);
    const records = Array.from(table.values());
    const now = Date.now();
    
    const active = records.filter(r => !r.expiresAt || r.expiresAt > now);
    const expired = records.filter(r => r.expiresAt && r.expiresAt <= now);
    
    return {
      tableName,
      totalRecords: records.length,
      activeRecords: active.length,
      expiredRecords: expired.length,
      memoryUsage: this.estimateMemoryUsage(records)
    };
  }

  // Drop table
  dropTable(tableName: string): void {
    this.tables.delete(tableName);
    this.schemas.delete(tableName);
    this.indexes.delete(tableName);
    console.log(`🗑️ Dropped table: ${tableName}`);
  }

  // List all tables
  listTables(): string[] {
    return Array.from(this.tables.keys());
  }

  // Private helper methods
  private getTable(tableName: string): Map<string, DBRecord> {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    return table;
  }

  private validateData(data: any, schema: TableSchema): void {
    for (const [field, type] of Object.entries(schema)) {
      if (data[field] !== undefined) {
        const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
        if (actualType !== type) {
          throw new Error(`Field '${field}' expected ${type}, got ${actualType}`);
        }
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private matchesWhere(data: any, where: { [key: string]: any }): boolean {
    for (const [key, value] of Object.entries(where)) {
      const dataValue = this.getNestedValue(data, key);
      if (dataValue !== value) {
        return false;
      }
    }
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private updateIndexes(tableName: string, id: string, data: any): void {
    const tableIndexes = this.indexes.get(tableName)!;
    
    // Simple indexing for searchable fields
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number') {
        if (!tableIndexes.has(field)) {
          tableIndexes.set(field, new Map<string, Set<string>>());
        }
        const fieldIndex = tableIndexes.get(field)!;
        if (!fieldIndex.has(String(value))) {
          fieldIndex.set(String(value), new Set<string>());
        }
        fieldIndex.get(String(value))!.add(id);
      }
    }
  }

  private estimateMemoryUsage(records: DBRecord[]): string {
    const size = JSON.stringify(records).length;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }
}

// Currency-specific database setup
class CurrencyDB {
  private db: InMemoryDB;

  constructor() {
    this.db = new InMemoryDB();
    this.initializeTables();
  }

  private initializeTables(): void {
    // Exchange rates table
    this.db.createTable('exchange_rates', {
      baseCurrency: 'string',
      rates: 'object',
      timestamp: 'number',
      source: 'string'
    });

    // Conversion history table
    this.db.createTable('conversion_history', {
      fromCurrency: 'string',
      toCurrency: 'string',
      amount: 'number',
      convertedAmount: 'number',
      rate: 'number',
      timestamp: 'number',
      userAgent: 'string'
    });

    // Currency metadata table
    this.db.createTable('currency_metadata', {
      code: 'string',
      name: 'string',
      symbol: 'string',
      country: 'string',
      isActive: 'boolean'
    });

    // API usage tracking
    this.db.createTable('api_usage', {
      endpoint: 'string',
      method: 'string',
      responseTime: 'number',
      statusCode: 'number',
      timestamp: 'number',
      userAgent: 'string'
    });
  }

  // Exchange rates operations
  saveExchangeRates(baseCurrency: string, rates: any, source: string = 'openexchangerates'): string {
    return this.db.insert('exchange_rates', {
      baseCurrency,
      rates,
      timestamp: Date.now(),
      source
    }, 1); // 1 hour TTL
  }

  getLatestExchangeRates(baseCurrency: string = 'USD'): any | null {
    const records = this.db.find('exchange_rates', {
      where: { baseCurrency },
      orderBy: 'timestamp',
      orderDirection: 'DESC',
      limit: 1
    });
    
    return records.length > 0 ? records[0].data : null;
  }

  // Conversion history operations
  logConversion(fromCurrency: string, toCurrency: string, amount: number, 
                convertedAmount: number, rate: number, userAgent: string = 'unknown', ttlHours: number = 24): string {
    return this.db.insert('conversion_history', {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount,
      rate,
      timestamp: Date.now(),
      userAgent
    }, ttlHours);
  }

  getConversionHistory(limit: number = 100): any[] {
    const records = this.db.find('conversion_history', {
      orderBy: 'timestamp',
      orderDirection: 'DESC',
      limit
    });
    
    return records.map(r => r.data);
  }

  // Currency metadata operations
  saveCurrencyMetadata(currencies: any[]): void {
    currencies.forEach(currency => {
      this.db.insert('currency_metadata', {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol || '',
        country: currency.country || '',
        isActive: true
      });
    });
  }

  getCurrencyMetadata(code: string): any | null {
    const records = this.db.find('currency_metadata', {
      where: { code, isActive: true },
      limit: 1
    });
    
    return records.length > 0 ? records[0].data : null;
  }

  // API usage tracking
  logAPIUsage(endpoint: string, method: string, responseTime: number, 
              statusCode: number, userAgent: string = 'unknown', ttlHours: number = 24): string {
    return this.db.insert('api_usage', {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: Date.now(),
      userAgent
    }, ttlHours);
  }

  getAPIStats(hours: number = 24): any {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    const records = this.db.find('api_usage', {
      where: {},
      orderBy: 'timestamp',
      orderDirection: 'DESC'
    }).filter(r => r.data.timestamp > since);

    const stats = {
      totalRequests: records.length,
      averageResponseTime: 0,
      statusCodes: {} as any,
      endpoints: {} as any,
      hourlyBreakdown: {} as any
    };

    if (records.length > 0) {
      stats.averageResponseTime = records.reduce((sum, r) => sum + r.data.responseTime, 0) / records.length;
      
      records.forEach(r => {
        const data = r.data;
        
        // Status codes
        stats.statusCodes[data.statusCode] = (stats.statusCodes[data.statusCode] || 0) + 1;
        
        // Endpoints
        stats.endpoints[data.endpoint] = (stats.endpoints[data.endpoint] || 0) + 1;
        
        // Hourly breakdown
        const hour = new Date(data.timestamp).getHours();
        stats.hourlyBreakdown[hour] = (stats.hourlyBreakdown[hour] || 0) + 1;
      });
    }

    return stats;
  }

  // Database maintenance
  cleanup(): number {
    return this.db.cleanupExpired();
  }

  getStats(): any {
    const tables = this.db.listTables();
    return tables.map(table => this.db.getStats(table));
  }

  // Get underlying database instance
  getDB(): InMemoryDB {
    return this.db;
  }
}

// Create and export singleton instance
const currencyDB = new CurrencyDB();

export { InMemoryDB, CurrencyDB };
export default currencyDB; 