"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import { Plus } from "iconoir-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

export function CreateAutomationButton() {
  const router = useRouter();
  const { success: toast } = useToast();

  const { mutate: createAutomation, isPending } = useMutation({
    mutationFn: async () => {
      return await internalApi.automations().create({
        name: "Untitled automation",
      });
    },
    onSuccess: (data) => {
      toast("Automation created successfully");

      posthog.capture("automation_created", {
        automation_id: data.id,
      });

      router.push(`/w/flows/${data.id}`);
    },
  });

  return (
    <Button onClick={() => createAutomation()} disabled={isPending}>
      <Plus className="w-4 h-4" />
      Create Automation
    </Button>
  );
}
