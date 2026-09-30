/**
 * 内存版频率限制器（PRD §4.5：mock 接口每 IP 600 req/min）。
 *
 * 设计要点：
 * 1. 单实例使用，进程重启计数清零（足够满足 v1 单实例部署）；
 * 2. 滑动窗口：每个 IP 一个 60 秒环形队列；
 * 3. 命中超过上限 → 抛 429，由 API Route 捕获后返回错误。
 */

import { ApiError } from "./api-error";

interface Bucket {
  /** 时间戳数组（毫秒）。 */
  hits: number[];
}

const WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 600;

const buckets = new Map<string, Bucket>();

/** 清扫过期时间戳，返回当前窗口内的命中数。 */
function pruneAndCount(bucket: Bucket, now: number): number {
  const cutoff = now - WINDOW_MS;
  // 找到第一个 > cutoff 的位置，丢弃之前的
  let i = 0;
  while (i < bucket.hits.length && bucket.hits[i]! <= cutoff) i++;
  if (i > 0) bucket.hits.splice(0, i);
  return bucket.hits.length;
}

/**
 * 检查并记录一次请求。命中上限时抛 ApiError(429)。
 * @param ip 客户端 IP
 * @param limit 自定义上限（默认 600/min）
 */
export function checkRateLimit(ip: string, limit = DEFAULT_LIMIT): void {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(ip, bucket);
  }
  const current = pruneAndCount(bucket, now);
  if (current >= limit) {
    throw new ApiError(429, `请求过于频繁，每分钟最多 ${limit} 次`, 429);
  }
  bucket.hits.push(now);
}

/** 用于测试或管理工具：重置指定 IP 的计数。 */
export function resetRateLimit(ip?: string): void {
  if (ip) buckets.delete(ip);
  else buckets.clear();
}