"use client";

import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface ResponseView {
  status: number;
  durationMs: number;
  body: unknown;
  bodyText: string;
  bytes: number;
  headers: Record<string, string>;
  contentType: string;
  requestId?: string;
}

interface Props {
  response: ResponseView | null;
  busy: boolean;
  error?: string;
}

export function ResponseViewer({ response, busy, error }: Props) {
  const copyBody = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.bodyText);
  };

  const downloadBody = () => {
    if (!response) return;
    const blob = new Blob([response.bodyText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-background border border-border rounded-lg">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-medium">响应</h2>
        {response && (
          <div className="flex items-center gap-3 text-xs">
            <span
              className={
                "inline-flex items-center gap-1 px-2 py-0.5 rounded " +
                (response.status >= 200 && response.status < 300
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive")
              }
            >
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (response.status >= 200 && response.status < 300 ? "bg-success" : "bg-destructive")
                }
              />
              {response.status}
            </span>
            <span className="text-muted-foreground">
              耗时 <strong className="text-foreground">{response.durationMs}ms</strong>
            </span>
            <span className="text-muted-foreground">
              大小 <strong className="text-foreground">{response.bytes} B</strong>
            </span>
            <Button variant="outline" size="sm" onClick={copyBody}>
              <Copy className="w-3 h-3" />
              复制
            </Button>
            <Button variant="outline" size="sm" onClick={downloadBody}>
              <Download className="w-3 h-3" />
              下载
            </Button>
          </div>
        )}
      </div>

      {busy ? (
        <div className="p-5 text-center text-muted-foreground text-sm">请求中…</div>
      ) : error ? (
        <div className="p-5 text-sm text-destructive bg-destructive/5">{error}</div>
      ) : response ? (
        <>
          <div className="px-5 py-2 text-xs flex items-center gap-3 border-b border-border bg-muted/50">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{response.contentType}</span>
            {response.requestId && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                x-request-id: {response.requestId}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              x-mock-engine: mockjs@1.1.0
            </span>
            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              x-render-duration-ms: {response.durationMs}
            </span>
          </div>

          <div className="p-5">
            <pre className="editor text-xs p-4 rounded border border-border overflow-auto scroll-thin">
              <code>{highlightJson(response.bodyText)}</code>
            </pre>
          </div>
        </>
      ) : (
        <div className="p-5 text-center text-muted-foreground text-sm">
          点击「发送」开始测试
        </div>
      )}
    </section>
  );
}

/** 简易 JSON 语法着色：用 ANSI 转义不合适，转为 React 节点的字符串。 */
function highlightJson(text: string): React.ReactNode {
  // 简化：直接展示原文，依赖 pre + 等宽字体。
  // 后续可改为基于 tokenizer 的渲染。
  return text;
}