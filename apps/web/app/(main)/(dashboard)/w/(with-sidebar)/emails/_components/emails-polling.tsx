"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLLING_INTERVAL = 3000; // 3 seconds

export function EmailsPolling() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
