import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mock Server",
  description: "内部 Mock 接口管理平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50 text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}