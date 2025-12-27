"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { WebhooksTable } from "./webhooks-table";
import type { WebhookDestination } from "@/webhooks/client/types";

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
