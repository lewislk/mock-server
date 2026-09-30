/**
 * 统一日志工具。
 * 开发态输出到控制台并附带颜色，生产态输出为 JSON 便于采集。
 * 整个项目禁止散落 console.log/error，统一从该模块输出。
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: Level =
  process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === "production") {
    // JSON 一行日志，便于 Loki / CloudWatch 等采集
    process.stdout.write(JSON.stringify({ ts: timestamp, level, msg, ...meta }) + "\n");
    return;
  }

  const colorMap: Record<Level, string> = {
    debug: "\x1b[90m",
    info: "\x1b[36m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
  };
  const reset = "\x1b[0m";
  const tag = `[${level.toUpperCase()}]`.padEnd(7);
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  // eslint-disable-next-line no-console
  console.log(`${colorMap[level]}${tag}${reset} ${timestamp} ${msg}${metaStr}`);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};