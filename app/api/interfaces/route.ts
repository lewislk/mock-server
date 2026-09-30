/**
 * /api/interfaces
 *   GET  → 列表 + 搜索 + 状态筛选 + 分页
 *   POST → 创建
 */

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { interfaceInputSchema, listQuerySchema } from "@/lib/schemas";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(params);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const { keyword, page, pageSize, status } = parsed.data;

    const where: Prisma.mock_interfaceWhereInput = {};
    if (status === "enabled") where.status = 1;
    else if (status === "disabled") where.status = 0;

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { identifier: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [total, items, enabledCount, disabledCount, todayCount] = await Promise.all([
      prisma.mock_interface.count({ where }),
      prisma.mock_interface.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mock_interface.count({ where: { ...where, status: 1 } }),
      prisma.mock_interface.count({ where: { ...where, status: 0 } }),
      prisma.mock_request_log.count({
        where: { created_at: { gte: startOfToday() } },
      }),
    ]);

    return NextResponse.json({
      data: {
        items: items.map(serialise),
        pagination: { page, pageSize, total },
        stats: {
          enabled: enabledCount,
          disabled: disabledCount,
          todayRequests: todayCount,
        },
      },
    });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = interfaceInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const data = parsed.data;

    // 唯一标识冲突检测
    const exist = await prisma.mock_interface.findUnique({
      where: { identifier: data.identifier },
    });
    if (exist) {
      throw new ApiError(409, `标识 ${data.identifier} 已存在`, 409);
    }

    const created = await prisma.mock_interface.create({
      data: {
        name: data.name,
        identifier: data.identifier,
        description: data.description ?? null,
        status: data.status ?? 1,
        thrift_def: data.thrift_def ?? null,
        json_template: data.json_template,
        array_length: data.array_length ?? null,
        status_code: data.status_code ?? 200,
        delay_ms: data.delay_ms ?? 0,
        error_rate: new Prisma.Decimal(data.error_rate ?? 0),
      },
    });
    await prisma.operation_log.create({
      data: { action: "create", resource_type: "mock_interface", resource_id: created.id },
    });
    return NextResponse.json({ data: serialise(created) }, { status: 201 });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}

function serialise(record: {
  id: bigint;
  name: string;
  identifier: string;
  description: string | null;
  status: number;
  thrift_def: string | null;
  json_template: string;
  array_length: number | null;
  status_code: number;
  delay_ms: number;
  error_rate: Prisma.Decimal | number;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: String(record.id),
    name: record.name,
    identifier: record.identifier,
    description: record.description,
    status: record.status,
    thrift_def: record.thrift_def,
    json_template: record.json_template,
    array_length: record.array_length,
    status_code: record.status_code,
    delay_ms: record.delay_ms,
    error_rate: Number(record.error_rate),
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}