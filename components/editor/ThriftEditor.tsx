"use client";

import { forwardRef, useState } from "react";
import { FileText, CheckCircle2, AlertCircle, Loader2, Upload } from "lucide-react";

import { validateThrift } from "@/lib/thrift-parser";
import { validatePlaceholders } from "@/lib/placeholder";

interface ThriftEditorProps {
  value: string;
  onChange: (v: string) => void;
  onGenerate?: () => void;
}

export const ThriftEditor = forwardRef<HTMLTextAreaElement, ThriftEditorProps>(
  ({ value, onChange, onGenerate }, ref) => {
    const [validation, setValidation] = useState<ReturnType<typeof validateThrift> | null>(null);
    void validatePlaceholders; // 占位校验在 JSON 模板那边做
    const [busy, setBusy] = useState(false);

    const handleBlur = () => {
      if (!value.trim()) {
        setValidation(null);
        return;
      }
      setValidation(validateThrift(value));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        alert("文件超过 1MB 限制");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result ?? "");
        onChange(text);
        setValidation(validateThrift(text));
      };
      reader.readAsText(file);
    };

    const stats = validation?.valid ? validation.stats : null;
    const error = validation && !validation.valid ? validation.errors[0] : null;
    const lineCount = value ? value.split("\n").length : 0;

    return (
      <section className="bg-background border border-border rounded-lg">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-medium">Thrift 结构定义</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              编辑 Thrift 内容后点击「生成 JSON 模板」同步下方响应模板
            </p>
          </div>
          <label className="text-xs text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1">
            <Upload className="w-3 h-3" />
            导入 .thrift 文件
            <input type="file" accept=".thrift,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-mono">Thrift 编辑器</span>
            {validation === null && !value.trim() ? null : busy ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                校验中…
              </span>
            ) : stats ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3 h-3" />
                已解析 · {stats.fieldCount} 个字段 · {stats.nestedStructCount} 个嵌套结构
              </span>
            ) : error ? (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="w-3 h-3" />
                第 {error.line} 行: {error.message}
              </span>
            ) : null}
            <span className="ml-auto text-muted-foreground">{lineCount} 行</span>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Thrift</span>
              <span className="ml-auto font-mono">Thrift 编辑器 · 行 1, 列 1</span>
            </div>
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={handleBlur}
              className="editor w-full text-xs font-mono p-3 focus:outline-none resize-y border-0 block min-h-[300px]"
              spellCheck={false}
              placeholder={"namespace java com.mock\n\nstruct User {\n  1: required string name\n}"}
            />
          </div>

          {onGenerate && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">修改 Thrift 后点击右侧按钮同步下方 JSON 响应模板</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onChange("");
                    setValidation(null);
                  }}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
                >
                  清空
                </button>
                <button
                  disabled={busy || !validation?.valid}
                  onClick={() => {
                    setBusy(true);
                    onGenerate?.();
                    setTimeout(() => setBusy(false), 200);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  生成 JSON 模板
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  },
);
ThriftEditor.displayName = "ThriftEditor";