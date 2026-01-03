import type { PropsWithChildren } from "react";
import { QueryProvider } from "@/lib/providers/query-provider";

export default function FlowLayout({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
