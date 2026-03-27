"use client";

import type { BaseComponentProps } from "@json-render/react";

interface HiddenFieldProps {
  name: string;
  value: string;
}

export function HiddenField({ props }: BaseComponentProps<HiddenFieldProps>) {
  return <input type="hidden" name={props.name} value={props.value} />;
}
