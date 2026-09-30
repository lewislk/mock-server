/**
 * 全局中间件：
 *   - 给所有 /api/mock/[identifier] 请求做轻量级限流兜底（每 IP 600/min）；
 *   - 为日志记录补充通用 header；
 *
 * 真正的 mock 渲染与日志写入在 Route Handler 内完成（基于 Node runtime + Prisma）。
 */

import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/api/mock/:path*"],
};

export function middleware(_req: NextRequest) {
  // 频率限制已移到 Route Handler 内（依赖 Node runtime 与内存存储）。
  // 这里只补充通用响应头，便于跨域调试。
  const res = NextResponse.next();
  res.headers.set("x-mock-platform", "mock-server");
  return res;
}