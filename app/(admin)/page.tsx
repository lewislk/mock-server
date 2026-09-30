"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/StatsCards";
import { SearchBar } from "@/components/SearchBar";
import { MockInterfaceTable, type InterfaceRow } from "@/components/MockInterfaceTable";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";

interface ListResponse {
  items: InterfaceRow[];
  pagination: { page: number; pageSize: number; total: number };
}

export default function ListPage() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(keyword, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["interfaces", { keyword: debounced, status, page }],
    queryFn: () => {
      const params = new URLSearchParams({
        keyword: debounced,
        status,
        page: String(page),
        pageSize: "10",
      });
      return api.get<ListResponse>(`/api/interfaces?${params.toString()}`);
    },
  });

  const items = data?.data.items ?? [];
  const pagination = data?.data.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Mock 接口管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理和维护所有 Mock 接口，命中 <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/mock/{`{identifier}`}</code> 的请求
          </p>
        </div>
        <Link href="/interfaces/new">
          <Button>
            <Plus className="w-4 h-4" />
            新建 Mock 接口
          </Button>
        </Link>
      </div>

      <StatsCards />

      <div className="bg-background border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <SearchBar
            value={keyword}
            onChange={(v) => {
              setKeyword(v);
              setPage(1);
            }}
            hitCount={items.length}
            totalCount={total}
          />
        </div>
        <div className="border-b border-border px-4 flex items-center gap-1">
          {(
            [
              { key: "all", label: "全部" },
              { key: "enabled", label: "已启用" },
              { key: "disabled", label: "已禁用" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={
                "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors " +
                (status === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MockInterfaceTable rows={items} loading={isLoading} keyword={debounced} />

        {pagination && pagination.total > 0 && (
          <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              显示 {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} 条，共 {total} 条
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>
              <span className="px-3 py-1 text-xs">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}