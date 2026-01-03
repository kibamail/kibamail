"use client";

import { Button } from "@kibamail/owly/button";
import { Text } from "@kibamail/owly/text";
import { Check } from "iconoir-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col">
      <Text size="xl" className="text-kb-content-primary font-semibold! mb-1">
        {title}
      </Text>
      {description && (
        <Text className="text-kb-content-secondary">{description}</Text>
      )}
    </div>
  );
}

export function SectionDivider() {
  return <div className="w-full h-px bg-kb-border-tertiary my-8" />;
}

interface SectionSaveButtonProps {
  onSave: () => void;
  isSaving: boolean;
}

export function SectionSaveButton({
  onSave,
  isSaving,
}: SectionSaveButtonProps) {
  return (
    <div className="mt-6 flex justify-end">
      <Button onClick={onSave} disabled={isSaving} loading={isSaving}>
        Save changes
      </Button>
    </div>
  );
}

interface ChecklistItemProps {
  children: React.ReactNode;
}

function _ChecklistItem({ children }: ChecklistItemProps) {
  return (
    <li className="flex items-start gap-1 text-sm text-kb-content-secondary">
      <Check className="w-4 h-4 text-kb-content-success mt-0.5 shrink-0" />
      <Text>{children}</Text>
    </li>
  );
}
