/**
 * Thrift 解析器（基于 thrift-parser 包二次封装）。
 *
 * 设计要点：
 * 1. 暴露结构树 `ThriftFile`，统一嵌套 struct/list/map 的表示；
 * 2. `validateThrift` 仅做语法校验（thrift-parser 本身已通过 try/catch 暴露错误），
 *    但额外把"至少含一个 struct"作为业务校验（否则没法生成 JSON 模板）。
 */

import rawParser from "thrift-parser";

/** thrift-parser 原始 AST 中的"基本类型"。包括 thrift-parser 实际能识别的所有 token。 */
export type PrimitiveType =
  | "bool"
  | "byte"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "double"
  | "float"
  | "string"
  | "binary"
  | "int"; // 'int' 是 'i32' 的别名，部分 IDL 仍使用

/** thrift-parser 的容器类型：list/set/map，元素类型本身可递归。 */
export type ContainerType =
  | { name: "list"; valueType: TypeRef }
  | { name: "set"; valueType: TypeRef }
  | { name: "map"; keyType: TypeRef; valueType: TypeRef };

/** 类型引用：基本类型字符串、容器类型、或对 struct/typedef 的具名引用。 */
export type TypeRef = PrimitiveType | ContainerType | NamedType;

export type NamedType = { ref: string };

/** 字段定义。 */
export interface ThriftField {
  id?: number;
  name: string;
  type: TypeRef;
  option?: "required" | "optional";
  defaultValue?: unknown;
}

/** 结构定义（struct/union/exception）。 */
export interface ThriftStructDef {
  kind: "struct" | "union" | "exception";
  name: string;
  fields: ThriftField[];
}

/** 完整结构树（v1 关注 struct，其它只展示不可生成）。 */
export interface ThriftFile {
  namespace?: Record<string, string>;
  structs: ThriftStructDef[];
  /** parser 原 AST，便于在错误信息中保留完整上下文。 */
  raw?: unknown;
}

/** thrift-parser 抛出的语法错误（含行号 + 上下文）。 */
export interface ThriftSyntaxError {
  message: string;
  line: number;
  context: string;
}

/** 校验结果。 */
export type ThriftValidation =
  | { valid: true; file: ThriftFile; stats: { fieldCount: number; nestedStructCount: number; structCount: number } }
  | { valid: false; errors: ThriftSyntaxError[] };

/**
 * 转换原始 thrift-parser AST 为内部结构树。
 * 关键逻辑：把 `readType()` 返回的字符串/容器对象统一成 TypeRef。
 */
function normalizeType(rawType: unknown, namedTypes: Set<string>): TypeRef {
  // 基本类型：thrift-parser 直接返回字符串
  if (typeof rawType === "string") {
    if (isPrimitiveType(rawType)) return rawType;
    return { ref: rawType }; // 具名引用（自定义类型或 struct）
  }

  // 容器类型：{ name: 'list'|'set'|'map', valueType|keyType, ... }
  if (rawType && typeof rawType === "object") {
    const t = rawType as { name?: string; valueType?: unknown; keyType?: unknown };
    if (t.name === "list" || t.name === "set") {
      return { name: t.name, valueType: normalizeType(t.valueType, namedTypes) } as ContainerType;
    }
    if (t.name === "map") {
      return {
        name: "map",
        keyType: normalizeType(t.keyType, namedTypes),
        valueType: normalizeType(t.valueType, namedTypes),
      } as ContainerType;
    }
  }

  // 兜底当作具名引用（保守策略，避免遗漏）
  void namedTypes;
  return { ref: String(rawType) };
}

function isPrimitiveType(s: string): s is PrimitiveType {
  return [
    "bool",
    "byte",
    "i8",
    "i16",
    "i32",
    "i64",
    "double",
    "float",
    "string",
    "binary",
    "int",
  ].includes(s);
}

/** 解析 + 转换为结构树。抛错时返回 null，便于上层包装 validate。 */
export function parseThrift(source: string): ThriftFile | null {
  let raw: ReturnType<typeof rawParser>;
  try {
    raw = rawParser(source);
  } catch (err) {
    return null;
  }
  return normalizeAst(raw);
}

function normalizeAst(raw: ReturnType<typeof rawParser>): ThriftFile {
  const namedTypes = new Set<string>();
  // 先收集所有自定义类型，便于调试
  if (raw.struct) Object.keys(raw.struct).forEach((n) => namedTypes.add(n));
  if (raw.union) Object.keys(raw.union).forEach((n) => namedTypes.add(n));
  if (raw.exception) Object.keys(raw.exception).forEach((n) => namedTypes.add(n));
  if (raw.typedef) Object.keys(raw.typedef).forEach((n) => namedTypes.add(n));
  if (raw.enum) Object.keys(raw.enum).forEach((n) => namedTypes.add(n));

  const structs: ThriftStructDef[] = [];

  const collect = (
    kind: "struct" | "union" | "exception",
    items?: Record<string, Array<{ id?: number; name: string; type: unknown; option?: string; defaultValue?: unknown }>>,
  ) => {
    if (!items) return;
    for (const [name, fields] of Object.entries(items)) {
      structs.push({
        kind,
        name,
        fields: fields.map((f) => ({
          id: typeof f.id === "number" ? f.id : Number(f.id),
          name: f.name,
          type: normalizeType(f.type, namedTypes),
          option: f.option === "required" || f.option === "optional" ? f.option : undefined,
          defaultValue: f.defaultValue,
        })),
      });
    }
  };

  collect("struct", raw.struct as never);
  collect("union", raw.union as never);
  collect("exception", raw.exception as never);

  // namespace 在 thrift-parser 中是 { scope: { serviceName } }；转换为字符串
  let namespace: Record<string, string> | undefined;
  if (raw.namespace) {
    namespace = {};
    for (const [scope, info] of Object.entries(raw.namespace)) {
      if (info && typeof info === "object" && "serviceName" in info) {
        namespace[scope] = String((info as { serviceName: unknown }).serviceName);
      }
    }
  }

  return { namespace, structs, raw };
}

/**
 * 校验 Thrift 源码。
 * 成功：返回结构树 + 统计信息；失败：返回错误数组（含行号、上下文）。
 */
export function validateThrift(source: string): ThriftValidation {
  try {
    const ast = rawParser(source);
    const file = normalizeAst(ast);

    let fieldCount = 0;
    let nestedStructCount = 0;
    for (const s of file.structs) {
      fieldCount += s.fields.length;
      for (const f of s.fields) {
        if (countStructRefs(f.type) > 0) nestedStructCount++;
      }
    }

    if (file.structs.length === 0) {
      return {
        valid: false,
        errors: [{ message: "未找到任何 struct 定义", line: 0, context: "" }],
      };
    }

    return {
      valid: true,
      file,
      stats: { fieldCount, nestedStructCount, structCount: file.structs.length },
    };
  } catch (err) {
    const e = err as { message?: string; line?: number; context?: string; messgae?: string };
    return {
      valid: false,
      errors: [
        {
          message: e.message ?? e.messgae ?? "Thrift 解析失败",
          line: typeof e.line === "number" ? e.line : 0,
          context: typeof e.context === "string" ? e.context : "",
        },
      ],
    };
  }
}

/** 统计字段中（含嵌套）引用到的具名类型数（用于"嵌套结构数"展示）。 */
function countStructRefs(type: TypeRef): number {
  if (typeof type === "string") return 0;
  if ("ref" in type) return 1;
  if (type.name === "list" || type.name === "set") return countStructRefs(type.valueType);
  if (type.name === "map") return countStructRefs(type.keyType) + countStructRefs(type.valueType);
  return 0;
}