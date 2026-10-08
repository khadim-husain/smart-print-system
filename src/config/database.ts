import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : env.NODE_ENV === 'test'
          ? ['error']
          : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    if (env.NODE_ENV !== 'test') {
      console.info('🔌 Connected successfully to PostgreSQL database.');
    }
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
