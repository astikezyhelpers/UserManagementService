import 'dotenv/config';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

async function checkDependencies() {
  console.log('\ud83d\udd0d Checking UserManagementService dependencies...');
  let allGood = true;

  // Check environment variables
  console.log('\n\ud83c\udf10 Environment Variables:');
  const requiredEnvVars = ['JWT_SECRET', 'REFRESH_JWT_SECRET', 'DATABASE_URL', 'ENCRYPTION_MASTER_KEY'];
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`\u2705 ${envVar}: Set`);
    } else {
      console.log(`\u274c ${envVar}: Missing`);
      allGood = false;
    }
  }

  // Check Redis connection
  console.log('\n\ud83d\udd34 Redis Connection:');
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 5000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1
    });

    await redis.ping();
    console.log('\u2705 Redis: Connected and responsive');
    await redis.disconnect();
  } catch (error) {
    console.log('\u274c Redis: Failed to connect -', error.message);
    console.log('\ud83d\udcdd Try: docker run --name ctms-redis -d -p 6379:6379 redis:7-alpine');
    allGood = false;
  }

  // Check PostgreSQL connection
  console.log('\n\ud83d\udc18 PostgreSQL Connection:');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Test query
    const result = await prisma.$queryRaw`SELECT current_user, version()`;
    console.log('\u2705 PostgreSQL: Connected');
    console.log(`\ud83d\udc64 User: ${result[0].current_user}`);
    console.log(`\ud83d\udce6 Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);
    
    // Check users table
    const userCount = await prisma.users.count();
    console.log(`\ud83d\udc65 Users in database: ${userCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log('\u274c PostgreSQL: Failed to connect -', error.message);
    if (error.message.includes('Authentication failed')) {
      console.log('\ud83d\udcdd Try updating DATABASE_URL in .env file');
      console.log('\ud83d\udcdd Or: docker run --name ctms-postgres -e POSTGRES_PASSWORD=password123 -e POSTGRES_USER=postgres -e POSTGRES_DB=ctms_users -d -p 5432:5432 postgres:15-alpine');
    }
    allGood = false;
  }

  // Check if required files exist
  console.log('\n\ud83d\udcc1 File Dependencies:');
  try {
    await import('./models/model.js');
    console.log('\u2705 models/model.js: OK');
  } catch (error) {
    console.log('\u274c models/model.js: Failed -', error.message);
    allGood = false;
  }

  try {
    await import('./authService/auth.controller.js');
    console.log('\u2705 authService/auth.controller.js: OK');
  } catch (error) {
    console.log('\u274c authService/auth.controller.js: Failed -', error.message);
    allGood = false;
  }

  try {
    await import('../shared/utils/encryption.js');
    console.log('\u2705 shared/utils/encryption.js: OK');
  } catch (error) {
    console.log('\u274c shared/utils/encryption.js: Failed -', error.message);
    allGood = false;
  }

  console.log('\n\ud83d\udcc8 Summary:');
  if (allGood) {
    console.log('\u2705 All dependencies are ready!');
    console.log('\ud83d\ude80 You can start the service with: npm start');
    return true;
  } else {
    console.log('\u274c Some dependencies are missing or misconfigured');
    console.log('\ud83d\udd27 Please fix the issues above before starting the service');
    return false;
  }
}

// Run the check
checkDependencies()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\u274c Dependency check failed:', error.message);
    process.exit(1);
  });