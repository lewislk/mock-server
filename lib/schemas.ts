/**
 * API 入参的 Zod schema 集中地。
 * 统一识别符正则、JSON 字符串校验等约束。
 */

import { z } from "zod";

/** 接口唯一标识：3-64 字符，[a-z0-9_-]+ */
export const identifierSchema = z
  .string()
  .min(3, "唯一标识至少 3 字符")
  .max(64, "唯一标识最多 64 字符")
  .regex(/^[a-z0-9_-]+$/, "唯一标识只能包含小写字母、数字、下划线、短横线");

/** 创建/更新接口的字段。 */
export const interfaceInputSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(128),
  identifier: identifierSchema,
  description: z.string().max(512).optional().nullable(),
  status: z.union([z.literal(0), z.literal(1)]).optional().default(1),
  thrift_def: z.string().optional().nullable(),
  json_template: z.string().min(1, "响应模板不能为空"),
  array_length: z.number().int().min(1).max(100).optional().nullable(),
  status_code: z.number().int().min(100).max(599).optional().default(200),
  delay_ms: z.number().int().min(0).max(10000).optional().default(0),
  error_rate: z.number().min(0).max(100).optional().default(0),
});

export type InterfaceInput = z.infer<typeof interfaceInputSchema>;

/** 列表查询参数。 */
export const listQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(10),
  status: z.enum(["all", "enabled", "disabled"]).optional().default("all"),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** 单接口预览入参：仅提供临时模板。 */
export const previewInputSchema = z.object({
  json_template: z.string().min(1),
  array_length: z.number().int().min(1).max(100).optional(),
});

/** JSON→Thrift 转换入参。 */
export const jsonToThriftSchema = z.object({
  json: z.string().min(1, "JSON 不能为空"),
  namespace: z.string().min(1).max(128).default("com.mock.generated"),
  root_name: z.string().min(1).max(64).default("RootResponse"),
  all_optional: z.boolean().optional().default(true),
});

/** Thrift 校验入参。 */
export const thriftValidateSchema = z.object({
  source: z.string().min(1),
});

/** 日志查询入参。 */
export const logsQuerySchema = z.object({
  interfaceId: z.coerce.bigint().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20),
});

/** 全局配置更新入参。 */
export const configUpdateSchema = z.object({
  array_length: z.number().int().min(1).max(100).optional(),
  locale: z.enum(["zh-cn", "en"]).optional(),
  error_sim_enabled: z.boolean().optional(),
  log_retention_days: z.number().int().min(1).max(90).optional(),
});