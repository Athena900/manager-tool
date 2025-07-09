// ============================================
// キャッシュシステムのテスト
// ============================================

import { HighPerformanceCache, QueryCache, createCacheKey } from '@/lib/cache'

describe('Cache System', () => {
  describe('HighPerformanceCache', () => {
    let cache: HighPerformanceCache

    beforeEach(() => {
      cache = new HighPerformanceCache(3) // 小さなサイズでテスト
    })

    afterEach(() => {
      cache.clear()
    })

    it('should store and retrieve values', () => {
      const config = {
        ttl: 1000,
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 10
      }

      cache.set('key1', 'value1', config)
      const result = cache.get('key1', '1.0.0')
      
      expect(result).toBe('value1')
    })

    it('should return null for expired entries', async () => {
      const config = {
        ttl: 10, // 10ms
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 10
      }

      cache.set('key1', 'value1', config)
      
      // 期限切れを待つ
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const result = cache.get('key1', '1.0.0')
      expect(result).toBeNull()
    })

    it('should return null for version mismatch', () => {
      const config = {
        ttl: 1000,
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 10
      }

      cache.set('key1', 'value1', config)
      const result = cache.get('key1', '2.0.0') // Different version
      
      expect(result).toBeNull()
    })

    it('should evict old entries when size limit reached', () => {
      const config = {
        ttl: 1000,
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 3
      }

      cache.set('key1', 'value1', config)
      cache.set('key2', 'value2', config)
      cache.set('key3', 'value3', config)
      
      // アクセス時間を異なるものにする
      cache.get('key1', '1.0.0')
      cache.get('key2', '1.0.0')
      
      // 4つ目を追加すると最も古い key3 が削除される
      cache.set('key4', 'value4', config)
      
      expect(cache.get('key1', '1.0.0')).toBe('value1')
      expect(cache.get('key2', '1.0.0')).toBe('value2')
      expect(cache.get('key3', '1.0.0')).toBeNull()
      expect(cache.get('key4', '1.0.0')).toBe('value4')
    })

    it('should delete entries', () => {
      const config = {
        ttl: 1000,
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 10
      }

      cache.set('key1', 'value1', config)
      cache.delete('key1')
      
      expect(cache.get('key1', '1.0.0')).toBeNull()
    })

    it('should delete entries by pattern', () => {
      const config = {
        ttl: 1000,
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 10
      }

      cache.set('user:123:profile', 'profile1', config)
      cache.set('user:123:settings', 'settings1', config)
      cache.set('user:456:profile', 'profile2', config)
      
      cache.deletePattern(/^user:123:/)
      
      expect(cache.get('user:123:profile', '1.0.0')).toBeNull()
      expect(cache.get('user:123:settings', '1.0.0')).toBeNull()
      expect(cache.get('user:456:profile', '1.0.0')).toBe('profile2')
    })

    it('should clear all entries', () => {
      const config = {
        ttl: 1000,
        version: '1.0.0',
        enablePersistence: false,
        maxSize: 10
      }

      cache.set('key1', 'value1', config)
      cache.set('key2', 'value2', config)
      cache.clear()
      
      expect(cache.get('key1', '1.0.0')).toBeNull()
      expect(cache.get('key2', '1.0.0')).toBeNull()
    })
  })

  describe('QueryCache', () => {
    let queryCache: QueryCache

    beforeEach(() => {
      queryCache = new QueryCache()
    })

    it('should execute query and cache result', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue('test data')
      
      const result = await queryCache.query('test-key', mockQueryFn)
      
      expect(result.data).toBe('test data')
      expect(result.loading).toBe(false)
      expect(result.error).toBeNull()
      expect(mockQueryFn).toHaveBeenCalledTimes(1)
    })

    it('should return cached result on subsequent calls', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue('test data')
      
      await queryCache.query('test-key', mockQueryFn)
      const result = await queryCache.query('test-key', mockQueryFn)
      
      expect(result.data).toBe('test data')
      expect(mockQueryFn).toHaveBeenCalledTimes(1) // Called only once
    })

    it('should handle query errors', async () => {
      const mockError = new Error('Query failed')
      const mockQueryFn = jest.fn().mockRejectedValue(mockError)
      
      const result = await queryCache.query('test-key', mockQueryFn)
      
      expect(result.data).toBeNull()
      expect(result.loading).toBe(false)
      expect(result.error).toBe(mockError)
    })

    it('should invalidate cache by key', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue('test data')
      
      await queryCache.query('test-key', mockQueryFn)
      queryCache.invalidate('test-key')
      await queryCache.query('test-key', mockQueryFn)
      
      expect(mockQueryFn).toHaveBeenCalledTimes(2) // Called twice after invalidation
    })
  })

  describe('createCacheKey', () => {
    it('should create user sales key', () => {
      const key = createCacheKey.userSales('user123', { date: '2023-01-01' })
      expect(key).toBe('sales:user:user123:{"date":"2023-01-01"}')
    })

    it('should create store sales key', () => {
      const key = createCacheKey.storeSales('store123')
      expect(key).toBe('sales:store:store123:{}')
    })

    it('should create store members key', () => {
      const key = createCacheKey.storeMembers('store123')
      expect(key).toBe('store:store123:members')
    })

    it('should create user stores key', () => {
      const key = createCacheKey.userStores('user123')
      expect(key).toBe('user:user123:stores')
    })

    it('should create invitations key', () => {
      const key = createCacheKey.invitations('store123')
      expect(key).toBe('store:store123:invitations')
    })

    it('should create system config key', () => {
      const key = createCacheKey.systemConfig()
      expect(key).toBe('system:config')
    })

    it('should create user permissions key', () => {
      const key1 = createCacheKey.userPermissions('user123')
      const key2 = createCacheKey.userPermissions('user123', 'store456')
      
      expect(key1).toBe('permissions:user123:global')
      expect(key2).toBe('permissions:user123:store456')
    })
  })
})