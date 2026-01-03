"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { WebhookDestination } from "@/webhooks/client/types";
import { WebhooksTable } from "./webhooks-table";

interface WebhooksPageClientProps {
  destinations: WebhookDestination[];
}

export function WebhooksPageClient({ destinations }: WebhooksPageClientProps) {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return <WebhooksTable destinations={destinations} />;
}
