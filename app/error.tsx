"use client";

/** 全局错误边界。 */
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("渲染错误", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-slate-50 text-foreground min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold">页面出错了</h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "发生了未知错误，请稍后再试。"}
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      </body>
    </html>
  );
}