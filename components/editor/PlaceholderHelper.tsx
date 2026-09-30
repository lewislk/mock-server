"use client";

/** Mock.js 占位符速查面板：点击将占位符插入到 textarea 光标位置。 */

import { useState } from "react";
import { Check } from "lucide-react";

import { PLACEHOLDER_WHITELIST } from "@/lib/placeholder";
import { insertAtCursor } from "@/lib/placeholder";
import { useToast } from "@/components/ui/toast";

const GROUPS: Array<{ name: string; items: string[] }> = [
  { name: "基础", items: ["@boolean", "@integer(1,100)", "@float(0,100,2,3)", "@string(5,10)", "@date('yyyy-MM-dd')", "@datetime"] },
  { name: "中文文本", items: ["@cname", "@ctitle", "@cword", "@csentence", "@cparagraph"] },
  { name: "地址", items: ["@province", "@city", "@county", "@zip"] },
  { name: "网络", items: ["@email", "@url", "@ip", "@domain"] },
  { name: "ID", items: ["@id", "@uuid"] },
  { name: "图片", items: ["@image", "@dataImage"] },
];

// 占位符是否在白名单中（取函数名部分）
function isKnown(name: string): boolean {
  const match = name.match(/^@([a-zA-Z][a-zA-Z0-9_]*)/);
  if (!match) return false;
  return (PLACEHOLDER_WHITELIST as readonly string[]).includes(match[1]!);
}

interface PlaceholderHelperProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (value: string) => void;
}

export function PlaceholderHelper({ textareaRef, onChange }: PlaceholderHelperProps) {
  const [recent, setRecent] = useState<string[]>([]);
  const { toast } = useToast();

  const handleInsert = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const next = insertAtCursor(ta, snippet);
    onChange(next);
    setRecent((prev) => {
      const filtered = prev.filter((p) => p !== snippet);
      return [snippet, ...filtered].slice(0, 4);
    });
    toast({ title: "已插入", description: snippet });
  };

  return (
    <section className="bg-background border border-border rounded-lg">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="font-medium text-sm">Mock.js 占位符</h2>
        <p className="text-xs text-muted-foreground mt-0.5">点击插入到光标位置</p>
      </div>
      <div className="p-3 max-h-96 overflow-auto scroll-thin text-xs space-y-3">
        {recent.length > 0 && (
          <div>
            <div className="text-muted-foreground font-medium mb-1.5">最近使用</div>
            <div className="flex flex-wrap gap-1">
              {recent.map((p) => (
                <PlaceholderChip key={p} snippet={p} onInsert={handleInsert} />
              ))}
            </div>
          </div>
        )}
        {GROUPS.map((g) => (
          <div key={g.name}>
            <div className="text-muted-foreground font-medium mb-1.5">{g.name}</div>
            <div className="flex flex-wrap gap-1">
              {g.items.map((p) => (
                <PlaceholderChip key={p} snippet={p} onInsert={handleInsert} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlaceholderChip({ snippet, onInsert }: { snippet: string; onInsert: (s: string) => void }) {
  const known = isKnown(snippet);
  return (
    <button
      type="button"
      onClick={() => onInsert(snippet)}
      className={
        "placeholder-tag inline-flex items-center gap-1 cursor-pointer hover:opacity-80 " +
        (known ? "" : "ring-1 ring-destructive/40")
      }
      title={known ? "已知占位符" : "未知占位符"}
    >
      {snippet}
      {known && <Check className="w-3 h-3" />}
    </button>
  );
}