/**
 * /api/interfaces/[id]
 *   GET    → 详情
 *   PUT    → 更新
 *   DELETE → 删除
 */

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { interfaceInputSchema } from "@/lib/schemas";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

function parseId(id: string): bigint {
  try {
    return BigInt(id);
  } catch {
    throw new ApiError(400, "无效的 id");
  }
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const id = parseId(ctx.params.id);
    const record = await prisma.mock_interface.findUnique({ where: { id } });
    if (!record) throw new ApiError(404, "Mock 接口不存在");
    return NextResponse.json({ data: serialise(record) });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const id = parseId(ctx.params.id);
    const body = await req.json();
    const parsed = interfaceInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const data = parsed.data;

    const exist = await prisma.mock_interface.findUnique({ where: { id } });
    if (!exist) throw new ApiError(404, "Mock 接口不存在");

    // 标识冲突：若变更了 identifier，要确保唯一
    if (data.identifier !== exist.identifier) {
      const dup = await prisma.mock_interface.findUnique({ where: { identifier: data.identifier } });
      if (dup && dup.id !== id) throw new ApiError(409, `标识 ${data.identifier} 已存在`);
    }

    const updated = await prisma.mock_interface.update({
      where: { id },
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
      data: { action: "update", resource_type: "mock_interface", resource_id: id },
    });
    return NextResponse.json({ data: serialise(updated) });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const id = parseId(ctx.params.id);
    const exist = await prisma.mock_interface.findUnique({ where: { id } });
    if (!exist) throw new ApiError(404, "Mock 接口不存在");

    await prisma.mock_interface.delete({ where: { id } });
    await prisma.operation_log.create({
      data: { action: "delete", resource_type: "mock_interface", resource_id: id },
    });
    return NextResponse.json({ data: { id: String(id) } });
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