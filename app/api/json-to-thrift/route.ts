/**
 * /api/json-to-thrift — JSON → Thrift 转换端点。
 */

import { NextResponse, type NextRequest } from "next/server";

import { jsonToThrift } from "@/lib/json-to-thrift";
import { ApiError, errorResponse } from "@/lib/api-error";
import { jsonToThriftSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = jsonToThriftSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "参数错误");
    }
    const { json, namespace, root_name, all_optional } = parsed.data;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch (err) {
      throw new ApiError(422, `JSON 解析失败: ${(err as Error).message}`);
    }

    try {
      const result = jsonToThrift(parsedJson, {
        namespace,
        rootName: root_name,
        allOptional: all_optional,
      });
      return NextResponse.json({ data: result });
    } catch (err) {
      throw new ApiError(422, (err as Error).message);
    }
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}