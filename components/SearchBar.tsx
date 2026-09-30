"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  hitCount?: number;
  totalCount?: number;
}

export function SearchBar({ value, onChange, hitCount, totalCount }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="按名称、唯一标识或描述搜索…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 bg-muted border-transparent focus:bg-background focus:border-border"
        />
      </div>
      {(hitCount !== undefined || totalCount !== undefined) && (
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          {value ? `命中 ${hitCount ?? 0} / 共 ${totalCount ?? 0} 条` : `共 ${totalCount ?? 0} 条`}
        </span>
      )}
    </div>
  );
}