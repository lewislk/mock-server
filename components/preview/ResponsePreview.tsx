"use client";

/** Mock 渲染实时预览面板。 */

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, RefreshCw, Loader2 } from "lucide-react";

import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

interface PreviewData {
  status: number;
  body: unknown;
  durationMs: number;
}

interface ResponsePreviewProps {
  template: string;
  thriftDef?: string;
  /** 可选：当存在 id 时，调用 /api/interfaces/[id]/preview 使用服务端渲染（含 locale 配置）。 */
  interfaceId?: string;
  /** 触发刷新的依赖值（递增即重新渲染）。 */
  trigger: number;
}

export function ResponsePreview({ template, thriftDef, interfaceId, trigger }: ResponsePreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!template.trim()) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const run = async () => {
      try {
        const url = interfaceId
          ? `/api/interfaces/${interfaceId}/preview`
          : `/api/interfaces/preview`;
        const body = interfaceId ? undefined : { json_template: template };
        const res = await api.post<PreviewData | { body: unknown; durationMs: number }>(url, body);
        if (cancelled) return;
        if ("status" in res.data) {
          setData(res.data);
        } else {
          setData({
            status: 200,
            body: res.data.body,
            durationMs: res.data.durationMs,
          });
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : (err as Error).message);
        setData(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    // 节流：300ms 防抖
    const t = setTimeout(run, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [template, thriftDef, trigger, interfaceId]);

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(JSON.stringify(data.body, null, 2));
    toast({ title: "已复制响应", variant: "success" });
  };

  return (
    <section className="bg-background border border-border rounded-lg">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-medium text-sm">实时预览</h2>
        <button
          onClick={() => {
            // 触发刷新：调整 trigger 的方式是在父组件调用
            // 这里只是占位
          }}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          重新生成
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2 text-xs">
          {busy ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              渲染中…
            </span>
          ) : error ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />错误
            </span>
          ) : data ? (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {data.status}
              </span>
              <span className="text-muted-foreground">
                {data.durationMs} ms · {new Blob([JSON.stringify(data.body)]).size} B
              </span>
            </>
          ) : null}
        </div>

        {error ? (
          <div className="editor text-xs p-3 rounded border border-destructive/40 text-destructive bg-destructive/5 whitespace-pre-wrap">
            {error}
          </div>
        ) : (
          <pre className="editor text-xs p-3 rounded border border-border overflow-auto scroll-thin max-h-96 whitespace-pre-wrap break-all">
            <code>{data ? JSON.stringify(data.body, null, 2) : "// 在右侧填写 JSON 模板后预览"}</code>
          </pre>
        )}

        <button
          onClick={copy}
          disabled={!data}
          className="mt-2 w-full px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Copy className="w-3 h-3" />
          复制响应
        </button>
      </div>
    </section>
  );
}