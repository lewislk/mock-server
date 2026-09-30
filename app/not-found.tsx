import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl font-bold text-muted-foreground">404</div>
        <h1 className="text-xl font-semibold">页面不存在</h1>
        <p className="text-sm text-muted-foreground">你访问的页面已被删除或地址错误。</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}