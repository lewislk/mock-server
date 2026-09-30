"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Pencil, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface InterfaceRow {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  status: number;
  json_template: string;
  updated_at: string;
}

interface Props {
  rows: InterfaceRow[];
  loading?: boolean;
  keyword?: string;
}

export function MockInterfaceTable({ rows, loading, keyword = "" }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="px-4 py-3 font-medium">接口名称</th>
            <th className="px-4 py-3 font-medium">唯一标识</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">更新时间</th>
            <th className="px-4 py-3 font-medium w-36">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading && (
            <tr>
              <td colSpan={5} className="text-center py-12 text-muted-foreground">
                <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                加载中…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-12 text-muted-foreground">
                <span>暂无 Mock 接口</span>
                {keyword ? null : (
                  <Link href="/interfaces/new" className="block mt-2 text-primary hover:underline">
                    新建一个 Mock 接口 →
                  </Link>
                )}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <TableRow key={row.id} row={row} keyword={keyword} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ row, keyword }: { row: InterfaceRow; keyword: string }) {
  const [showDelete, setShowDelete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggle = useMutation({
    mutationFn: () => api.post<{ id: string; status: number }>(`/api/interfaces/${row.id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interfaces"] });
      toast({ title: row.status === 1 ? "已禁用" : "已启用" });
    },
    onError: (e) => toast({ title: "操作失败", description: (e as Error).message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: () => api.delete<{ id: string }>(`/api/interfaces/${row.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interfaces"] });
      toast({ title: "已删除", variant: "success" });
      setShowDelete(false);
    },
    onError: (e) => {
      const message = e instanceof ApiClientError ? e.message : (e as Error).message;
      toast({ title: "删除失败", description: message, variant: "destructive" });
    },
  });

  const copyUrl = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/mock/${row.identifier}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "URL 已复制", description: url });
    } catch {
      toast({ title: "复制失败", description: "浏览器禁止了剪贴板访问", variant: "destructive" });
    }
  };

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3">
        <div className="font-medium">
          <Highlight text={row.name} keyword={keyword} />
        </div>
        {row.description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            <Highlight text={row.description} keyword={keyword} />
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs">/mock/<Highlight text={row.identifier} keyword={keyword} /></td>
      <td className="px-4 py-3">
        <button
          onClick={() => toggle.mutate()}
          className={cn(
            "inline-flex items-center gap-1 text-xs cursor-pointer",
            row.status === 1 ? "text-success" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              row.status === 1 ? "bg-success" : "bg-muted-foreground",
            )}
          />
          {row.status === 1 ? "启用" : "禁用"}
        </button>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
        {formatTime(row.updated_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/preview?identifier=${row.identifier}`}
            className="p-1.5 hover:bg-accent rounded"
            title="预览"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/interfaces/${row.id}`}
            className="p-1.5 hover:bg-accent rounded"
            title="编辑"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button onClick={copyUrl} className="p-1.5 hover:bg-accent rounded" title="复制 URL">
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Mock 接口</DialogTitle>
            <DialogDescription>
              输入接口名称 <strong>{row.name}</strong> 以确认删除。删除后不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DeleteForm onSubmit={() => remove.mutate()} onCancel={() => setShowDelete(false)} expected={row.name} />
        </DialogContent>
      </Dialog>
    </tr>
  );
}

function DeleteForm({
  onSubmit,
  onCancel,
  expected,
}: {
  onSubmit: () => void;
  onCancel: () => void;
  expected: string;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-3">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={expected} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button variant="destructive" disabled={value !== expected} onClick={onSubmit}>删除</Button>
      </DialogFooter>
    </div>
  );
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword) return <>{text}</>;
  const lower = text.toLowerCase();
  const k = keyword.toLowerCase();
  const idx = lower.indexOf(k);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + k.length)}</mark>
      {text.slice(idx + k.length)}
    </>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}