"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  List,
  ArrowLeftRight,
  Settings,
  Eye,
  ScrollText,
  BookOpen,
  CircleDot,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const NAV: NavItem[] = [
  { href: "/", label: "Mock 接口", icon: List },
  { href: "/converter", label: "JSON → Thrift", icon: ArrowLeftRight },
  { href: "/preview", label: "快速预览", icon: Eye },
  { href: "/settings", label: "全局配置", icon: Settings },
];

const SECONDARY: NavItem[] = [
  { href: "#", label: "请求日志", icon: ScrollText },
  { href: "#", label: "使用文档", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-background border-r border-border min-h-screen fixed left-0 top-0 flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
            M
          </div>
          <div>
            <div className="font-semibold text-sm">Mock Server</div>
            <div className="text-xs text-muted-foreground">内部测试平台</div>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1 text-sm flex-1">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}

        <div className="pt-4 pb-2 px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          其他
        </div>
        {SECONDARY.map((item) => (
          <NavLink key={item.href} item={item} active={false} />
        ))}
      </nav>

      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="px-3 py-2">
          <div>v0.1.0 · 内部预览版</div>
          <div className="mt-1 flex items-center gap-1.5">
            <CircleDot className="w-3 h-3 text-success" />
            <span>运行中</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground",
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "" : "text-muted-foreground")} />
      <span>{item.label}</span>
      {item.badge !== undefined && (
        <span className="ml-auto text-xs bg-slate-700 text-white px-1.5 py-0.5 rounded">
          {item.badge}
        </span>
      )}
    </Link>
  );
}