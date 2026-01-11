"use client";

import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import type { TransactionalEmailStatus } from "@prisma/client";
import { Filter } from "iconoir-react";
import { useRouter, useSearchParams } from "next/navigation";

type StatusFilterValue = TransactionalEmailStatus | "all";

const statusLabels: Record<StatusFilterValue, string> = {
  all: "All statuses",
  QUEUED: "Queued",
  SENDING: "Sending",
  DELIVERED: "Delivered",
  BOUNCED: "Bounced",
  COMPLAINED: "Complained",
  FAILED: "Failed",
};

export function EmailsStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus =
    (searchParams.get("status") as StatusFilterValue) || "all";

  function onStatusChange(status: StatusFilterValue) {
    const params = new URLSearchParams(searchParams.toString());

    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }

    params.delete("after");
    params.delete("before");

    router.replace(`?${params.toString()}`);
    router.refresh();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild className="shrink-0">
        <Button variant="secondary" size="sm">
          <Filter className="w-4 h-4" />
          {statusLabels[currentStatus]}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" className="w-48">
        <DropdownMenu.Item onClick={() => onStatusChange("all")}>
          {statusLabels.all}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={() => onStatusChange("DELIVERED")}>
          {statusLabels.DELIVERED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("QUEUED")}>
          {statusLabels.QUEUED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("SENDING")}>
          {statusLabels.SENDING}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("BOUNCED")}>
          {statusLabels.BOUNCED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("COMPLAINED")}>
          {statusLabels.COMPLAINED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("FAILED")}>
          {statusLabels.FAILED}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
