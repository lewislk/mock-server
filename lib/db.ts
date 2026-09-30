import { PrismaClient } from "@prisma/client";

/**
 * Prisma 客户端单例。
 * 开发模式下防止 Next.js 热更新导致连接数膨胀。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}