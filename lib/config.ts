/**
 * 全局配置读写工具。
 * 集中处理 KV 配置的默认值、类型转换、合法性校验，避免散落在各 API 里。
 */

import { prisma } from "./db";
import { GLOBAL_CONFIG_DEFAULTS, type Locale } from "./types";

export type GlobalConfig = {
  array_length: number;
  locale: Locale;
  error_sim_enabled: boolean;
  log_retention_days: number;
};

const KEY_MAP = {
  array_length: "array_length",
  locale: "locale",
  error_sim_enabled: "error_sim_enabled",
  log_retention_days: "log_retention_days",
} as const;

type Key = keyof GlobalConfig;

function parseValue(key: Key, raw: string): unknown {
  switch (key) {
    case "array_length":
    case "log_retention_days": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : GLOBAL_CONFIG_DEFAULTS[key];
    }
    case "locale":
      return raw === "zh-cn" || raw === "en" ? raw : GLOBAL_CONFIG_DEFAULTS.locale;
    case "error_sim_enabled":
      return raw === "true" || raw === "1";
  }
}

function validateKey<K extends Key>(key: K, value: unknown): GlobalConfig[K] {
  switch (key) {
    case "array_length": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1 || n > 100) {
        throw new Error("array_length 必须在 1-100 之间");
      }
      return n as GlobalConfig[K];
    }
    case "log_retention_days": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1 || n > 90) {
        throw new Error("log_retention_days 必须在 1-90 之间");
      }
      return n as GlobalConfig[K];
    }
    case "locale":
      if (value !== "zh-cn" && value !== "en") throw new Error("locale 必须是 zh-cn 或 en");
      return value as GlobalConfig[K];
    case "error_sim_enabled":
      return Boolean(value) as GlobalConfig[K];
    default:
      throw new Error(`未知的配置项: ${String(key)}`);
  }
}

export async function getGlobalConfig(): Promise<GlobalConfig> {
  const rows = await prisma.global_config.findMany();
  const map = new Map(rows.map((r) => [r.config_key, r.config_value]));

  return {
    array_length: validateKey(
      "array_length",
      parseValue("array_length", map.get(KEY_MAP.array_length) ?? String(GLOBAL_CONFIG_DEFAULTS.array_length)),
    ),
    locale: validateKey(
      "locale",
      parseValue("locale", map.get(KEY_MAP.locale) ?? GLOBAL_CONFIG_DEFAULTS.locale),
    ),
    error_sim_enabled: validateKey(
      "error_sim_enabled",
      parseValue(
        "error_sim_enabled",
        map.get(KEY_MAP.error_sim_enabled) ?? String(GLOBAL_CONFIG_DEFAULTS.error_sim_enabled),
      ),
    ),
    log_retention_days: validateKey(
      "log_retention_days",
      parseValue(
        "log_retention_days",
        map.get(KEY_MAP.log_retention_days) ?? String(GLOBAL_CONFIG_DEFAULTS.log_retention_days),
      ),
    ),
  };
}

export async function updateGlobalConfig(patch: Partial<GlobalConfig>): Promise<GlobalConfig> {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const key = k as Key;
    validateKey(key, v);
    const stringValue = key === "error_sim_enabled" ? String(Boolean(v)) : String(v);
    await prisma.global_config.upsert({
      where: { config_key: KEY_MAP[key] },
      create: { config_key: KEY_MAP[key], config_value: stringValue },
      update: { config_value: stringValue },
    });
  }
  return getGlobalConfig();
}

/** 在某接口未设置 array_length 时计算实际生效长度。 */
export function resolveArrayLength(override: number | null | undefined, globalLength: number): number {
  if (override !== null && override !== undefined && override > 0) return override;
  if (globalLength > 0) return globalLength;
  return GLOBAL_CONFIG_DEFAULTS.array_length;
}