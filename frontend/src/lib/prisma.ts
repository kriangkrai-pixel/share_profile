import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized: ลด Log และเพิ่ม Performance
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [], // Production: no logs
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// เชื่อมต่อ Database ตอนเริ่มต้น
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  
  // เชื่อมต่อทันทีเมื่อ import
  prisma.$connect()
    .then(() => {
      console.log('✅ Prisma connected to database')
      console.log('⚡ Connection pool ready')
    })
    .catch((e: unknown) => {
      console.error('❌ Prisma connection failed:', e)
      // Retry connection after 2 seconds
      setTimeout(() => {
        prisma.$connect()
          .then(() => console.log('✅ Prisma reconnected'))
          .catch(() => console.error('❌ Prisma reconnection failed'))
      }, 2000)
    })
}

// Export function to log slow queries (optional)
export function logSlowQuery(model: string, action: string, duration: number) {
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`⚠️ Slow query: ${model}.${action} took ${duration}ms`)
  }
}