import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 className：clsx 处理条件，twMerge 处理冲突。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** 生成短 UUID，用于 requestId 等。 */
export function shortUuid(): string {
  // 13 字节 => 26 位 hex，足以标识一次请求且便于在日志中检索
  const bytes = new Uint8Array(13);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}