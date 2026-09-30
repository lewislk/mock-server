"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, Copy, Download, Loader2, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/api-client";

interface ConversionResult {
  inferences: Array<{ name: string; type: string }>;
  thrift: string;
}

const EXAMPLE_JSON = `{
  "code": 200,
  "message": "success",
  "data": {
    "id": "u-12345",
    "username": "jianguo",
    "nickname": "李建国",
    "email": "jianguo@example.com",
    "age": 34,
    "verified": true,
    "balance": 1234.56,
    "tags": ["vip", "new"],
    "addresses": [
      {
        "province": "广东省",
        "city": "深圳市",
        "detail": "南山区科技园路 88 号"
      }
    ]
  }
}`;

const RULES = [
  { json: "string", example: '"hello"', thrift: "string", note: "直接映射" },
  { json: "integer", example: "42", thrift: "i32", note: "取值范围在 i32 内时" },
  { json: "integer", example: "9007199254740993", thrift: "i64", note: "超出 i32 范围" },
  { json: "number", example: "3.14", thrift: "double", note: "含小数部分" },
  { json: "boolean", example: "true", thrift: "bool", note: "直接映射" },
  { json: "array", example: "[...]", thrift: "list<T>", note: "T 由元素类型推断（取第一个）" },
  { json: "object", example: "{...}", thrift: "struct T", note: "嵌套结构生成新 struct，名字取自字段名" },
  { json: "null", example: "null", thrift: "optional<string>", note: "无类型信息时默认推断为 string" },
];

export function JsonToThriftConverter() {
  const router = useRouter();
  const { toast } = useToast();

  const [json, setJson] = useState(EXAMPLE_JSON);
  const [namespace, setNamespace] = useState("com.mock.generated");
  const [rootName, setRootName] = useState("RootResponse");
  const [allOptional, setAllOptional] = useState(true);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleConvert = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<ConversionResult>("/api/json-to-thrift", {
        json,
        namespace,
        root_name: rootName,
        all_optional: allOptional,
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const copyThrift = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.thrift);
    toast({ title: "已复制", variant: "success" });
  };

  const downloadThrift = () => {
    if (!result) return;
    const blob = new Blob([result.thrift], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-${ts}.thrift`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importToMock = async () => {
    if (!result) return;
    try {
      await api.post("/api/interfaces", {
        name: rootName,
        identifier: rootName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64) || "generated",
        description: "从 JSON → Thrift 转换生成",
        thrift_def: result.thrift,
        json_template: '{\n  "code": 200\n}',
        array_length: null,
        status_code: 200,
        delay_ms: 0,
        error_rate: 0,
      });
      toast({ title: "已导入 Mock 接口", variant: "success" });
      router.push("/");
    } catch (err) {
      toast({
        title: "导入失败",
        description: err instanceof ApiClientError ? err.message : (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background border-b border-border px-8 py-3 flex items-center gap-4">
        <div className="text-sm text-muted-foreground">JSON → Thrift</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent cursor-pointer inline-flex items-center gap-1">
            <Plus className="w-3 h-3" />
            上传 JSON
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                f.text().then((t) => setJson(t));
              }}
            />
          </label>
          <Button variant="outline" onClick={() => setJson(EXAMPLE_JSON)}>
            加载示例
          </Button>
        </div>
      </header>

      <div className="p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">JSON → Thrift 转换</h1>
          <p className="text-sm text-muted-foreground mt-1">
            粘贴 JSON 数据，自动推断并生成对应的 Thrift 结构定义文件
          </p>
        </div>

        <div className="bg-background border border-border rounded-lg mb-6 p-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">命名空间：</span>
            <Input
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="font-mono w-56"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">根结构名：</span>
            <Input
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              className="font-mono w-32"
            />
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox checked={allOptional} onCheckedChange={(v) => setAllOptional(Boolean(v))} />
            <span>所有字段 optional</span>
          </label>
          <Button onClick={handleConvert} disabled={busy} className="ml-auto">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            转换
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <section className="bg-background border border-border rounded-lg">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-medium">JSON 输入</h2>
              <p className="text-xs text-muted-foreground mt-0.5">支持任意嵌套结构</p>
            </div>
            <Textarea
              rows={22}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              className="editor text-xs font-mono rounded-t-none border-x-0 border-b-0 resize-none focus-visible:ring-0 min-h-[480px]"
            />
          </section>

          <section className="bg-background border border-border rounded-lg">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-medium">Thrift 输出</h2>
                <p className="text-xs text-muted-foreground mt-0.5">可下载或导入到 Mock 接口</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyThrift} disabled={!result}>
                  <Copy className="w-3 h-3" />
                  复制
                </Button>
                <Button variant="outline" size="sm" onClick={downloadThrift} disabled={!result}>
                  <Download className="w-3 h-3" />
                  下载
                </Button>
                <Button size="sm" onClick={importToMock} disabled={!result}>
                  <Save className="w-3 h-3" />
                  导入 Mock
                </Button>
              </div>
            </div>

            {error && (
              <div className="px-5 py-3 text-sm text-destructive bg-destructive/5 border-b border-destructive/20">
                {error}
              </div>
            )}

            {result && (
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">
                  类型推断结果 · 推断 {result.inferences.length} 个字段
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {result.inferences.map((inf) => (
                    <InferenceChip key={inf.name} name={inf.name} type={inf.type} />
                  ))}
                </div>
              </div>
            )}

            <pre className="editor text-xs p-5 overflow-auto scroll-thin min-h-[440px] whitespace-pre">
              <code>{result?.thrift ?? "// 点击「转换」生成 Thrift"}</code>
            </pre>
          </section>
        </div>

        <section className="bg-background border border-border rounded-lg mt-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-medium">类型推断规则</h2>
            <p className="text-xs text-muted-foreground mt-0.5">JSON 类型如何映射到 Thrift 类型</p>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">JSON</th>
                  <th className="pb-2 font-medium">示例值</th>
                  <th className="pb-2 font-medium">Thrift</th>
                  <th className="pb-2 font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {RULES.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 font-mono">{r.json}</td>
                    <td className="py-2 font-mono text-muted-foreground">{r.example}</td>
                    <td className="py-2 font-mono text-blue-700">{r.thrift}</td>
                    <td className="py-2 text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function InferenceChip({ name, type }: { name: string; type: string }) {
  const colorMap: Record<string, string> = {
    i32: "bg-blue-50 text-blue-700",
    i64: "bg-blue-50 text-blue-700",
    double: "bg-orange-50 text-orange-700",
    string: "bg-blue-50 text-blue-700",
    bool: "bg-green-50 text-green-700",
  };
  const isStruct = !["i32", "i64", "double", "string", "bool"].some((t) => type.includes(t));
  const isList = type.startsWith("list<");
  const cls = isStruct
    ? "bg-purple-50 text-purple-700"
    : isList
      ? "bg-pink-50 text-pink-700"
      : (colorMap[type] ?? "bg-blue-50 text-blue-700");
  return (
    <span className={`px-2 py-0.5 rounded font-mono ${cls}`}>
      {name} → <strong>{type}</strong>
    </span>
  );
}