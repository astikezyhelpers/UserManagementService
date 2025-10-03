import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabaseSetup() {
  try {
    console.log('🔍 Verifying database setup...\n');

    // Test database connection
    console.log('📋 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));
    
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test basic query
    const result = await prisma.$queryRaw`SELECT current_user, version()`;
    console.log('👤 Connected as:', result[0].current_user);
    console.log('🗄️ PostgreSQL version:', result[0].version.split(' ')[0] + ' ' + result[0].version.split(' ')[1]);

    // Check users table
    try {
      const userCount = await prisma.users.count();
      console.log(`👥 Total users in database: ${userCount}`);

      if (userCount > 0) {
        // Check first few users
        const users = await prisma.users.findMany({ 
          take: 3,
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            is_verified: true,
            is_active: true,
            email_search_token: true,
            phone_search_token: true
          }
        });

        console.log('\n📋 Sample users:');
        users.forEach((user, index) => {
          console.log(`User ${index + 1}:`, {
            id: user.id,
            email: user.email,
            name: `${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`,
            verified: user.is_verified,
            active: user.is_active,
            hasEmailSearchToken: !!user.email_search_token,
            hasPhoneSearchToken: !!user.phone_search_token
          });
        });

        // Check for demo users
        const demoUsers = await prisma.users.findMany({
          where: {
            email: {
              in: ['admin@ctms-demo.com', 'manager@ctms-demo.com', 'employee@ctms-demo.com']
            }
          },
          select: { email: true, is_verified: true, is_active: true }
        });

        if (demoUsers.length > 0) {
          console.log('\n🎯 Found demo users:');
          demoUsers.forEach(user => {
            console.log(`  - ${user.email} (verified: ${user.is_verified}, active: ${user.is_active})`);
          });
        } else {
          console.log('\n⚠️  No demo users found. You may need to create them.');
        }

      } else {
        console.log('⚠️  No users found in database. You need to create demo users.');
      }

    } catch (error) {
      console.log('❌ Users table not accessible:', error.message);
      console.log('📝 You may need to run: npx prisma migrate dev');
    }

  } catch (error) {
    console.error('❌ Database verification failed!');
    console.error('📝 Error:', error.message);
    
    if (error.message.includes('Authentication failed') || error.message.includes('password authentication failed')) {
      console.log('\n💡 Database Authentication Issue Detected!');
      console.log('🔧 Possible solutions:');
      console.log('1. 🐳 Use Docker for PostgreSQL:');
      console.log('   docker run --name ctms-postgres -e POSTGRES_PASSWORD=password123 -e POSTGRES_USER=postgres -e POSTGRES_DB=ctms_users -d -p 5432:5432 postgres:15-alpine');
      console.log('');
      console.log('2. ⚙️  Update your .env file with correct credentials:');
      console.log('   DATABASE_URL=postgresql://postgres:password123@localhost:5432/ctms_users');
      console.log('');
      console.log('3. 🔄 Restart the service after fixing credentials');
    }

  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseSetup();