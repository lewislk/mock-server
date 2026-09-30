import { Sidebar } from "@/components/layout/Sidebar";
import { ToastHost } from "@/components/ui/toast";
import { Providers } from "./providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ToastHost>
        <div className="flex">
          <Sidebar />
          <main className="ml-60 flex-1 min-h-screen">{children}</main>
        </div>
      </ToastHost>
    </Providers>
  );
}