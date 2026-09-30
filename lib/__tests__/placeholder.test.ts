import { describe, expect, it } from "vitest";

import { validatePlaceholders } from "@/lib/placeholder";

describe("placeholder validator", () => {
  it("识别所有合法占位符", () => {
    const text = '{"a": "@uuid", "b": "@cname", "c": "@integer(1,100)"}';
    const r = validatePlaceholders(text);
    expect(r.valid.sort()).toEqual(["cname", "integer", "uuid"].sort());
    expect(r.unknown).toEqual([]);
  });

  it("挑出未知占位符", () => {
    const r = validatePlaceholders('{"x": "@totallyMadeUp"}');
    expect(r.valid).toEqual([]);
    expect(r.unknown).toEqual(["totallyMadeUp"]);
  });

  it("同时包含合法与未知时分别归类", () => {
    const r = validatePlaceholders('{"a": "@email", "b": "@bogus"}');
    expect(r.valid).toEqual(["email"]);
    expect(r.unknown).toEqual(["bogus"]);
  });

  it("去重同名占位符", () => {
    const r = validatePlaceholders('{"a": "@uuid", "b": "@uuid", "c": "@email"}');
    expect(r.valid).toEqual(["uuid", "email"]);
    expect(r.unknown).toEqual([]);
  });

  it("空文本返回空结果", () => {
    const r = validatePlaceholders("");
    expect(r.valid).toEqual([]);
    expect(r.unknown).toEqual([]);
  });
});