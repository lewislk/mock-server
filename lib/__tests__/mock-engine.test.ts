import { describe, expect, it } from "vitest";

import { renderMock } from "@/lib/mock-engine";

describe("mock-engine", () => {
  it("替换 @string 占位符", () => {
    const out = renderMock('{"name": "@string(5,10)"}', { arrayLength: 1, locale: "zh-cn" });
    expect(typeof (out as { name: unknown }).name).toBe("string");
  });

  it("替换 @integer 与范围约束", () => {
    const out = renderMock('{"n": "@integer(0,5)"}', { arrayLength: 1, locale: "zh-cn" }) as { n: number };
    expect(typeof out.n).toBe("number");
    expect(out.n).toBeGreaterThanOrEqual(0);
    expect(out.n).toBeLessThanOrEqual(5);
  });

  it("替换 @boolean", () => {
    const out = renderMock('{"ok": "@boolean"}') as { ok: boolean };
    expect(typeof out.ok).toBe("boolean");
  });

  it("在非数组字段上保留引用结构", () => {
    const out = renderMock('{"a": 1, "b": "@uuid"}') as { a: number; b: string };
    expect(out.a).toBe(1);
    expect(typeof out.b).toBe("string");
  });

  it("抛出错误当 JSON 模板不合法", () => {
    expect(() => renderMock("{invalid")).toThrow(/JSON 模板解析失败/);
  });

  it("替换 @email", () => {
    const out = renderMock('{"email": "@email"}') as { email: string };
    expect(out.email).toMatch(/@/);
  });
});