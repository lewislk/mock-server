/**
 * /api/thrift-validate — Thrift 源码语法校验。
 */

import { NextResponse, type NextRequest } from "next/server";

import { validateThrift } from "@/lib/thrift-parser";
import { ApiError, errorResponse } from "@/lib/api-error";
import { thriftValidateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = thriftValidateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const result = validateThrift(parsed.data.source);
    return NextResponse.json({ data: result });
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}