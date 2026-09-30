/**
 * 自定义业务异常基类。
 * 禁止在 API Route 中 throw new Error，统一使用 ApiError 以便序列化与日志关联。
 */

import { shortUuid } from "./utils";

export class ApiError extends Error {
  public readonly code: number;
  public readonly status: number;
  public readonly requestId: string;

  constructor(code: number, message: string, status = code, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId ?? shortUuid();
  }
}

/** 预置常用错误。 */
export const Errors = {
  notFound: (resource = "资源") => new ApiError(404, `${resource}不存在`, 404),
  conflict: (msg: string) => new ApiError(409, msg, 409),
  badRequest: (msg: string) => new ApiError(400, msg, 400),
  validation: (msg: string) => new ApiError(422, msg, 422),
  methodNotAllowed: () => new ApiError(405, "方法不允许", 405),
  internal: (msg = "服务器内部错误") => new ApiError(500, msg, 500),
};

export type ApiErrorBody = { code: number; message: string; requestId?: string };

/** 统一的 JSON 错误响应。 */
export function errorResponse(err: unknown): {
  body: ApiErrorBody;
  status: number;
} {
  if (err instanceof ApiError) {
    return {
      body: { code: err.code, message: err.message, requestId: err.requestId },
      status: err.status,
    };
  }
  // 兜底：未知错误返回 500，避免泄漏实现细节
  const fallback = Errors.internal();
  return {
    body: { code: fallback.code, message: fallback.message, requestId: fallback.requestId },
    status: fallback.status,
  };
}