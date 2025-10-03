#!/usr/bin/env node

// Load environment variables first
import 'dotenv/config';

console.log('🚀 Starting UserManagementService...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');

// Check critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPTION_MASTER_KEY', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.log('💡 Please check your .env file');
  process.exit(1);
}

// Test Redis connection
console.log('🔍 Testing Redis connection...');
try {
  const Redis = (await import('ioredis')).default;
  const testRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    connectTimeout: 3000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1
  });

  await testRedis.ping();
  console.log('✅ Redis connection successful');
  await testRedis.disconnect();
} catch (error) {
  console.log('⚠️  Redis connection failed:', error.message);
  console.log('💡 Starting Redis: docker run --name ctms-redis -d -p 6379:6379 redis:7-alpine');
  console.log('📝 Service will continue but some features may be limited');
}

// Test database connection
console.log('🔍 Testing database connection...');
try {
  const { PrismaClient } = await import('@prisma/client');
  const testPrisma = new PrismaClient();
  
  await testPrisma.$connect();
  console.log('✅ Database connection successful');
  await testPrisma.$disconnect();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.log('💡 Please check your DATABASE_URL in .env file');
  process.exit(1);
}

// Test module imports
console.log('🔍 Testing module imports...');
try {
  await import('./app.js');
  console.log('✅ App module imported successfully');
} catch (error) {
  console.error('❌ Failed to import app module:', error.message);
  console.error('📝 This might be due to Express version or route issues');
  process.exit(1);
}

// If all checks pass, start the server
console.log('🎉 All checks passed! Starting server...');
try {
  await import('./index.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}