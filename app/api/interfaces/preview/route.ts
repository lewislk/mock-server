/**
 * /api/interfaces/preview — 用临时模板渲染（不持久化）。
 * 用于编辑页用户未保存前预览 JSON 模板的输出。
 */

import { NextResponse, type NextRequest } from "next/server";

import { renderMock } from "@/lib/mock-engine";
import { getGlobalConfig, resolveArrayLength } from "@/lib/config";
import { ApiError, errorResponse } from "@/lib/api-error";
import { previewInputSchema } from "@/lib/schemas";
import { LOCALES, type Locale } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = previewInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const cfg = await getGlobalConfig();
    const arrayLength = resolveArrayLength(parsed.data.array_length ?? null, cfg.array_length);
    const locale: Locale = LOCALES.includes(cfg.locale) ? cfg.locale : "zh-cn";

    const startedAt = Date.now();
    try {
      const rendered = renderMock(parsed.data.json_template, { arrayLength, locale });
      return NextResponse.json({
        data: {
          body: rendered,
          durationMs: Date.now() - startedAt,
          arrayLength,
          locale,
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