/**
 * Mock.js 渲染引擎。
 *
 * 关键点：
 * 1. Mock.js 是 CJS 同步库，Next.js Route Handler（Node runtime）下直接 require；
 * 2. JSON 模板里若包含 `Mock.mock(...)` 之外的占位符（顶层），Mock.js 会保留字面值；
 *    因此我们只对模板的"数组字段"统一应用 arrayLength，其余字段走 Mock.js 默认行为；
 * 3. locale 通过 `Mock.setup({ locale })` 切换，因为 setup 是副作用型，渲染后必须恢复；
 * 4. 模板中允许字符串、数组、对象嵌套。
 */

import Mock from "mockjs";

import type { Locale } from "./types";

export interface RenderMockOptions {
  arrayLength: number;
  locale: Locale;
}

const DEFAULT_LOCALE: Locale = "zh-cn";

/** Mock.js 占位符 → 数组长度的统一包装：递归处理 value 数组中的占位符对象。 */
function applyArrayLength(value: unknown, arrayLength: number): unknown {
  if (Array.isArray(value)) {
    // 模板里若写的是 ["@cname"]，Mock.js 会渲染成 ["张三"]；
    // 我们对纯占位符数组应用 arrayLength，元素为单个占位符时复制 arrayLength 次。
    const allPlaceholders =
      value.length > 0 &&
      value.every((v) => typeof v === "string" && /^@[a-zA-Z]/.test(v));
    if (allPlaceholders) {
      const rendered = value.map(() => Mock.mock(value[0] as string));
      while (rendered.length < arrayLength) rendered.push(Mock.mock(value[0] as string));
      return rendered.slice(0, arrayLength);
    }
    return value.map((v) => applyArrayLength(v, arrayLength));
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = applyArrayLength(v, arrayLength);
    }
    return result;
  }

  return value;
}

/**
 * 渲染 JSON 模板，返回 Mock.js 处理后的对象。
 * @throws 当模板不是合法 JSON 时抛出错误（包含原始 message）。
 *
 * 注意：mockjs 1.1.0 实际上不支持 locale 切换，
 * `locale` 参数仅保留接口形状，便于未来扩展或更换 mock 引擎。
 */
export function renderMock(template: string, options: Partial<RenderMockOptions> = {}): unknown {
  void (options.locale ?? DEFAULT_LOCALE); // 暂未使用，签名占位

  let parsed: unknown;
  try {
    parsed = JSON.parse(template);
  } catch (err) {
    const e = err as Error;
    throw new Error(`JSON 模板解析失败: ${e.message}`);
  }

  const rendered = Mock.mock(parsed as object) as unknown;
  return applyArrayLength(rendered, options.arrayLength ?? 3);
}

/**
 * 同步版本，返回字符串（用于 /mock 端点）。
 * 失败时抛 ApiError，由调用方统一处理。
 */
export function renderMockString(template: string, options: Partial<RenderMockOptions> = {}): string {
  const data = renderMock(template, options);
  return JSON.stringify(data);
}