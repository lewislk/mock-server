/**
 * /api/interfaces/[id]/preview — 用已保存的接口模板做一次 mock 渲染。
 * 主要供编辑页右侧的实时预览使用。
 */

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/api-error";
import { renderMock } from "@/lib/mock-engine";
import { getGlobalConfig, resolveArrayLength } from "@/lib/config";
import { LOCALES, type Locale } from "@/lib/types";

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
    const record = await prisma.mock_interface.findUnique({ where: { id } });
    if (!record) throw new ApiError(404, "Mock 接口不存在");

    const cfg = await getGlobalConfig();
    const arrayLength = resolveArrayLength(record.array_length, cfg.array_length);
    const locale: Locale = LOCALES.includes(cfg.locale) ? cfg.locale : "zh-cn";

    const startedAt = Date.now();
    try {
      const body = renderMock(record.json_template, { arrayLength, locale });
      return NextResponse.json({
        data: {
          status: record.status_code,
          body,
          durationMs: Date.now() - startedAt,
        },
      });
    } catch (err) {
      throw new ApiError(422, `渲染失败: ${(err as Error).message}`);
    }
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}