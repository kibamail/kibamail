"use client";

import * as Switch from "@kibamail/owly/switch";
import { useToast } from "@kibamail/owly/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface TrackingToggleProps {
  domainId: string;
  field: "openTrackingEnabled" | "clickTrackingEnabled";
  initialValue: boolean;
  label: string;
  help?: string;
}

export function TrackingToggle({
  domainId,
  field,
  initialValue,
  label,
  help,
}: TrackingToggleProps) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const [checked, setChecked] = useState(initialValue);

  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      return await internalApi.domains().update(domainId, {
        [field]: value,
      });
    },
    onSuccess: () => {
      toast(`${label} ${checked ? "disabled" : "enabled"}`);
      router.refresh();
    },
    onError: (error) => {
      setChecked(!checked);
      toastError(error.message || `Failed to update ${label.toLowerCase()}`);
    },
  });

  function handleChange(value: boolean) {
    setChecked(value);
    mutation.mutate(value);
  }

  return (
    <Switch.Root
      id={field}
      checked={checked}
      onCheckedChange={handleChange}
      disabled={mutation.isPending}
    >
      <Switch.Label htmlFor={field} help={help}>
        {label}
      </Switch.Label>
    </Switch.Root>
  );
}
