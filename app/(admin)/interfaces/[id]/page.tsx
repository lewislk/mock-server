"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { InterfaceEditor, type InterfaceFormValues } from "@/components/InterfaceEditor";
import { api, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RouteParams {
  id: string;
}

interface DetailResponse extends InterfaceFormValues {
  id: string;
}

export default function EditInterfacePage({ params }: { params: Promise<RouteParams> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ["interface", id],
    queryFn: () => api.get<DetailResponse>(`/api/interfaces/${id}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        加载中…
      </div>
    );
  }

  if (error) {
    const message = error instanceof ApiClientError ? error.message : (error as Error).message;
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-semibold">接口不存在</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    );
  }

  const record = data?.data;
  if (!record) return null;

  return (
    <InterfaceEditor
      mode="update"
      initial={{
        id: record.id,
        name: record.name,
        identifier: record.identifier,
        description: record.description ?? "",
        status: (record.status as 0 | 1) ?? 1,
        thrift_def: record.thrift_def ?? "",
        json_template: record.json_template,
        array_length: record.array_length ?? null,
        status_code: record.status_code,
        delay_ms: record.delay_ms,
        error_rate: record.error_rate,
      }}
    />
  );
}