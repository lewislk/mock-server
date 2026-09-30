"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/api-client";

interface ConfigData {
  array_length: number;
  locale: "zh-cn" | "en";
  error_sim_enabled: boolean;
  log_retention_days: number;
}

const DEFAULTS: ConfigData = {
  array_length: 3,
  locale: "zh-cn",
  error_sim_enabled: true,
  log_retention_days: 7,
};

export function SettingsForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<ConfigData>("/api/config"),
  });

  const [form, setForm] = useState<ConfigData | null>(null);

  const current: ConfigData = form ?? data?.data ?? DEFAULTS;
  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(data?.data);

  const save = useMutation({
    mutationFn: () => api.put<ConfigData>("/api/config", form ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setForm(null);
      toast({ title: "已保存", variant: "success" });
    },
    onError: (e) =>
      toast({
        title: "保存失败",
        description: e instanceof ApiClientError ? e.message : (e as Error).message,
        variant: "destructive",
      }),
  });

  const reset = () => setForm(DEFAULTS);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        加载中…
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background border-b border-border px-8 py-3 flex items-center gap-4">
        <div className="text-sm text-muted-foreground">全局配置</div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={reset}>恢复默认</Button>
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </Button>
        </div>
      </header>

      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">全局配置</h1>
          <p className="text-sm text-muted-foreground mt-1">影响所有 Mock 接口的默认值，修改后立即生效</p>
        </div>

        <section className="bg-background border border-border rounded-lg mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-medium">Mock 引擎</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Mock.js 的运行时配置</p>
          </div>
          <div className="p-5 space-y-5">
            <Row label="数组默认长度" hint="未覆盖接口的数组字段生成的项数">
              <Input
                type="number"
                min={1}
                max={100}
                value={current.array_length}
                onChange={(e) => setForm({ ...current, array_length: Number(e.target.value) })}
                className="w-24 font-mono"
              />
              <span className="text-sm text-muted-foreground">项</span>
              <span className="ml-auto text-xs text-muted-foreground">范围：1 - 100</span>
            </Row>

            <Row label="Mock.js 区域" hint="影响 @cname 等占位符的输出">
              <select
                value={current.locale}
                onChange={(e) => setForm({ ...current, locale: e.target.value as "zh-cn" | "en" })}
                className="px-3 py-2 border border-border rounded-md text-sm bg-background"
              >
                <option value="zh-cn">zh-cn — 简体中文（默认）</option>
                <option value="en">en — 英文</option>
              </select>
            </Row>

            <Row label="启用错误模拟" hint="关闭后所有接口的错误率配置失效">
              <Toggle
                checked={current.error_sim_enabled}
                onChange={(v) => setForm({ ...current, error_sim_enabled: v })}
              />
              <span className="text-sm">{current.error_sim_enabled ? "已启用" : "已禁用"}</span>
            </Row>
          </div>
        </section>

        <section className="bg-background border border-border rounded-lg mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-medium">请求日志</h2>
            <p className="text-xs text-muted-foreground mt-0.5">mock 接口被调用时的记录策略</p>
          </div>
          <div className="p-5 space-y-5">
            <Row label="日志保留天数" hint="定时任务每天清理过期日志">
              <Input
                type="number"
                min={1}
                max={90}
                value={current.log_retention_days}
                onChange={(e) => setForm({ ...current, log_retention_days: Number(e.target.value) })}
                className="w-24 font-mono"
              />
              <span className="text-sm text-muted-foreground">天</span>
            </Row>
          </div>
        </section>

        <section className="bg-background border border-border rounded-lg mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-medium">系统信息</h2>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <RowKV label="版本" value="v0.1.0 (build 20260930-rc1)" />
                <RowKV label="运行时" value={`Node.js ${process.versions.node} / Next.js 14.2`} />
                <RowKV label="数据库" value="MySQL 8.0" hint="已连接" hintClass="text-success" />
                <RowKV label="Mock 引擎" value="Mock.js 1.1.0" />
                <RowKV label="部署模式" value="单实例 · Docker Compose" />
                <RowKV label="监听地址" value="0.0.0.0:3000" />
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-background border border-destructive/40 rounded-lg mt-6">
          <div className="px-5 py-3 border-b border-destructive/40">
            <h2 className="font-medium text-destructive">危险操作</h2>
          </div>
          <div className="p-5 space-y-4">
            <DangerRow
              title="清理所有请求日志"
              desc="立即清空 mock_request_log 表，不会影响接口定义"
              action="清理日志"
            />
            <DangerRow
              title="重置全部 Mock 接口"
              desc="删除所有 mock_interface 记录，操作不可恢复"
              action="重置接口"
              bordered
            />
          </div>
        </section>
      </div>
    </>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-6">
      <div className="w-44 flex-shrink-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="flex-1 max-w-md flex items-center gap-3">{children}</div>
    </div>
  );
}

function RowKV({
  label,
  value,
  hint,
  hintClass = "text-muted-foreground",
}: {
  label: string;
  value: string;
  hint?: string;
  hintClass?: string;
}) {
  return (
    <tr>
      <td className="py-2.5 text-muted-foreground w-44">{label}</td>
      <td className="py-2.5 font-mono text-xs flex items-center gap-2">
        {value}
        {hint && (
          <span className={`inline-flex items-center gap-1 text-xs ${hintClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {hint}
          </span>
        )}
      </td>
    </tr>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        "w-9 h-5 rounded-full relative cursor-pointer transition-colors " +
        (checked ? "bg-primary" : "bg-border")
      }
    >
      <div
        className={
          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " +
          (checked ? "right-0.5" : "left-0.5")
        }
      />
    </button>
  );
}

function DangerRow({
  title,
  desc,
  action,
  bordered,
}: {
  title: string;
  desc: string;
  action: string;
  bordered?: boolean;
}) {
  return (
    <div className={"flex items-center justify-between " + (bordered ? "pt-4 border-t border-border" : "")}>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <Button
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => {
          if (confirm(`确认执行：${title}？`)) {
            alert("该操作未实装，请通过 API 或数据库手动执行。");
          }
        }}
      >
        {action}
      </Button>
    </div>
  );
}