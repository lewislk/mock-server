import { describe, expect, it } from "vitest";

import { parseThrift } from "@/lib/thrift-parser";
import { generateJsonTemplate } from "@/lib/thrift-to-json";

function load(source: string) {
  const file = parseThrift(source);
  if (!file) throw new Error("parse failed");
  return file;
}

describe("thrift-to-json", () => {
  it("string → @string 默认占位", () => {
    const out = generateJsonTemplate(load(`struct S { 1: required string foo }`));
    expect(out).toContain("@string");
  });

  it("email 字段 → @email", () => {
    const out = generateJsonTemplate(load(`struct S { 1: required string email }`));
    expect(out).toContain("@email");
  });

  it("nickname/name → @cname", () => {
    const out = generateJsonTemplate(
      load(`struct S { 1: required string nickname 2: required string name }`),
    );
    expect(out).toContain("@cname");
  });

  it("url/avatar → @image(...)", () => {
    const out = generateJsonTemplate(load(`struct S { 1: required string url 2: required string avatar }`));
    expect(out).toContain("@image");
  });

  it("i32 age/count → @integer(0,100)", () => {
    const out = generateJsonTemplate(load(`struct S { 1: required i32 age 2: required i32 count }`));
    expect(out).toContain("@integer(0,100)");
  });

  it("i32 默认 → @integer(1,10000)", () => {
    const out = generateJsonTemplate(load(`struct S { 1: required i32 value }`));
    expect(out).toContain("@integer(1,10000)");
  });

  it("bool → @boolean", () => {
    const out = generateJsonTemplate(load(`struct S { 1: required bool active }`));
    expect(out).toContain("@boolean");
  });

  it("嵌套 struct → 字段全部展开", () => {
    const out = generateJsonTemplate(
      load(`
struct Order { 1: required string id 2: optional Item item }
struct Item  { 1: required string sku 2: required i32 qty }
`),
    );
    expect(out).toContain("item");
    expect(out).toContain("sku");
  });

  it("list<T> → 数组生成 1 条示例", () => {
    const out = generateJsonTemplate(
      load(`struct S { 1: required list<string> tags 2: required list<i32> nums }`),
    );
    const parsed = JSON.parse(out) as { tags: unknown[]; nums: unknown[] };
    expect(parsed.tags.length).toBe(1);
    expect(parsed.nums.length).toBe(1);
  });
});