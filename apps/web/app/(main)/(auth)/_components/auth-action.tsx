"use client";

import { Slot } from "@radix-ui/react-slot";

import type { ComponentProps } from "react";

export function AuthAction({ children, ...props }: ComponentProps<"button">) {
  return <Slot {...props}>{children}</Slot>;
}
