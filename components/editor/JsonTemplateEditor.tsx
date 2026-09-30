"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

import { validatePlaceholders } from "@/lib/placeholder";

interface JsonTemplateEditorProps {
  value: string;
  onChange: (v: string) => void;
  onRegenerateFromThrift?: () => void;
}

export const JsonTemplateEditor = forwardRef<HTMLTextAreaElement, JsonTemplateEditorProps>(
  ({ value, onChange, onRegenerateFromThrift }, ref) => {
    const [validation, setValidation] = useState<ReturnType<typeof validatePlaceholders> | null>(null);
    const [formatError, setFormatError] = useState<string | null>(null);
    const [confirmRegen, setConfirmRegen] = useState(false);

    // 失焦校验
    const handleBlur = () => {
      if (!value.trim()) {
        setValidation(null);
        setFormatError(null);
        return;
      }
      try {
        JSON.parse(value);
        setFormatError(null);
        setValidation(validatePlaceholders(value));
      } catch (err) {
        setFormatError((err as Error).message);
        setValidation(null);
      }
    };

    useEffect(() => {
      // 内容清空时不显示错误
      if (!value.trim()) {
        setFormatError(null);
        setValidation(null);
      }
    }, [value]);

    const lineCount = useMemo(() => (value ? value.split("\n").length : 0), [value]);

    const formatJson = () => {
      try {
        const obj = JSON.parse(value);
        onChange(JSON.stringify(obj, null, 2));
      } catch (err) {
        setFormatError((err as Error).message);
      }
    };

    const handleRegenerate = () => {
      if (value.trim() && !confirmRegen) {
        setConfirmRegen(true);
        return;
      }
      setConfirmRegen(false);
      onRegenerateFromThrift?.();
    };

    return (
      <section className="bg-background border border-border rounded-lg">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-medium">
              JSON 响应模板 <span className="text-destructive">*</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              可任意修改：调整占位符、添加 wrapper、增删字段
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">占位符：</span>
            <span className="text-success">{validation?.valid.length ?? 0} 合法</span>
            <span className="text-muted-foreground">·</span>
            <span className={validation?.unknown.length ? "text-destructive" : "text-success"}>
              {validation?.unknown.length ?? 0} 未知
            </span>
            <button onClick={formatJson} className="ml-2 px-2 py-1 border border-border rounded hover:bg-accent">
              格式化
            </button>
            <button
              onClick={handleRegenerate}
              className="px-2 py-1 border border-border rounded hover:bg-accent"
            >
              {confirmRegen ? "确认覆盖？" : "从 Thrift 重新生成"}
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="border border-border rounded-md overflow-hidden">
            <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">JSON</span>
              <span className="ml-auto font-mono">{lineCount} 行</span>
            </div>
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setConfirmRegen(false);
              }}
              onBlur={handleBlur}
              className="editor w-full text-xs font-mono p-3 focus:outline-none resize-y border-0 block min-h-[280px]"
              spellCheck={false}
              placeholder='{\n  "id": "@uuid",\n  "name": "@cname"\n}'
            />
          </div>

          <div className="mt-2 text-xs flex items-start gap-2">
            {formatError ? (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="w-3 h-3" /> JSON 格式错误: {formatError}
              </span>
            ) : validation && validation.unknown.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="w-3 h-3" /> 未知占位符: {validation.unknown.join(", ")}
              </span>
            ) : validation ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3 h-3" /> 占位符校验通过
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Info className="w-3 h-3" /> 在数组字段上使用占位符时，系统会按全局「数组默认长度」或本接口「数组长度覆盖」生成数组项
              </span>
            )}
          </div>
        </div>
      </section>
    );
  },
);
JsonTemplateEditor.displayName = "JsonTemplateEditor";