import Redis from 'ioredis'
import logger from '../logger.js';
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: "default",
  password: process.env.REDIS_PASSWORD,
  tls: {},
  connectTimeout: 10000,
  lazyConnect: false,
  retryDelayOnFailover: 100,
  // maxRetriesPerRequest: 3,
  enableOfflineQueue: true, // Changed to true to prevent the error
  maxRetriesPerRequest: null // Allow unlimited retries for ping
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  console.log('💡 Make sure Redis is running: docker run --name ctms-redis -d -p 6379:6379 redis:7-alpine');
});

redis.on('close', () => {
  console.log('🔴 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Test connection on startup but don't crash if it fails
(async () => {
  try {
    await redis.ping();
    console.log('✅ Redis ping successful');
  } catch (error) {
    console.error('❌ Redis ping failed:', error.message);
    console.log('⚠️  Service will continue without Redis (some features may be limited)');
  }
})();

export default redis;
