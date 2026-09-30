/**
 * /api/interfaces/[id]/toggle — 启用/禁用切换。
 */

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string };
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    let id: bigint;
    try {
      id = BigInt(ctx.params.id);
    } catch {
      throw new ApiError(400, "无效的 id");
    }
    const exist = await prisma.mock_interface.findUnique({ where: { id } });
    if (!exist) throw new ApiError(404, "Mock 接口不存在");

    const nextStatus = exist.status === 1 ? 0 : 1;
    const updated = await prisma.mock_interface.update({
      where: { id },
      data: { status: nextStatus },
    });
    await prisma.operation_log.create({
      data: {
        action: nextStatus === 1 ? "enable" : "disable",
        resource_type: "mock_interface",
        resource_id: id,
      },
    });
    return NextResponse.json({
      data: { id: String(id), status: updated.status },
    });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}