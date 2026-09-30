import { describe, expect, it } from "vitest";

import { parseThrift, validateThrift } from "@/lib/thrift-parser";

describe("thrift-parser", () => {
  it("解析单个 struct", () => {
    const source = `namespace java com.mock
struct User {
  1: required string id
  2: optional string name
}`;
    const file = parseThrift(source);
    expect(file).not.toBeNull();
    expect(file?.structs.length).toBe(1);
    expect(file?.structs[0]?.name).toBe("User");
    expect(file?.structs[0]?.fields.length).toBe(2);
  });

  it("解析嵌套 struct 与 list 类型", () => {
    const source = `struct Order {
  1: required string id
  2: optional list<Item> items
}
struct Item {
  1: required string sku
  2: required i32 qty
}`;
    const file = parseThrift(source);
    expect(file?.structs.length).toBe(2);
    const order = file?.structs.find((s) => s.name === "Order");
    expect(order).toBeDefined();
    const itemsField = order?.fields[1];
    expect(itemsField?.type).toEqual({ name: "list", valueType: { ref: "Item" } });
  });

  it("支持基础类型：i32 / bool / double / string", () => {
    const source = `struct M {
  1: required i32 a
  2: required bool b
  3: required double c
  4: required string d
}`;
    const file = parseThrift(source);
    expect(file?.structs[0]?.fields.map((f) => f.type)).toEqual(["i32", "bool", "double", "string"]);
  });

  it("返回 null 当源码非法", () => {
    expect(parseThrift("this is not thrift")).toBeNull();
  });

  it("validateThrift 在合法情况下给出统计", () => {
    const source = `struct S {
  1: required string id
  2: optional i32 count
  3: optional Nested n
}
struct Nested {
  1: required string name
}`;
    const result = validateThrift(source);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.stats.fieldCount).toBe(4);
      expect(result.stats.nestedStructCount).toBe(1);
      expect(result.stats.structCount).toBe(2);
    }
  });

  it("validateThrift 在缺少分号时返回错误行号", () => {
    const source = `struct Bad {
  1: required string id
  2: required i32 age
}
struct AlsoBad
}`;
    const result = validateThrift(source);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]?.line).toBeGreaterThan(0);
    }
  });
});