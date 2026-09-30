"use client";

/** 列表页顶部 4 个统计卡片。 */

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { api } from "@/lib/api-client";

interface ListStats {
  enabled: number;
  disabled: number;
  todayRequests: number;
}

export function StatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["interfaces", "stats"],
    queryFn: () =>
      api.get<{ items: unknown[]; pagination: unknown; stats: ListStats }>(
        "/api/interfaces?pageSize=1",
      ),
  });

  const stats = data?.data.stats;
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard label="接口总数" value={stats ? (data?.data.pagination as { total: number }).total : undefined} loading={isLoading} />
      <StatCard label="已启用" value={stats?.enabled} loading={isLoading} accent="text-success" />
      <StatCard label="已禁用" value={stats?.disabled} loading={isLoading} accent="text-muted-foreground" />
      <StatCard
        label="今日请求"
        value={stats?.todayRequests}
        loading={isLoading}
        hint="< 实时统计"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | undefined;
  loading: boolean;
  hint?: string;
  accent?: string;
}

function StatCard({ label, value, loading, hint, accent }: StatCardProps) {
  return (
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ?? ""}`}>
        {loading ? "—" : (value ?? 0).toLocaleString()}
      </div>
      {hint && (
        <div className="text-xs text-success mt-1 inline-flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" />
          {hint}
        </div>
      )}
    </div>
  );
}