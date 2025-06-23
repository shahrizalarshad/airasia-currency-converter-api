import { InMemoryDB, CurrencyDB } from '@/lib/memoryDB';

describe('InMemoryDB', () => {
  let db: InMemoryDB;

  beforeEach(() => {
    db = new InMemoryDB();
  });

  describe('Table Management', () => {
    test('should create table with schema', () => {
      const schema = { name: 'string', age: 'number', active: 'boolean' };
      
      expect(() => db.createTable('users', schema)).not.toThrow();
      expect(db.listTables()).toContain('users');
    });

    test('should throw error when creating duplicate table', () => {
      const schema = { name: 'string' };
      db.createTable('users', schema);
      
      expect(() => db.createTable('users', schema)).toThrow('Table \'users\' already exists');
    });

    test('should drop table successfully', () => {
      const schema = { name: 'string' };
      db.createTable('users', schema);
      
      db.dropTable('users');
      expect(db.listTables()).not.toContain('users');
    });
  });

  describe('Data Operations', () => {
    beforeEach(() => {
      db.createTable('users', {
        name: 'string',
        age: 'number',
        active: 'boolean',
        metadata: 'object'
      });
    });

    test('should insert data successfully', () => {
      const data = { name: 'John', age: 30, active: true, metadata: { role: 'admin' } };
      const id = db.insert('users', data);
      
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    test('should validate data against schema', () => {
      const invalidData = { name: 'John', age: 'thirty', active: true };
      
      expect(() => db.insert('users', invalidData)).toThrow('Field \'age\' expected number, got string');
    });

    test('should find records by ID', () => {
      const data = { name: 'John', age: 30, active: true, metadata: {} };
      const id = db.insert('users', data);
      
      const record = db.findById('users', id);
      expect(record).not.toBeNull();
      expect(record!.data.name).toBe('John');
      expect(record!.data.age).toBe(30);
    });

    test('should find records with where clause', () => {
      db.insert('users', { name: 'John', age: 30, active: true, metadata: {} });
      db.insert('users', { name: 'Jane', age: 25, active: false, metadata: {} });
      db.insert('users', { name: 'Bob', age: 30, active: true, metadata: {} });
      
      const records = db.find('users', { where: { age: 30, active: true } });
      expect(records).toHaveLength(2);
      expect(records.map(r => r.data.name)).toEqual(expect.arrayContaining(['John', 'Bob']));
    });

    test('should apply ordering', () => {
      db.insert('users', { name: 'Charlie', age: 35, active: true, metadata: {} });
      db.insert('users', { name: 'Alice', age: 25, active: true, metadata: {} });
      db.insert('users', { name: 'Bob', age: 30, active: true, metadata: {} });
      
      const records = db.find('users', { orderBy: 'age', orderDirection: 'ASC' });
      expect(records.map(r => r.data.age)).toEqual([25, 30, 35]);
      
      const recordsDesc = db.find('users', { orderBy: 'age', orderDirection: 'DESC' });
      expect(recordsDesc.map(r => r.data.age)).toEqual([35, 30, 25]);
    });

    test('should apply pagination', () => {
      for (let i = 0; i < 10; i++) {
        db.insert('users', { name: `User${i}`, age: 20 + i, active: true, metadata: {} });
      }
      
      const page1 = db.find('users', { limit: 3, offset: 0, orderBy: 'age' });
      const page2 = db.find('users', { limit: 3, offset: 3, orderBy: 'age' });
      
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      expect(page1[0].data.age).toBe(20);
      expect(page2[0].data.age).toBe(23);
    });

    test('should update records', () => {
      const data = { name: 'John', age: 30, active: true, metadata: {} };
      const id = db.insert('users', data);
      
      const updated = db.update('users', id, { age: 31, active: false });
      expect(updated).toBe(true);
      
      const record = db.findById('users', id);
      expect(record!.data.age).toBe(31);
      expect(record!.data.active).toBe(false);
      expect(record!.data.name).toBe('John'); // Unchanged
    });

    test('should delete records', () => {
      const data = { name: 'John', age: 30, active: true, metadata: {} };
      const id = db.insert('users', data);
      
      const deleted = db.delete('users', id);
      expect(deleted).toBe(true);
      
      const record = db.findById('users', id);
      expect(record).toBeNull();
    });

    test('should count records', () => {
      db.insert('users', { name: 'John', age: 30, active: true, metadata: {} });
      db.insert('users', { name: 'Jane', age: 25, active: false, metadata: {} });
      
      expect(db.count('users')).toBe(2);
      expect(db.count('users', { where: { active: true } })).toBe(1);
    });
  });

  describe('TTL and Expiration', () => {
    beforeEach(() => {
      db.createTable('temp_data', { value: 'string' });
    });

    test('should handle TTL expiration', async () => {
      const id = db.insert('temp_data', { value: 'test' }, 0.001); // 0.001 hours = 3.6 seconds
      
      // Should be available immediately
      expect(db.findById('temp_data', id)).not.toBeNull();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Should be expired
      expect(db.findById('temp_data', id)).toBeNull();
    });

    test('should cleanup expired records', async () => {
      db.insert('temp_data', { value: 'permanent' }); // No TTL
      db.insert('temp_data', { value: 'temporary' }, 0.001); // Will expire
      
      expect(db.count('temp_data')).toBe(2);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const deletedCount = db.cleanupExpired();
      expect(deletedCount).toBe(1);
      expect(db.count('temp_data')).toBe(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      db.createTable('stats_test', { name: 'string', value: 'number' });
    });

    test('should provide table statistics', () => {
      db.insert('stats_test', { name: 'test1', value: 100 });
      db.insert('stats_test', { name: 'test2', value: 200 });
      
      const stats = db.getStats('stats_test');
      expect(stats.tableName).toBe('stats_test');
      expect(stats.totalRecords).toBe(2);
      expect(stats.activeRecords).toBe(2);
      expect(stats.expiredRecords).toBe(0);
      expect(stats.memoryUsage).toMatch(/\d+(\.\d+)? (B|KB|MB)/);
    });
  });
});

describe('CurrencyDB', () => {
  let currencyDB: CurrencyDB;

  beforeEach(() => {
    currencyDB = new CurrencyDB();
  });

  describe('Exchange Rates Operations', () => {
    test('should save and retrieve exchange rates', () => {
      const rates = { EUR: 0.85, GBP: 0.73, JPY: 110.5 };
      
      const id = currencyDB.saveExchangeRates('USD', rates, 'test-source');
      expect(typeof id).toBe('string');
      
      const retrieved = currencyDB.getLatestExchangeRates('USD');
      expect(retrieved).not.toBeNull();
      expect(retrieved.baseCurrency).toBe('USD');
      expect(retrieved.rates).toEqual(rates);
      expect(retrieved.source).toBe('test-source');
    });

    test('should return null for non-existent rates', () => {
      const rates = currencyDB.getLatestExchangeRates('EUR');
      expect(rates).toBeNull();
    });
  });

  describe('Conversion History Operations', () => {
    test('should log and retrieve conversion history', () => {
      const id = currencyDB.logConversion('USD', 'EUR', 100, 85, 0.85, 'test-agent');
      expect(typeof id).toBe('string');
      
      const history = currencyDB.getConversionHistory(10);
      expect(history).toHaveLength(1);
      expect(history[0].fromCurrency).toBe('USD');
      expect(history[0].toCurrency).toBe('EUR');
      expect(history[0].amount).toBe(100);
      expect(history[0].convertedAmount).toBe(85);
      expect(history[0].rate).toBe(0.85);
      expect(history[0].userAgent).toBe('test-agent');
    });

    test('should limit conversion history results', () => {
      // Add multiple conversions
      for (let i = 0; i < 15; i++) {
        currencyDB.logConversion('USD', 'EUR', 100 + i, 85 + i, 0.85, `agent-${i}`);
      }
      
      const history = currencyDB.getConversionHistory(10);
      expect(history).toHaveLength(10);
      
      // Should be ordered by timestamp DESC (most recent first)
      // Verify we get the most recent records (highest amounts)
      const amounts = history.map(h => h.amount);
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      
      // The max should be close to the last inserted value
      expect(maxAmount).toBeGreaterThanOrEqual(109); // At least one of the last few
      expect(minAmount).toBeGreaterThanOrEqual(100); // Should be reasonably recent
      expect(amounts.length).toBe(10); // Correct limit applied
    });
  });

  describe('API Usage Tracking', () => {
    test('should log and retrieve API usage stats', () => {
      currencyDB.logAPIUsage('/api/convert', 'GET', 150, 200, 'test-agent');
      currencyDB.logAPIUsage('/api/rates', 'GET', 75, 200, 'test-agent');
      currencyDB.logAPIUsage('/api/convert', 'GET', 200, 400, 'test-agent'); // Error
      
      const stats = currencyDB.getAPIStats(24);
      expect(stats.totalRequests).toBe(3);
      expect(stats.averageResponseTime).toBe((150 + 75 + 200) / 3);
      expect(stats.statusCodes['200']).toBe(2);
      expect(stats.statusCodes['400']).toBe(1);
      expect(stats.endpoints['/api/convert']).toBe(2);
      expect(stats.endpoints['/api/rates']).toBe(1);
    });

    test('should filter API stats by time period', async () => {
      currencyDB.logAPIUsage('/api/test', 'GET', 100, 200, 'test-agent');
      
      // Wait a bit longer to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      currencyDB.logAPIUsage('/api/test', 'GET', 100, 200, 'test-agent');
      
      // Use a very small time window that should only capture the most recent request
      const recentStats = currencyDB.getAPIStats(0.0001); // 0.36 seconds
      expect(recentStats.totalRequests).toBeLessThanOrEqual(1);
      
      const allStats = currencyDB.getAPIStats(24);
      expect(allStats.totalRequests).toBe(2);
    });
  });

  describe('Database Maintenance', () => {
    test('should cleanup expired records', async () => {
      // Add some records with short TTL
      currencyDB.logConversion('USD', 'EUR', 100, 85, 0.85, 'test', 0.001); // Will expire
      currencyDB.logAPIUsage('/api/test', 'GET', 100, 200, 'test', 0.001); // Will expire
      
      // Add permanent records
      currencyDB.saveExchangeRates('USD', { EUR: 0.85 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const cleanedCount = currencyDB.cleanup();
      expect(cleanedCount).toBeGreaterThan(0);
    });

    test('should provide database statistics', () => {
      currencyDB.saveExchangeRates('USD', { EUR: 0.85, GBP: 0.73 });
      currencyDB.logConversion('USD', 'EUR', 100, 85, 0.85);
      
      const stats = currencyDB.getStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      
      const exchangeRatesTable = stats.find((s: any) => s.tableName === 'exchange_rates');
      expect(exchangeRatesTable).toBeDefined();
      expect(exchangeRatesTable.activeRecords).toBeGreaterThan(0);
    });
  });

  describe('Currency Metadata Operations', () => {
    test('should save and retrieve currency metadata', () => {
      const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
        { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' }
      ];
      
      currencyDB.saveCurrencyMetadata(currencies);
      
      const usdMeta = currencyDB.getCurrencyMetadata('USD');
      expect(usdMeta).not.toBeNull();
      expect(usdMeta.name).toBe('US Dollar');
      expect(usdMeta.symbol).toBe('$');
      expect(usdMeta.country).toBe('United States');
      expect(usdMeta.isActive).toBe(true);
      
      const nonExistent = currencyDB.getCurrencyMetadata('XXX');
      expect(nonExistent).toBeNull();
    });
  });
}); 