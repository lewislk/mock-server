"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";

export interface RequestConfig {
  method: "GET" | "POST";
  identifier: string;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body: string;
}

interface Props {
  initialIdentifier?: string;
  value: RequestConfig;
  onChange: (next: RequestConfig) => void;
  onSend: () => void;
  busy: boolean;
}

interface InterfaceOption {
  identifier: string;
  name: string;
}

export function RequestBuilder({ initialIdentifier, value, onChange, onSend, busy }: Props) {
  const { data: listData } = useQuery({
    queryKey: ["interfaces", "all"],
    queryFn: () =>
      api.get<{ items: InterfaceOption[] }>(`/api/interfaces?pageSize=200`),
  });

  const options = useMemo(() => listData?.data.items ?? [], [listData]);

  useEffect(() => {
    if (initialIdentifier && value.identifier === "") {
      onChange({ ...value, identifier: initialIdentifier });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdentifier]);

  const update = <K extends keyof RequestConfig>(k: K, v: RequestConfig[K]) => onChange({ ...value, [k]: v });

  return (
    <section className="bg-background border border-border rounded-lg mb-6">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-medium">请求构造</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-stretch gap-2">
          <select
            className="px-3 py-2 border border-border rounded-md text-sm font-mono bg-muted"
            value={value.method}
            onChange={(e) => update("method", e.target.value as "GET" | "POST")}
          >
            <option>GET</option>
            <option>POST</option>
          </select>
          <div className="flex-1 flex items-center px-3 py-2 border border-border rounded-md bg-muted font-mono text-sm">
            <span className="text-muted-foreground whitespace-nowrap">
              {typeof window !== "undefined" ? window.location.origin : ""}/mock/
            </span>
            <select
              className="bg-transparent font-mono text-sm focus:outline-none flex-1 min-w-0"
              value={value.identifier}
              onChange={(e) => update("identifier", e.target.value)}
            >
              <option value="">选择接口…</option>
              {options.map((o) => (
                <option key={o.identifier} value={o.identifier}>
                  {o.identifier}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={onSend} disabled={busy || !value.identifier}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            发送
          </Button>
        </div>

        <Tabs defaultValue="params" className="-mx-5">
          <TabsList className="border-b border-border rounded-none bg-transparent justify-start px-5">
            <TabsTrigger value="params" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Params
            </TabsTrigger>
            <TabsTrigger value="headers">Headers ({value.headers.filter((h) => h.enabled).length})</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
          </TabsList>

          <div className="px-5 pt-4">
            <TabsContent value="params">
              <KeyValueEditor rows={value.params} onChange={(rows) => update("params", rows)} />
            </TabsContent>
            <TabsContent value="headers">
              <KeyValueEditor rows={value.headers} onChange={(rows) => update("headers", rows)} />
            </TabsContent>
            <TabsContent value="body">
              <textarea
                rows={6}
                value={value.body}
                onChange={(e) => update("body", e.target.value)}
                className="editor w-full text-xs font-mono p-3 rounded border border-border focus:outline-none"
                placeholder='{"foo":"bar"}'
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  );
}

function KeyValueEditor({
  rows,
  onChange,
}: {
  rows: Array<{ key: string; value: string; enabled: boolean }>;
  onChange: (rows: Array<{ key: string; value: string; enabled: boolean }>) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, enabled: e.target.checked };
              onChange(next);
            }}
            className="rounded"
          />
          <Input
            value={row.key}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, key: e.target.value };
              onChange(next);
            }}
            className="font-mono w-32"
          />
          <Input
            value={row.value}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, value: e.target.value };
              onChange(next);
            }}
            className="flex-1 font-mono"
          />
          <button
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([...rows, { key: "", value: "", enabled: true }])}
      >
        <Plus className="w-3 h-3" />
        添加参数
      </Button>
    </div>
  );
}