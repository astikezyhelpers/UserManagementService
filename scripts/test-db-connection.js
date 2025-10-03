import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    console.log('📋 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'))
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test database access
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`
    console.log('✅ Database query successful!')
    console.log('⏰ Current time from database:', result[0].current_time)
    
    // Check if users table exists
    try {
      const userCount = await prisma.users.count()
      console.log(`✅ Users table accessible! Current user count: ${userCount}`)
    } catch (error) {
      console.log('⚠️  Users table not found or not accessible. Running migrations might be needed.')
      console.log('📝 Error:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error('📝 Error type:', error.constructor.name)
    console.error('📝 Error message:', error.message)
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Possible solutions:')
      console.log('1. Check if PostgreSQL is running')
      console.log('2. Verify username/password in DATABASE_URL')
      console.log('3. Ensure database "ctms_users" exists')
      console.log('4. Check if port 5432 is accessible')
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()