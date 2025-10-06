import Redis from 'ioredis'
import logger from '../logger.js';
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
})

redis.on('connect', () => {
  logger.info('Connected to Redis')
})
redis.on('error', (err) => {
  logger.error('Redis connection error:', err.message)
  console.log('Redis connection error:', err)
})

export default redis
  
