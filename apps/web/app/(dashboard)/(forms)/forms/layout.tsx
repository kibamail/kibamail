import { ToastProvider } from "@kibamail/owly/toast";
import type { PropsWithChildren } from "react";
import { QueryProvider } from "@/lib/providers/query-provider";

export default function FormsLayout({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
