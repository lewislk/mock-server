"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { RequestBuilder, type RequestConfig } from "@/components/RequestBuilder";
import { ResponseViewer, type ResponseView } from "@/components/ResponseViewer";
import { api, ApiClientError } from "@/lib/api-client";

const DEFAULT_REQUEST: RequestConfig = {
  method: "POST",
  identifier: "",
  params: [],
  headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
  body: "",
};

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">加载中…</div>}>
      <PreviewInner />
    </Suspense>
  );
}

function PreviewInner() {
  const params = useSearchParams();
  const initialIdentifier = params.get("identifier") ?? "";
  const [request, setRequest] = useState<RequestConfig>({ ...DEFAULT_REQUEST, identifier: initialIdentifier });
  const [response, setResponse] = useState<ResponseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!request.identifier) return;
    setBusy(true);
    setError(null);
    const startedAt = Date.now();
    const url = new URL(`/mock-server/api/mock/${request.identifier}`, window.location.origin);
    const enabledParams = request.params.filter((p) => p.enabled && p.key);
    enabledParams.forEach((p) => url.searchParams.append(p.key, p.value));

    const headers: Record<string, string> = {};
    request.headers.filter((h) => h.enabled && h.key).forEach((h) => (headers[h.key] = h.value));

    try {
      const res = await fetch(url.toString(), {
        method: request.method,
        headers,
        body: request.method === "POST" && request.body ? request.body : undefined,
      });
      const buffer = await res.text();
      const ct = res.headers.get("content-type") ?? "application/json; charset=utf-8";
      const bytes = new Blob([buffer]).size;
      let body: unknown = buffer;
      try {
        body = JSON.parse(buffer);
      } catch {
        // 非 JSON 保留原文
      }
      setResponse({
        status: res.status,
        durationMs: Date.now() - startedAt,
        body,
        bodyText: typeof body === "string" ? body : JSON.stringify(body, null, 2),
        bytes,
        headers: Object.fromEntries(res.headers.entries()),
        contentType: ct,
        requestId: res.headers.get("x-request-id") ?? undefined,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background border-b border-border px-8 py-3 flex items-center gap-4">
        <div className="text-sm text-muted-foreground">快速预览</div>
      </header>

      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Mock 响应预览</h1>
            <p className="text-sm text-muted-foreground mt-1">测试 mock 接口的实际响应，验证模板与配置</p>
          </div>
        </div>

        <RequestBuilder
          initialIdentifier={initialIdentifier}
          value={request}
          onChange={setRequest}
          onSend={send}
          busy={busy}
        />
        <ResponseViewer response={response} busy={busy} error={error ?? undefined} />
      </div>
    </>
  );
}