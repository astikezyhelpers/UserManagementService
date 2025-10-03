import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testUserLogin() {
  try {
    console.log('🧪 Testing User Login Credentials...\n');
    
    const testCredentials = [
      { email: 'admin@ctms-demo.com', password: 'admin123' },
      { email: 'manager@ctms-demo.com', password: 'manager123' },
      { email: 'employee@ctms-demo.com', password: 'employee123' }
    ];

    for (const cred of testCredentials) {
      console.log(`Testing: ${cred.email}`);
      
      const user = await prisma.users.findUnique({
        where: { email: cred.email }
      });

      if (user && user.password_hash) {
        const isValid = await bcrypt.compare(cred.password, user.password_hash);
        console.log(`✅ Password check: ${isValid ? 'VALID' : 'INVALID'}`);
        console.log(`   Status: ${user.is_active ? 'Active' : 'Inactive'} | ${user.is_verified ? 'Verified' : 'Unverified'}`);
      } else {
        console.log('❌ User not found or no password hash');
      }
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUserLogin();
