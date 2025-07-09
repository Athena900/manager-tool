// ============================================
// 高性能キャッシュシステム
// ============================================

import { storage } from './utils'

// キャッシュエントリ型
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
  version: string
}

// キャッシュ設定
interface CacheConfig {
  ttl: number // Time to live in milliseconds
  version: string
  enablePersistence: boolean
  maxSize: number
}

// キャッシュキー生成関数
type CacheKeyGenerator<T extends any[]> = (...args: T) => string

// 高性能キャッシュクラス
export class HighPerformanceCache {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private accessTimes = new Map<string, number>()
  private maxSize: number
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  /**
   * キャッシュに値を設定
   */
  set<T>(
    key: string, 
    value: T, 
    config: CacheConfig
  ): void {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      expiry: now + config.ttl,
      version: config.version
    }

    // メモリキャッシュに保存
    this.memoryCache.set(key, entry)
    this.accessTimes.set(key, now)

    // 永続化キャッシュ
    if (config.enablePersistence) {
      try {
        storage.set(`cache_${key}`, entry)
      } catch (error) {
        console.warn('Failed to persist cache entry:', error)
      }
    }

    // キャッシュサイズ制限
    this.evictIfNeeded()
  }

  /**
   * キャッシュから値を取得
   */
  get<T>(key: string, currentVersion: string = '1.0.0'): T | null {
    const now = Date.now()

    // メモリキャッシュから取得
    let entry = this.memoryCache.get(key)

    // メモリにない場合は永続化キャッシュから取得
    if (!entry) {
      try {
        entry = storage.get<CacheEntry<T> | null>(`cache_${key}`, null)
        if (entry) {
          this.memoryCache.set(key, entry)
        }
      } catch (error) {
        console.warn('Failed to load cache entry from storage:', error)
        return null
      }
    }

    if (!entry) {
      return null
    }

    // 有効期限チェック
    if (now > entry.expiry) {
      this.delete(key)
      return null
    }

    // バージョンチェック
    if (entry.version !== currentVersion) {
      this.delete(key)
      return null
    }

    // アクセス時間更新
    this.accessTimes.set(key, now)

    return entry.data
  }

  /**
   * キャッシュエントリを削除
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    this.accessTimes.delete(key)
    
    try {
      storage.remove(`cache_${key}`)
    } catch (error) {
      console.warn('Failed to remove cache entry from storage:', error)
    }
  }

  /**
   * パターンマッチングでキャッシュを削除
   */
  deletePattern(pattern: RegExp): void {
    const keysToDelete: string[] = []
    
    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.delete(key))
  }

  /**
   * キャッシュクリア
   */
  clear(): void {
    this.memoryCache.clear()
    this.accessTimes.clear()
    
    try {
      // 永続化キャッシュもクリア
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('cache_')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error)
    }
  }

  /**
   * LRU方式でキャッシュエントリを削除
   */
  private evictIfNeeded(): void {
    if (this.memoryCache.size <= this.maxSize) {
      return
    }

    // 最も古いアクセス時間のエントリを削除
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  /**
   * キャッシュ統計情報
   */
  getStats(): {
    memorySize: number
    hitRate: number
    totalRequests: number
    cacheHits: number
  } {
    // TODO: ヒット率の計算を実装
    return {
      memorySize: this.memoryCache.size,
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0
    }
  }
}

// デフォルトキャッシュインスタンス
export const cache = new HighPerformanceCache(500)

// ============================================
// キャッシュデコレータとユーティリティ
// ============================================

/**
 * 関数をキャッシュ化するデコレータ
 */
export function cacheable<T extends any[], R>(
  keyGenerator: CacheKeyGenerator<T>,
  config: Partial<CacheConfig> = {}
) {
  const defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5分
    version: '1.0.0',
    enablePersistence: false,
    maxSize: 100
  }

  const cacheConfig = { ...defaultConfig, ...config }

  return function decorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      const key = keyGenerator(...args)
      
      // キャッシュから取得試行
      const cached = cache.get<R>(key, cacheConfig.version)
      if (cached !== null) {
        return cached
      }

      // キャッシュミスの場合は元の関数を実行
      const result = await originalMethod.apply(this, args)
      
      // 結果をキャッシュに保存
      cache.set(key, result, cacheConfig)
      
      return result
    }

    return descriptor
  }
}

