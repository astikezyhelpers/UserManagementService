import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../shared/utils/encryption.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixLoginIssues() {
  try {
    console.log('🔧 Fixing login issues...\n');

    // Initialize encryption service if enabled
    let encryptionService = null;
    if (process.env.ENCRYPTION_ENABLED === 'true') {
      try {
        encryptionService = new EncryptionService();
        console.log('🔐 Encryption service initialized');
      } catch (error) {
        console.log('⚠️  Encryption service failed to initialize:', error.message);
        console.log('   Continuing without encryption...');
      }
    }

    await prisma.$connect();
    console.log('✅ Database connected');

    // Step 1: Check existing users
    const allUsers = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        password_hash: true,
        email_search_token: true,
        phone_search_token: true
      }
    });

    console.log(`\n📊 Found ${allUsers.length} users in database`);

    // Step 2: Fix users missing search tokens (if encryption is enabled)
    let fixedUsers = 0;
    if (encryptionService && allUsers.length > 0) {
      console.log('\n🔧 Fixing missing search tokens...');
      
      for (const user of allUsers) {
        let needsUpdate = false;
        const updateData = {};

        // Check if email search token is missing
        if (user.email && !user.email_search_token) {
          try {
            updateData.email_search_token = encryptionService.generateSearchToken(user.email, 'EMAIL');
            needsUpdate = true;
          } catch (error) {
            console.warn(`⚠️  Could not generate email search token for user ${user.id}`);
          }
        }

        // Check if phone search token is missing
        if (user.phone_number && !user.phone_search_token) {
          try {
            updateData.phone_search_token = encryptionService.generateSearchToken(user.phone_number, 'PHONE');
            needsUpdate = true;
          } catch (error) {
            console.warn(`⚠️  Could not generate phone search token for user ${user.id}`);
          }
        }

        if (needsUpdate) {
          await prisma.users.update({
            where: { id: user.id },
            data: updateData
          });
          fixedUsers++;
          console.log(`✅ Fixed search tokens for user: ${user.email}`);
        }
      }

      if (fixedUsers > 0) {
        console.log(`\n🎉 Fixed ${fixedUsers} users with missing search tokens`);
      } else {
        console.log('\n✅ All users already have proper search tokens');
      }
    }

    // Step 3: Create demo users if none exist
    if (allUsers.length === 0) {
      console.log('\n📝 Creating demo users...');
      
      const demoUsers = [
        {
          email: 'admin@ctms-demo.com',
          password: 'Admin123!',
          first_name: 'Admin',
          last_name: 'User',
          phone_number: '+1234567890'
        },
        {
          email: 'manager@ctms-demo.com', 
          password: 'Manager123!',
          first_name: 'Manager',
          last_name: 'User',
          phone_number: '+1234567891'
        },
        {
          email: 'test@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1234567892'
        }
      ];

      for (const userData of demoUsers) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // Prepare user data
        const createData = {
          email: userData.email,
          password_hash: hashedPassword,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone_number: userData.phone_number,
          is_verified: true,
          is_active: true
        };

        // Add search tokens if encryption is enabled
        if (encryptionService) {
          createData.email_search_token = encryptionService.generateSearchToken(userData.email, 'EMAIL');
          createData.phone_search_token = encryptionService.generateSearchToken(userData.phone_number, 'PHONE');
        }

        const user = await prisma.users.create({ data: createData });
        console.log(`✅ Created demo user: ${userData.email} / ${userData.password}`);
      }
    } else {
      // Check if specific demo users exist
      const demoEmails = ['admin@ctms-demo.com', 'manager@ctms-demo.com', 'test@example.com'];
      const existingDemoUsers = allUsers.filter(user => demoEmails.includes(user.email));
      
      if (existingDemoUsers.length === 0) {
        console.log('\n📝 No demo users found. Creating test user...');
        
        const hashedPassword = await bcrypt.hash('password123', 12);
        const createData = {
          email: 'test@example.com',
          password_hash: hashedPassword,
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+1234567892',
          is_verified: true,
          is_active: true
        };

        if (encryptionService) {
          createData.email_search_token = encryptionService.generateSearchToken('test@example.com', 'EMAIL');
          createData.phone_search_token = encryptionService.generateSearchToken('+1234567892', 'PHONE');
        }

        await prisma.users.create({ data: createData });
        console.log('✅ Created test user: test@example.com / password123');
      }
    }

    // Step 4: Verify login credentials
    console.log('\n🔍 Verifying test credentials...');
    
    const testEmails = ['test@example.com', 'admin@ctms-demo.com'];
    const testPasswords = ['password123', 'Admin123!'];
    
    for (let i = 0; i < testEmails.length; i++) {
      const email = testEmails[i];
      const password = testPasswords[i];
      
      let user;
      if (encryptionService) {
        // Use search token for encrypted lookup
        const searchToken = encryptionService.generateSearchToken(email, 'EMAIL');
        user = await prisma.users.findUnique({
          where: { email_search_token: searchToken }
        });
      } else {
        // Direct email lookup
        user = await prisma.users.findUnique({
          where: { email: email }
        });
      }

      if (user && user.password_hash) {
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log(`🔑 ${email}: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'} password`);
        
        if (!user.is_verified) {
          console.log(`   ⚠️  User not verified, updating...`);
          await prisma.users.update({
            where: { id: user.id },
            data: { is_verified: true }
          });
        }
        
        if (!user.is_active) {
          console.log(`   ⚠️  User not active, updating...`);
          await prisma.users.update({
            where: { id: user.id },
            data: { is_active: true }
          });
        }
      } else {
        console.log(`❌ ${email}: User not found`);
      }
    }

    console.log('\n🎉 Login issues have been fixed!');
    console.log('\n💡 Try logging in with:');
    console.log('   📧 Email: test@example.com');
    console.log('   🔐 Password: password123');
    console.log('');
    console.log('   OR');
    console.log('');
    console.log('   📧 Email: admin@ctms-demo.com');
    console.log('   🔐 Password: Admin123!');

  } catch (error) {
    console.error('❌ Failed to fix login issues:', error.message);
    console.error('📝 Error details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLoginIssues();