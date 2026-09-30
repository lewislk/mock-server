"use client";

/**
 * 共享的接口编辑表单：同时被 new 与 [id] 页面使用。
 * - 通过 onSubmit 回调把所有数据交给父组件（保存走不同 API）；
 * - Thrift / JSON 模板分别交给 ThriftEditor / JsonTemplateEditor；
 * - 实时预览由 ResponsePreview 触发。
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThriftEditor } from "@/components/editor/ThriftEditor";
import { JsonTemplateEditor } from "@/components/editor/JsonTemplateEditor";
import { PlaceholderHelper } from "@/components/editor/PlaceholderHelper";
import { ResponsePreview } from "@/components/preview/ResponsePreview";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/api-client";
import { identifierSchema } from "@/lib/schemas";
import { validateThrift } from "@/lib/thrift-parser";
import { generateJsonTemplate } from "@/lib/thrift-to-json";

export interface InterfaceFormValues {
  name: string;
  identifier: string;
  description: string;
  status: 0 | 1;
  thrift_def: string;
  json_template: string;
  array_length: number | null;
  status_code: number;
  delay_ms: number;
  error_rate: number;
}

interface Props {
  initial?: Partial<InterfaceFormValues> & { id?: string };
  mode: "create" | "update";
}

const DEFAULT_VALUES: InterfaceFormValues = {
  name: "",
  identifier: "",
  description: "",
  status: 1,
  thrift_def: "",
  json_template: '{"id": "@uuid"}',
  array_length: null,
  status_code: 200,
  delay_ms: 0,
  error_rate: 0,
};

export function InterfaceEditor({ initial, mode }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [values, setValues] = useState<InterfaceFormValues>({
    ...DEFAULT_VALUES,
    ...initial,
  });
  const [previewTrigger, setPreviewTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [identifierCheck, setIdentifierCheck] = useState<{ ok: boolean; message: string } | null>(null);

  const update = <K extends keyof InterfaceFormValues>(key: K, v: InterfaceFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const checkIdentifier = async (identifier: string) => {
    if (identifier === initial?.identifier) {
      setIdentifierCheck({ ok: true, message: "✓ 当前标识" });
      return;
    }
    const result = identifierSchema.safeParse(identifier);
    if (!result.success) {
      setIdentifierCheck({ ok: false, message: result.error.issues[0]?.message ?? "格式错误" });
      return;
    }
    try {
      const res = await api.get<{ items: unknown[]; pagination: { total: number } }>(
        `/api/interfaces?keyword=${encodeURIComponent(identifier)}&pageSize=5`,
      );
      const dup = res.data.items.find((it) => (it as { identifier: string }).identifier === identifier);
      if (dup) {
        setIdentifierCheck({ ok: false, message: "该标识已被占用" });
      } else {
        setIdentifierCheck({ ok: true, message: "✓ 该标识可用" });
      }
    } catch {
      setIdentifierCheck(null);
    }
  };

  const generateFromThrift = () => {
    const validation = validateThrift(values.thrift_def);
    if (!validation.valid) {
      toast({
        title: "Thrift 解析失败",
        description: validation.errors[0]?.message ?? "请检查语法",
        variant: "destructive",
      });
      return;
    }
    try {
      const generated = generateJsonTemplate(validation.file);
      update("json_template", generated);
      setPreviewTrigger((t) => t + 1);
      toast({ title: "已生成 JSON 模板", variant: "success" });
    } catch (err) {
      toast({ title: "生成失败", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        identifier: values.identifier,
        description: values.description || null,
        status: values.status,
        thrift_def: values.thrift_def || null,
        json_template: values.json_template,
        array_length: values.array_length,
        status_code: values.status_code,
        delay_ms: values.delay_ms,
        error_rate: values.error_rate,
      };
      if (mode === "create") {
        await api.post("/api/interfaces", payload);
        toast({ title: "已创建", variant: "success" });
      } else {
        await api.put(`/api/interfaces/${initial?.id}`, payload);
        toast({ title: "已保存", variant: "success" });
      }
      router.push("/");
    } catch (err) {
      toast({
        title: mode === "create" ? "创建失败" : "保存失败",
        description: err instanceof ApiClientError ? err.message : (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <header className="sticky top-0 z-10 bg-background border-b border-border px-8 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Mock 接口</Link>
          <span>/</span>
          <span className="text-foreground">{mode === "create" ? "新建" : "编辑"}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/">
            <Button variant="outline">取消</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "保存" : "保存"}
          </Button>
        </div>
      </header>

      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">
              {mode === "create" ? "新建 Mock 接口" : "编辑 Mock 接口"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "create"
                ? "定义接口契约并生成 JSON 模板"
                : `修改 ${initial?.identifier ?? ""} 的定义和响应模板`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/preview?identifier=${values.identifier || ""}`}>
              <Button variant="outline">实时预览</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard
                  .writeText(`${origin}/mock/${values.identifier || ""}`)
                  .then(() => toast({ title: "URL 已复制" }));
              }}
            >
              复制 URL
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center gap-3 text-sm">
          <div className="flex-1">
            <div className="text-blue-900 font-medium">Mock 接口地址</div>
            <code className="text-blue-700 text-xs">
              {origin}/mock/<strong>{values.identifier || "{identifier}"}</strong>
            </code>
            <span className="text-blue-600 text-xs ml-2">· 支持 GET / POST</span>
          </div>
          <span
            className={
              "inline-flex items-center gap-1 text-xs " +
              (values.status === 1 ? "text-success" : "text-muted-foreground")
            }
          >
            <span
              className={
                "w-1.5 h-1.5 rounded-full " + (values.status === 1 ? "bg-success" : "bg-muted")
              }
            />
            {values.status === 1 ? "已启用" : "已禁用"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <BasicInfoCard
              values={values}
              update={update}
              identifierCheck={identifierCheck}
              onCheckIdentifier={checkIdentifier}
            />
            <ThriftEditor
              value={values.thrift_def}
              onChange={(v) => update("thrift_def", v)}
              onGenerate={generateFromThrift}
            />
            <JsonTemplateEditor
              value={values.json_template}
              onChange={(v) => update("json_template", v)}
              onRegenerateFromThrift={generateFromThrift}
            />
            <AdvancedCard values={values} update={update} />
          </div>

          <div className="space-y-6">
            <ResponsePreview
              template={values.json_template}
              thriftDef={values.thrift_def}
              interfaceId={mode === "update" ? initial?.id : undefined}
              trigger={previewTrigger}
            />
            <PlaceholderHelper textareaRef={jsonTextareaRef} onChange={(v) => update("json_template", v)} />
          </div>
        </div>
      </div>
    </>
  );
}

function BasicInfoCard({
  values,
  update,
  identifierCheck,
  onCheckIdentifier,
}: {
  values: InterfaceFormValues;
  update: <K extends keyof InterfaceFormValues>(k: K, v: InterfaceFormValues[K]) => void;
  identifierCheck: { ok: boolean; message: string } | null;
  onCheckIdentifier: (id: string) => void;
}) {
  return (
    <section className="bg-background border border-border rounded-lg">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-medium">基本信息</h2>
        <p className="text-xs text-muted-foreground mt-0.5">接口的基本标识和分类信息</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block mb-1.5">接口名称 <span className="text-destructive">*</span></Label>
            <Input value={values.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label className="block mb-1.5">唯一标识 <span className="text-destructive">*</span></Label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-md text-xs text-muted-foreground font-mono">
                /mock/
              </span>
              <Input
                value={values.identifier}
                onChange={(e) => update("identifier", e.target.value)}
                onBlur={() => values.identifier && onCheckIdentifier(values.identifier)}
                className="rounded-l-none font-mono"
              />
            </div>
            {identifierCheck && (
              <div className={`text-xs mt-1 ${identifierCheck.ok ? "text-success" : "text-destructive"}`}>
                {identifierCheck.message}
              </div>
            )}
          </div>
        </div>
        <div>
          <Label className="block mb-1.5">描述</Label>
          <Textarea
            rows={2}
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="简要说明接口用途"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block mb-1.5">支持请求方法</Label>
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted/40">
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">GET</span>
              <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">POST</span>
              <span className="ml-auto text-xs text-muted-foreground">所有 Mock 接口统一支持</span>
            </div>
          </div>
          <div>
            <Label className="block mb-1.5">状态</Label>
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md">
              <button
                onClick={() => update("status", values.status === 1 ? 0 : 1)}
                className={
                  "w-9 h-5 rounded-full relative cursor-pointer transition-colors " +
                  (values.status === 1 ? "bg-primary" : "bg-border")
                }
              >
                <div
                  className={
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " +
                    (values.status === 1 ? "right-0.5" : "left-0.5")
                  }
                />
              </button>
              <span className="text-sm">{values.status === 1 ? "已启用" : "已禁用"}</span>
              <span className="ml-auto text-xs text-muted-foreground">禁用后该接口请求返回 404</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdvancedCard({
  values,
  update,
}: {
  values: InterfaceFormValues;
  update: <K extends keyof InterfaceFormValues>(k: K, v: InterfaceFormValues[K]) => void;
}) {
  return (
    <section className="bg-background border border-border rounded-lg">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-medium">高级配置</h2>
        <p className="text-xs text-muted-foreground mt-0.5">模拟真实环境：延迟、错误、状态码</p>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <Label className="block mb-1.5">响应状态码</Label>
          <Input
            type="number"
            value={values.status_code}
            min={100}
            max={599}
            onChange={(e) => update("status_code", Number(e.target.value))}
            className="font-mono"
          />
          <div className="text-xs text-muted-foreground mt-1">默认 200</div>
        </div>
        <div>
          <Label className="block mb-1.5">数组长度覆盖</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={values.array_length ?? ""}
              min={1}
              max={100}
              onChange={(e) => update("array_length", e.target.value ? Number(e.target.value) : null)}
              placeholder="留空使用全局"
              className="font-mono"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">· 全局: 3</span>
          </div>
        </div>
        <div>
          <Label className="block mb-1.5">模拟延迟（毫秒）</Label>
          <Input
            type="number"
            value={values.delay_ms}
            min={0}
            max={10000}
            onChange={(e) => update("delay_ms", Number(e.target.value))}
            className="font-mono"
          />
          <div className="text-xs text-muted-foreground mt-1">0 表示无延迟</div>
        </div>
        <div>
          <Label className="block mb-1.5">错误率 (%)</Label>
          <Input
            type="number"
            value={values.error_rate}
            min={0}
            max={100}
            step={0.1}
            onChange={(e) => update("error_rate", Number(e.target.value))}
            className="font-mono"
          />
          <div className="text-xs text-muted-foreground mt-1">命中后返回 500</div>
        </div>
      </div>
    </section>
  );
}