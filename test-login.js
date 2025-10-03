import 'dotenv/config';
import prisma from './models/model.js';
import bcrypt from 'bcrypt';

async function testLogin() {
  try {
    console.log('🔍 Testing login functionality...\n');

    // Test database connection first
    await prisma.client.$connect();
    console.log('✅ Database connected successfully');

    // Check encryption status
    const encryptionStatus = prisma.getEncryptionStatus();
    console.log('🔐 Encryption status:', encryptionStatus);

    // Check if any users exist
    const userCount = await prisma.client.users.count();
    console.log(`👥 Total users in database: ${userCount}`);

    if (userCount === 0) {
      console.log('\n📝 Creating test user...');
      
      // Create a test user
      const testUser = await prisma.createUser({
        email: 'test@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+1234567890',
        is_verified: true,
        is_active: true
      });

      console.log('✅ Test user created:', {
        id: testUser.id,
        email: testUser.email,
        name: `${testUser.first_name} ${testUser.last_name}`
      });
    }

    // Test finding user by email
    console.log('\n🔍 Testing findUserByEmail...');
    const testEmail = 'test@example.com';
    const foundUser = await prisma.findUserByEmail(testEmail);
    
    if (foundUser) {
      console.log('✅ User found by email:', {
        id: foundUser.id,
        email: foundUser.email,
        name: `${foundUser.first_name} ${foundUser.last_name}`,
        isVerified: foundUser.is_verified,
        isActive: foundUser.is_active
      });

      // Test password verification
      if (foundUser.password_hash) {
        const isPasswordValid = await bcrypt.compare('password123', foundUser.password_hash);
        console.log('🔑 Password verification:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
      }
    } else {
      console.log('❌ User not found by email');
    }

    // Test listing all users (decrypted)
    console.log('\n📋 Testing user list (first 3 users)...');
    const users = await prisma.client.users.findMany({ take: 3 });
    console.log(`Found ${users.length} users`);
    
    users.forEach((user, index) => {
      const decrypted = prisma.decryptUserData(user);
      console.log(`User ${index + 1}:`, {
        id: decrypted.id,
        email: decrypted.email,
        name: `${decrypted.first_name || 'N/A'} ${decrypted.last_name || 'N/A'}`
      });
    });

    console.log('\n✅ Login functionality test completed successfully!');
    console.log('\n💡 You can now try logging in with:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📝 Error details:', error);
  } finally {
    await prisma.disconnect();
  }
}

testLogin();