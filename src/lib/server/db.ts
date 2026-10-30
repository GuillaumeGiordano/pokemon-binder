import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '$env/dynamic/private';
import { PrismaClient } from './prisma/client';

// Prisma 7 connects through a driver adapter. DATABASE_URL is read at runtime
// (dynamic env) so the app still builds before the database is wired up.
const createClient = () =>
	new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

// Reuse a single client across HMR reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (import.meta.env.DEV) globalForPrisma.prisma = prisma;
