"use client";

import { Button } from "@kibamail/owly/button";
import type { ContactStatus } from "@prisma/client";
import { NavArrowLeft, NavArrowRight } from "iconoir-react";
import Link from "next/link";

interface ContactsPaginationProps {
  hasMore: boolean;
  hasPrevious: boolean;
  firstId?: string;
  lastId?: string;
  search?: string;
  status?: ContactStatus;
}

export function ContactsPagination({
  hasMore,
  hasPrevious,
  firstId,
  lastId,
  search,
  status,
}: ContactsPaginationProps) {
  if (!hasMore && !hasPrevious) {
    return null;
  }

  const buildUrl = (direction: "next" | "prev") => {
    const params = new URLSearchParams();

    if (search) {
      params.set("search", search);
    }

    if (status) {
      params.set("status", status);
    }

    if (direction === "next" && lastId) {
      params.set("after", lastId);
    } else if (direction === "prev" && firstId) {
      params.set("before", firstId);
    }

    return `?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {hasPrevious && (
        <Button variant="secondary" size="sm" asChild>
          <Link href={buildUrl("prev")}>
            <NavArrowLeft className="w-4 h-4" />
            Previous
          </Link>
        </Button>
      )}
      {hasMore && (
        <Button variant="secondary" size="sm" asChild>
          <Link href={buildUrl("next")}>
            Next
            <NavArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
