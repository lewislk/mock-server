/**
 * /api/health — 健康检查（PRD §4.3）。
 * 同时 ping MySQL，给运维一个简单探活指标。
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    dbError = (err as Error).message;
  }

  return NextResponse.json({
    data: {
      ok: dbOk,
      uptimeMs: process.uptime() * 1000,
      db: { ok: dbOk, error: dbError },
      version: "0.1.0",
      durationMs: Date.now() - startedAt,
    },
  });
}