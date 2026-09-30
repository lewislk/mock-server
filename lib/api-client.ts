/** 公共 fetch 封装：处理错误响应、解包 data、自动传 JSON。 */

export interface ApiSuccess<T> { data: T; requestId?: string }
export interface ApiErrorBody { code: number; message: string; requestId?: string }

export class ApiClientError extends Error {
  public readonly code: number;
  public readonly requestId?: string;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiClientError";
    this.code = body.code;
    this.requestId = body.requestId;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`响应解析失败: ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const body = (parsed && typeof parsed === "object" ? parsed : {}) as ApiErrorBody;
    throw new ApiClientError({
      code: body.code ?? res.status,
      message: body.message ?? `请求失败 ${res.status}`,
      requestId: body.requestId,
    });
  }
  return parsed as T;
}

export const api = {
  get: <T>(url: string) => fetch(url, { method: "GET" }).then((r) => parse<ApiSuccess<T>>(r)),
  post: <T>(url: string, body?: unknown) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => parse<ApiSuccess<T>>(r)),
  put: <T>(url: string, body?: unknown) =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => parse<ApiSuccess<T>>(r)),
  delete: <T>(url: string) => fetch(url, { method: "DELETE" }).then((r) => parse<ApiSuccess<T>>(r)),
};