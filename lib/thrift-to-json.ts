/**
 * Thrift 结构树 → JSON 模板生成器。
 *
 * 字段名 → 占位符 的智能映射规则（PRD §3.2.2）：
 *   string:  email → @email；nickname|name → @cname；url|avatar → @image(200x200)；
 *           其他 → @string(5,10)
 *   i32/i64: age|count → @integer(0,100)；其他 → @integer(1,10000)
 *   double:  @float(0,1000,2,3)
 *   bool:    @boolean
 *   list<T>: 数组，元素生成 1 条示例
 *   optional<T>: 同 T（required/optional 不影响占位符）
 *
 * 嵌套 struct：作为对象展开，列表中的元素亦展开为对象。
 */

import type { ThriftFile, ThriftField, ThriftStructDef, TypeRef } from "./thrift-parser";

export interface GenerateOptions {
  /** 数组占位符默认长度（生成 JSON 模板时为 1，运行时由 mock-engine 接管）。 */
  arrayLength?: number;
}

const DEFAULTS: Required<GenerateOptions> = {
  arrayLength: 1,
};

function primitiveName(type: TypeRef): string | null {
  if (typeof type === "string") return type;
  if ("ref" in type) return null; // 具名引用不算基本类型
  return null;
}

/** 单个字段的占位符字符串。 */
function placeholderFor(field: ThriftField, structMap: Map<string, ThriftStructDef>): unknown {
  const t = field.type;
  const lowerName = field.name.toLowerCase();

  // 容器类型
  if (typeof t !== "string" && !("ref" in t)) {
    if (t.name === "list" || t.name === "set") {
      const one = structValue(t.valueType, structMap);
      return [one];
    }
    if (t.name === "map") {
      // Mock.js 不支持 map JSON 模板，渲染为对象形式
      const valueTpl = structValue(t.valueType, structMap);
      return { key: valueTpl };
    }
  }

  // 具名引用：递归到对应 struct
  if (typeof t !== "string" && "ref" in t) {
    const refName = t.ref;
    const refStruct = structMap.get(refName);
    if (refStruct) {
      return structObject(refStruct, structMap);
    }
    // 引用 typedef / 未解析类型 —— 给个 @string 占位
    return `@string`;
  }

  // 基本类型
  const prim = primitiveName(t);
  if (!prim) return `@string`;
  return placeholderForPrimitive(prim, lowerName);
}

function placeholderForPrimitive(prim: string, lowerName: string): string {
  switch (prim) {
    case "string":
    case "binary":
      if (/(email)/.test(lowerName)) return "@email";
      if (/(nickname|^name$|username|displayname|realname)/.test(lowerName)) return "@cname";
      if (/(url|avatar|image|photo|picture|cover|thumbnail)/.test(lowerName)) {
        return '@image("200x200", "#4A90E2", "#fff", "png", "mock")';
      }
      if (/(date|time|_at$|birthday)/.test(lowerName)) return "@datetime";
      if (/(id$|^id_|uuid|guid)/.test(lowerName)) return "@uuid";
      if (/(province)/.test(lowerName)) return "@province";
      if (/(city)/.test(lowerName)) return "@city";
      if (/(address|detail|desc|content|summary|introduction|bio)/.test(lowerName))
        return "@csentence(5,15)";
      if (/(title|subject|topic)/.test(lowerName)) return "@ctitle(3,8)";
      if (/(phone|mobile|tel)/.test(lowerName)) return "@string(11,11)";
      return "@string(5,10)";

    case "i8":
    case "i16":
    case "i32":
    case "int":
    case "i64":
      if (/(age|count|size|limit|page|page_size|amount|qty|quantity|stock|score|rating)/.test(lowerName))
        return "@integer(0,100)";
      if (/(price|amount|money|balance|salary|cost|fee)/.test(lowerName)) return "@float(0,10000,2,2)";
      return "@integer(1,10000)";

    case "double":
    case "float":
      return "@float(0,1000,2,3)";

    case "bool":
    case "boolean":
      return "@boolean";

    case "byte":
      return "@integer(0,255)";

    default:
      return "@string";
  }
}

/** 生成嵌套对象的字段值（同 placeholderFor 但返回子结构）。 */
function structValue(type: TypeRef, structMap: Map<string, ThriftStructDef>): unknown {
  if (typeof type === "string") return placeholderForPrimitive(type, "");
  if ("ref" in type) {
    const refStruct = structMap.get(type.ref);
    if (refStruct) return structObject(refStruct, structMap);
    return "@string";
  }
  if (type.name === "list" || type.name === "set") {
    return [structValue(type.valueType, structMap)];
  }
  if (type.name === "map") {
    const v = structValue(type.valueType, structMap);
    return { key: v };
  }
  return "@string";
}

/** 递归生成 struct 的对象字段。 */
function structObject(struct: ThriftStructDef, structMap: Map<string, ThriftStructDef>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of struct.fields) {
    out[f.name] = placeholderFor(f, structMap);
  }
  return out;
}

/**
 * 生成 JSON 响应模板字符串。
 * @param ast Thrift 解析结果
 * @param rootStructName 选定的根 struct 名（缺省取第一个）
 * @param opts 可选项
 */
export function generateJsonTemplate(
  ast: ThriftFile,
  rootStructName?: string,
  opts: GenerateOptions = {},
): string {
  if (ast.structs.length === 0) {
    throw new Error("Thrift 中未找到 struct 定义");
  }
  const target =
    rootStructName !== undefined
      ? ast.structs.find((s) => s.name === rootStructName)
      : ast.structs[0];

  if (!target) {
    throw new Error(`未找到名为 ${rootStructName} 的 struct`);
  }

  void DEFAULTS; // 当前未使用，仅占位

  const structMap = new Map(ast.structs.map((s) => [s.name, s]));
  const obj = structObject(target, structMap);
  // 2 空格缩进、与编辑区一致
  return JSON.stringify(obj, null, 2);
}