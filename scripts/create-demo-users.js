import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createDemoUsers() {
  try {
    console.log('Creating demo users...')

    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin123!', 12)
    const managerPassword = await bcrypt.hash('Manager123!', 12)
    const employeePassword = await bcrypt.hash('Employee123!', 12)

    // Create Admin User
    const admin = await prisma.users.upsert({
      where: { email: 'admin@ctms-demo.com' },
      update: {},
      create: {
        email: 'admin@ctms-demo.com',
        password_hash: adminPassword,
        first_name: 'Admin',
        last_name: 'User',
        phone_number: '+1234567890',
        is_verified: true,
        is_active: true
      }
    })

    // Create Manager User
    const manager = await prisma.users.upsert({
      where: { email: 'manager@ctms-demo.com' },
      update: {},
      create: {
        email: 'manager@ctms-demo.com',
        password_hash: managerPassword,
        first_name: 'Manager',
        last_name: 'User',
        phone_number: '+1234567891',
        is_verified: true,
        is_active: true
      }
    })

    // Create Employee User
    const employee = await prisma.users.upsert({
      where: { email: 'employee@ctms-demo.com' },
      update: {},
      create: {
        email: 'employee@ctms-demo.com',
        password_hash: employeePassword,
        first_name: 'Employee',
        last_name: 'User',
        phone_number: '+1234567892',
        is_verified: true,
        is_active: true
      }
    })

    console.log('✅ Demo users created successfully:')
    console.log('📧 Admin: admin@ctms-demo.com / Admin123!')
    console.log('📧 Manager: manager@ctms-demo.com / Manager123!')
    console.log('📧 Employee: employee@ctms-demo.com / Employee123!')

  } catch (error) {
    console.error('❌ Error creating demo users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoUsers()