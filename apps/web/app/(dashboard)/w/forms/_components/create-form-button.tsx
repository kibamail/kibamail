"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import { Plus } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

export function CreateFormButton() {
  const router = useRouter();
  const { success: toast } = useToast();

  const { mutate: createForm, isPending } = useMutation({
    mutationFn: async () => {
      return await internalApi.forms().create({
        name: "Untitled form",
        type: "SIGN_UP",
        display: "INLINE_EMBED",
        fields: { pages: [] },
      });
    },
    onSuccess: (data) => {
      toast("Form created successfully");
      router.push(`/forms/${data.id}`);
    },
  });

  return (
    <Button onClick={() => createForm()} disabled={isPending}>
      <Plus className="w-4 h-4" />
      Create Form
    </Button>
  );
}
