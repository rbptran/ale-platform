const { PrismaClient } = require('@prisma/client');

// Singleton pattern — reuse the same client in dev (avoids connection exhaustion with hot reload)
const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
