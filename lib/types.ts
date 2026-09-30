/**
 * 全局共享类型定义。
 * 不依赖任何运行时，server/client 都可使用。
 */

import type { Prisma } from "@prisma/client";

/** mock_interface 单条记录（取自 Prisma）。 */
export type MockInterface = Prisma.mock_interfaceGetPayload<{}>;

/** 占位符校验结果。 */
export type PlaceholderValidation = {
  valid: string[];
  unknown: string[];
};

/** Mock.js locale（与 PRD §3.5 一致）。 */
export const LOCALES = ["zh-cn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** 全局配置默认值。 */
export const GLOBAL_CONFIG_DEFAULTS = {
  array_length: 3,
  locale: "zh-cn" as Locale,
  error_sim_enabled: true,
  log_retention_days: 7,
} as const;

/** 列表页筛选项。 */
export type InterfaceStatusFilter = "all" | "enabled" | "disabled";

/** 通用 API 响应包装。 */
export type ApiResponse<T> = { data: T; requestId?: string };