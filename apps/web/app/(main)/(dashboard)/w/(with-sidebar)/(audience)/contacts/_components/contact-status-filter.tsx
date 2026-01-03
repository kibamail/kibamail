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
        <DropdownMenu.Item onClick={() => onStatusChange("SUBSCRIBED")}>
          {statusLabels.SUBSCRIBED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("UNSUBSCRIBED")}>
          {statusLabels.UNSUBSCRIBED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("BOUNCED")}>
          {statusLabels.BOUNCED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("COMPLAINED")}>
          {statusLabels.COMPLAINED}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onStatusChange("ARCHIVED")}>
          {statusLabels.ARCHIVED}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