/**
 * React Query風のキャッシュ管理
 */
export class QueryCache {
  private cache = new HighPerformanceCache(200)
  private queryStates = new Map<string, {
    loading: boolean
    error: Error | null
    lastFetch: number
  }>()

  async query<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      staleTime?: number
      cacheTime?: number
      retry?: number
    } = {}
  ): Promise<{
    data: T | null
    loading: boolean
    error: Error | null
  }> {
    const now = Date.now()
    const state = this.queryStates.get(key) || {
      loading: false,
      error: null,
      lastFetch: 0
    }

    // キャッシュから取得
    const cached = this.cache.get<T>(key)
    const isStale = now - state.lastFetch > (options.staleTime || 0)

    // フレッシュなデータがある場合
    if (cached && !isStale) {
      return {
        data: cached,
        loading: false,
        error: null
      }
    }

    // 既にローディング中の場合
    if (state.loading) {
      return {
        data: cached,
        loading: true,
        error: state.error
      }
    }

    // 新しいデータを取得
    try {
      this.queryStates.set(key, {
        ...state,
        loading: true,
        error: null
      })

      const data = await queryFn()
      
      this.cache.set(key, data, {
        ttl: options.cacheTime || 5 * 60 * 1000,
        version: '1.0.0',
        enablePersistence: true,
        maxSize: 200
      })

      this.queryStates.set(key, {
        loading: false,
        error: null,
        lastFetch: now
      })

      return {
        data,
        loading: false,
        error: null
      }
    } catch (error) {
      this.queryStates.set(key, {
        loading: false,
        error: error as Error,
        lastFetch: state.lastFetch
      })

      return {
        data: cached,
        loading: false,
        error: error as Error
      }
    }
  }

  invalidate(keyPattern: string | RegExp): void {
    if (typeof keyPattern === 'string') {
      this.cache.delete(keyPattern)
      this.queryStates.delete(keyPattern)
    } else {
      this.cache.deletePattern(keyPattern)
      for (const key of this.queryStates.keys()) {
        if (keyPattern.test(key)) {
          this.queryStates.delete(key)
        }
      }
    }
  }
}

// デフォルトQueryCacheインスタンス
export const queryCache = new QueryCache()

// ============================================
// キャッシュキー生成ヘルパー
// ============================================

export const createCacheKey = {
  userSales: (userId: string, filters?: Record<string, any>) => 
    `sales:user:${userId}:${JSON.stringify(filters || {})}`,
  
  storeSales: (storeId: string, filters?: Record<string, any>) => 
    `sales:store:${storeId}:${JSON.stringify(filters || {})}`,
  
  storeMembers: (storeId: string) => 
    `store:${storeId}:members`,
  
  userStores: (userId: string) => 
    `user:${userId}:stores`,
  
  invitations: (storeId: string) => 
    `store:${storeId}:invitations`,
  
  systemConfig: () => 
    'system:config',
  
  userPermissions: (userId: string, storeId?: string) =>
    `permissions:${userId}:${storeId || 'global'}`
}

// ============================================
// パフォーマンス最適化ユーティリティ
// ============================================

/**
 * 関数の実行時間を測定
 */
export function measurePerformance<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  label?: string
): (...args: T) => R | Promise<R> {
  return async (...args: T) => {
    const start = performance.now()
    const result = await fn(...args)
    const end = performance.now()
    
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`⚡ ${label || fn.name}: ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }
}

/**
 * バッチ処理でAPIコールを最適化
 */
export class BatchProcessor<T, R> {
  private queue: Array<{
    item: T
    resolve: (value: R) => void
    reject: (error: Error) => void
  }> = []
  private timeout?: NodeJS.Timeout

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private batchSize: number = 10,
    private delay: number = 100
  ) {}

  async process(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ item, resolve, reject })
      
      if (this.queue.length >= this.batchSize) {
        this.flush()
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay)
      }
    })
  }

  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = undefined
    }

    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.batchSize)
    const items = batch.map(b => b.item)

    try {
      const results = await this.processor(items)
      
      batch.forEach((batchItem, index) => {
        if (results[index] !== undefined) {
          batchItem.resolve(results[index])
        } else {
          batchItem.reject(new Error('Batch processing failed'))
        }
      })
    } catch (error) {
      batch.forEach(batchItem => {
        batchItem.reject(error as Error)
      })
    }
  }
}