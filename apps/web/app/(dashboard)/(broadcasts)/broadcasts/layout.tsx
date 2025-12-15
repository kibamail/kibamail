import type { PropsWithChildren } from "react";
import { QueryProvider } from "@/lib/providers/query-provider";

export default function BroadcastsEditorLayout({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
