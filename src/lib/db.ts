import { PrismaClient } from '@prisma/client';

// Singleton pattern pour Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Sur Vercel, SQLite n'est pas disponible, créer un client mock qui ne sera jamais utilisé
const isVercel = process.env.VERCEL || !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('vercel');

export const prisma =
  globalForPrisma.prisma ??
  (isVercel
    ? ({} as PrismaClient) // Mock client pour Vercel (ne sera jamais utilisé grâce aux vérifications)
    : new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      }));

if (process.env.NODE_ENV !== 'production' && !isVercel) globalForPrisma.prisma = prisma;

