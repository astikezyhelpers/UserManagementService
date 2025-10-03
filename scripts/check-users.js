import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking Users in Database...\n');
    
    // Get all users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        last_login_at: true
      }
    });

    console.log(`📊 Total Users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No users found in the database');
      console.log('💡 You may need to register a user first');
    } else {
      console.log('👥 Users found:');
      console.log('================');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Phone: ${user.phone_number || 'N/A'}`);
        console.log(`   Verified: ${user.is_verified ? '✅' : '❌'}`);
        console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
        console.log(`   Created: ${user.created_at.toISOString()}`);
        console.log(`   Last Login: ${user.last_login_at.toISOString()}`);
        console.log('   ---');
      });
    }

  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
