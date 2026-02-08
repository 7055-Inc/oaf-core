/**
 * Redis Client Configuration
 * Provides caching utilities with graceful fallback on failure
 * Sprint 4: Performance optimization for artist sites
 */

const redis = require('redis');

let client = null;

/**
 * Get or create Redis client singleton
 * @returns {Promise<RedisClient>} Connected Redis client
 */
async function getRedisClient() {
  if (client && client.isOpen) {
    return client;
  }

  client = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: 0
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis client connected successfully');
  });

  await client.connect();
  return client;
}

/**
 * Get cached value by key
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed cached value or null
 */
async function getCached(key) {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    if (value) {
      console.log(`[Cache HIT] ${key}`);
      return JSON.parse(value);
    }
    console.log(`[Cache MISS] ${key}`);
    return null;
  } catch (error) {
    console.error('Redis GET error:', error.message);
    return null; // Fail gracefully - don't break the app
  }
}

/**
 * Set cache value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttlSeconds - Time to live in seconds (default: 900 = 15 min)
 */
async function setCache(key, value, ttlSeconds = 900) {
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    console.log(`[Cache SET] ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('Redis SET error:', error.message);
    // Don't throw - caching failure shouldn't break app
  }
}

/**
 * Delete single cache key
 * @param {string} key - Cache key to delete
 */
async function deleteCache(key) {
  try {
    const client = await getRedisClient();
    const deleted = await client.del(key);
    if (deleted > 0) {
      console.log(`[Cache DELETE] ${key}`);
    }
  } catch (error) {
    console.error('Redis DELETE error:', error.message);
  }
}

/**
 * Delete multiple cache keys matching pattern
 * @param {string} pattern - Redis key pattern (e.g., "site:*")
 */
async function deleteCachePattern(pattern) {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[Cache DELETE PATTERN] ${pattern} (${keys.length} keys deleted)`);
    }
  } catch (error) {
    console.error('Redis DELETE PATTERN error:', error.message);
  }
}

/**
 * Gracefully close Redis connection
 */
async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
    console.log('Redis client disconnected');
  }
}

module.exports = {
  getRedisClient,
  getCached,
  setCache,
  deleteCache,
  deleteCachePattern,
  closeRedis
};
