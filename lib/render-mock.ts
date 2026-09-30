/**
 * /api/mock/[identifier] 端点的核心渲染流程。
 * 包含错误率判定、延迟、Mock.js 渲染、请求日志写入。
 */

import { prisma } from "./db";
import { renderMock } from "./mock-engine";
import { getGlobalConfig, resolveArrayLength } from "./config";
import { logger } from "./logger";
import { shortUuid } from "./utils";
import { LOCALES, type Locale } from "./types";

export interface MockInterfaceRow {
  id: bigint;
  identifier: string;
  status: number;
  json_template: string;
  array_length: number | null;
  status_code: number;
  delay_ms: number;
  error_rate: unknown; // Prisma Decimal 类型为对象
}

export type MockOutcome =
  | {
      kind: "ok";
      status: number;
      body: unknown;
      durationMs: number;
      requestId: string;
      errorRateHit: false;
    }
  | { kind: "disabled" }
  | { kind: "not_found" }
  | { kind: "method_not_allowed" }
  | {
      kind: "error_simulated";
      status: number;
      body: { code: number; message: string; requestId: string };
      durationMs: number;
      requestId: string;
      errorRateHit: true;
    }
  | { kind: "render_error"; message: string };

const SUPPORTED_METHODS = new Set(["GET", "POST"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 命中查找 + 渲染 + 日志全流程。
 * @param identifier URL 路径段
 * @param method 请求方法
 * @param clientIp 客户端 IP
 */
export async function runMockEndpoint(args: {
  identifier: string;
  method: string;
  clientIp: string;
}): Promise<MockOutcome> {
  const startedAt = Date.now();
  const requestId = shortUuid();

  if (!SUPPORTED_METHODS.has(args.method)) {
    return { kind: "method_not_allowed" };
  }

  const record = await prisma.mock_interface.findUnique({
    where: { identifier: args.identifier },
  });

  if (!record) return { kind: "not_found" };
  if (record.status === 0) return { kind: "disabled" };

  const cfg = await getGlobalConfig();
  const arrayLength = resolveArrayLength(record.array_length, cfg.array_length);
  const locale: Locale = LOCALES.includes(cfg.locale) ? cfg.locale : "zh-cn";

  // 错误率模拟：仅当全局开关 + 接口错误率 > 0 时生效
  if (cfg.error_sim_enabled) {
    const rate = Number(record.error_rate);
    if (Number.isFinite(rate) && rate > 0 && Math.random() * 100 < rate) {
      const durationMs = Date.now() - startedAt;
      await persistLog({
        interfaceId: record.id,
        identifier: record.identifier,
        method: args.method,
        statusCode: 500,
        durationMs,
        clientIp: args.clientIp,
      });
      return {
        kind: "error_simulated",
        status: 500,
        body: { code: 500, message: "Mock error", requestId },
        durationMs,
        requestId,
        errorRateHit: true,
      };
    }
  }

  // 延迟模拟
  if (record.delay_ms > 0) {
    await sleep(Math.min(record.delay_ms, 10000));
  }

  // Mock.js 渲染
  try {
    const rendered = renderMock(record.json_template, { arrayLength, locale });
    const durationMs = Date.now() - startedAt;
    await persistLog({
      interfaceId: record.id,
      identifier: record.identifier,
      method: args.method,
      statusCode: record.status_code,
      durationMs,
      clientIp: args.clientIp,
    });
    return {
      kind: "ok",
      status: record.status_code,
      body: rendered,
      durationMs,
      requestId,
      errorRateHit: false,
    };
  } catch (err) {
    logger.error("Mock 渲染失败", {
      identifier: args.identifier,
      message: (err as Error).message,
    });
    return { kind: "render_error", message: (err as Error).message };
  }
}

async function persistLog(args: {
  interfaceId: bigint;
  identifier: string;
  method: string;
  statusCode: number;
  durationMs: number;
  clientIp: string;
}): Promise<void> {
  try {
    await prisma.mock_request_log.create({
      data: {
        interface_id: args.interfaceId,
        identifier: args.identifier,
        method: args.method,
        status_code: args.statusCode,
        duration_ms: args.durationMs,
        client_ip: args.clientIp,
      },
    });
  } catch (err) {
    // 日志写入失败不应阻塞响应
    logger.warn("写入 mock_request_log 失败", { message: (err as Error).message });
  }
}