// Test PostgreSQL connection with new password
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function testPasswordConnection() {
  console.log('🔍 Testing PostgreSQL connection with new password...')
  console.log('📋 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'))
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test query
    const result = await prisma.$queryRaw`SELECT current_user, version()`
    console.log('✅ Query successful!')
    console.log('👤 Connected as:', result[0].current_user)
    console.log('🗄️ PostgreSQL version:', result[0].version.split(' ')[0] + ' ' + result[0].version.split(' ')[1])
    
    // Check if users table exists
    try {
      const userCount = await prisma.users.count()
      console.log(`✅ Users table accessible! Current user count: ${userCount}`)
    } catch (error) {
      console.log('⚠️  Users table not found. You may need to run migrations:')
      console.log('📝 Run: npx prisma migrate dev')
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error('📝 Error:', error.message)
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Solutions:')
      console.log('1. Verify the password in your .env file')
      console.log('2. Check if PostgreSQL is running')
      console.log('3. Confirm the database "ctms_users" exists')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testPasswordConnection()