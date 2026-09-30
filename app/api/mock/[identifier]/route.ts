/**
 * /api/mock/[identifier] — 实际 mock 数据端点（ANY 方法）。
 *
 * 流程（PRD §3.4.2）：
 *   1. 频率限制（每 IP 600 req/min）
 *   2. 命中接口 → 不存在 404 / 禁用 404 / 方法 405
 *   3. 错误率模拟（命中则返回 500 + 标准错误体）
 *   4. 延迟模拟
 *   5. Mock.js 渲染
 *   6. 写入 mock_request_log
 */

import { NextResponse, type NextRequest } from "next/server";

import { runMockEndpoint } from "@/lib/render-mock";
import { checkRateLimit } from "@/lib/rate-limit";
import { errorResponse, Errors } from "@/lib/api-error";
import { logger } from "@/lib/logger";

// 必须运行在 Node.js runtime（Prisma 不支持 edge）
export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

async function handle(req: NextRequest, ctx: { params: { identifier: string } }) {
  const identifier = ctx.params.identifier;
  const method = req.method.toUpperCase();
  const ip = clientIp(req);

  try {
    checkRateLimit(ip);
  } catch (err) {
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }

  try {
    const outcome = await runMockEndpoint({ identifier, method, clientIp: ip });

    switch (outcome.kind) {
      case "not_found":
      case "disabled": {
        const e = Errors.notFound("Mock 接口");
        const { body } = errorResponse(e);
        return NextResponse.json(body, { status: 404 });
      }
      case "method_not_allowed": {
        const e = Errors.methodNotAllowed();
        const { body } = errorResponse(e);
        return NextResponse.json(body, { status: 405 });
      }
      case "error_simulated":
        return NextResponse.json(outcome.body, { status: outcome.status });
      case "render_error":
        return NextResponse.json(
          { code: 500, message: `渲染失败: ${outcome.message}`, requestId: "" },
          { status: 500 },
        );
      case "ok":
        return NextResponse.json(outcome.body, {
          status: outcome.status,
          headers: {
            "x-request-id": outcome.requestId,
            "x-mock-engine": "mockjs@1.1.0",
            "x-render-duration-ms": String(outcome.durationMs),
          },
        });
    }
  } catch (err) {
    logger.error("Mock 端点未捕获错误", { identifier, message: (err as Error).message });
    const { body, status } = errorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
// Next.js 要求导出 OPTIONS 显式声明
export const OPTIONS = async () => new NextResponse(null, { status: 204 });