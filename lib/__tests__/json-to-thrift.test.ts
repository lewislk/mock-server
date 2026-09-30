import { describe, expect, it } from "vitest";

import { jsonToThrift } from "@/lib/json-to-thrift";

describe("json-to-thrift", () => {
  it("string → string", () => {
    const r = jsonToThrift({ name: "alice" }, { namespace: "com.x", rootName: "Root" });
    expect(r.thrift).toMatch(/string name/);
  });

  it("integer 在 i32 范围内 → i32", () => {
    const r = jsonToThrift({ count: 42 }, { namespace: "com.x", rootName: "Root" });
    expect(r.thrift).toMatch(/i32 count/);
  });

  it("integer 超 i32 → i64", () => {
    const r = jsonToThrift({ big: 9_007_199_254_740_993 }, { namespace: "com.x", rootName: "Root" });
    expect(r.thrift).toMatch(/i64 big/);
  });

  it("含小数 → double", () => {
    const r = jsonToThrift({ price: 3.14 }, { namespace: "com.x", rootName: "Root" });
    expect(r.thrift).toMatch(/double price/);
  });

  it("boolean → bool", () => {
    const r = jsonToThrift({ active: true }, { namespace: "com.x", rootName: "Root" });
    expect(r.thrift).toMatch(/bool active/);
  });

  it("array → list<T> 并生成嵌套 struct", () => {
    const r = jsonToThrift(
      { addresses: [{ city: "深圳" }] },
      { namespace: "com.x", rootName: "Root" },
    );
    expect(r.thrift).toMatch(/list<Addresses>/);
    expect(r.thrift).toMatch(/struct Addresses/);
  });

  it("顶层必须是 object", () => {
    expect(() => jsonToThrift([1, 2], { namespace: "x", rootName: "R" })).toThrow();
  });

  it("inferences 字段数量与输入一致", () => {
    const r = jsonToThrift({ a: 1, b: "x", c: true }, { namespace: "x", rootName: "R" });
    expect(r.inferences).toHaveLength(3);
  });
});