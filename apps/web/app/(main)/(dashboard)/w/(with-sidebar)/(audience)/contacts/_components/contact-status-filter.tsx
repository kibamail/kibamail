"use client";

import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import type { ContactStatus } from "@prisma/client";
import { Filter } from "iconoir-react";
import { useRouter, useSearchParams } from "next/navigation";

type StatusFilterValue = ContactStatus | "all";

const statusLabels: Record<StatusFilterValue, string> = {
  all: "All statuses",
  SUBSCRIBED: "Subscribed",
  UNSUBSCRIBED: "Unsubscribed",
  BOUNCED: "Bounced",
  COMPLAINED: "Complained",
  ARCHIVED: "Archived",
  UNCONFIRMED: "Pending opt in",
};

export function ContactStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus =
    (searchParams.get("status") as StatusFilterValue) || "all";

  function handleStatusChange(status: StatusFilterValue) {
    const params = new URLSearchParams(searchParams.toString());

    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }

    // Reset pagination when filtering
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
        <DropdownMenu.Item onClick={() => handleStatusChange("all")}>
          {statusLabels.all}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={() => handleStatusChange("SUBSCRIBED")}>
          {statusLabels.SUBSCRIBED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => handleStatusChange("UNSUBSCRIBED")}>
          {statusLabels.UNSUBSCRIBED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => handleStatusChange("BOUNCED")}>
          {statusLabels.BOUNCED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => handleStatusChange("COMPLAINED")}>
          {statusLabels.COMPLAINED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => handleStatusChange("ARCHIVED")}>
          {statusLabels.ARCHIVED}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
