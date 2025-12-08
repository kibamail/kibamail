import { QueryProvider } from "@/lib/providers/query-provider";
import type { PropsWithChildren } from "react";

export default function FlowLayout({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
