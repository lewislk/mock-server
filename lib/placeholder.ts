/**
 * Mock.js 占位符白名单与校验。
 * 来源：PRD §3.2.3 占位符表 + 额外覆盖一些常用 Mock.js 内置。
 *
 * 校验策略：
 *   1. 用正则匹配 `@xxx(...)` / `@xxx` 形式的占位符；
 *   2. 用名称前缀匹配白名单（覆盖形如 `@cname`、`@integer(1,100)`、`@image(...)` 等）；
 *   3. 区分"未知"以提示用户。
 */

export const PLACEHOLDER_WHITELIST = [
  // 基础类型
  "boolean",
  "integer",
  "float",
  "string",
  "date",
  "datetime",
  "time",
  "now",
  // 中文文本
  "cname",
  "ctitle",
  "cword",
  "csentence",
  "cparagraph",
  // 地址
  "province",
  "city",
  "county",
  "zip",
  // 网络
  "email",
  "url",
  "ip",
  "domain",
  // ID
  "id",
  "guid",
  "uuid",
  // 图片
  "image",
  "dataImage",
  // 其他常见
  "color",
  "hex",
  "rgb",
  "rgba",
  "first",
  "last",
  "name",
  "title",
  "word",
  "sentence",
  "paragraph",
  "url",
  "protocol",
  "tld",
  "pick",
  "shuffle",
] as const;

export type KnownPlaceholder = (typeof PLACEHOLDER_WHITELIST)[number];

/**
 * 提取文本里所有 `@xxx(...)` 或 `@xxx` 形式的占位符名称（不含参数）。
 */
function extractPlaceholderNames(text: string): string[] {
  const names: string[] = [];
  // 匹配 @xxx( 或 @xxx 结尾
  const re = /@([a-zA-Z][a-zA-Z0-9_]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    names.push(match[1] as string);
  }
  return names;
}

export interface PlaceholderValidation {
  valid: string[];
  unknown: string[];
}

/**
 * 扫描并校验占位符。
 * @returns valid：白名单内的去重名称；unknown：白名单外的去重名称。
 */
export function validatePlaceholders(text: string): PlaceholderValidation {
  const names = extractPlaceholderNames(text);
  const whitelist = new Set<string>(PLACEHOLDER_WHITELIST);
  const validSet = new Set<string>();
  const unknownSet = new Set<string>();

  for (const n of names) {
    if (whitelist.has(n)) validSet.add(n);
    else unknownSet.add(n);
  }

  return { valid: Array.from(validSet), unknown: Array.from(unknownSet) };
}

/**
 * 在光标处插入占位符（编辑器调用）。
 */
export function insertAtCursor(textarea: HTMLTextAreaElement, snippet: string): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const inserted = `${before}${snippet}${after}`;
  textarea.value = inserted;
  // 恢复光标到插入末尾
  const pos = start + snippet.length;
  textarea.setSelectionRange(pos, pos);
  textarea.focus();
  return inserted;
}