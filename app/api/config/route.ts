/**
 * /api/config — 全局配置读写。
 *   GET → 读取
 *   PUT → 更新（部分字段）
 */

import { NextResponse, type NextRequest } from "next/server";

import { getGlobalConfig, updateGlobalConfig } from "@/lib/config";
import { configUpdateSchema } from "@/lib/schemas";
import { ApiError, errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cfg = await getGlobalConfig();
    return NextResponse.json({ data: cfg });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = configUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const cfg = await updateGlobalConfig(parsed.data);
    return NextResponse.json({ data: cfg });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}