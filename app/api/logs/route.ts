/**
 * /api/logs — 请求日志查询（分页）。
 */

import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logsQuerySchema } from "@/lib/schemas";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = logsQuerySchema.safeParse(params);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const { interfaceId, page, pageSize } = parsed.data;

    const where: Prisma.mock_request_logWhereInput = {};
    if (interfaceId !== undefined) where.interface_id = interfaceId;

    const [total, items] = await Promise.all([
      prisma.mock_request_log.count({ where }),
      prisma.mock_request_log.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: {
        items: items.map((r) => ({
          id: String(r.id),
          interfaceId: r.interface_id ? String(r.interface_id) : null,
          identifier: r.identifier,
          method: r.method,
          statusCode: r.status_code,
          durationMs: r.duration_ms,
          clientIp: r.client_ip,
          createdAt: r.created_at.toISOString(),
        })),
        pagination: { page, pageSize, total },
      },
    });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}