"use client";

import { Button } from "@kibamail/owly";
import {
  Calendar,
  ChatBubbleQuestion,
  Mail,
  Phone,
  Text,
  Check,
  Type,
  MenuScale,
} from "iconoir-react";

const formFieldTypes = [
  { id: "text", label: "Text input", icon: Text },
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "textarea", label: "Textarea", icon: Type },
  { id: "number", label: "Number", icon: MenuScale },
  { id: "date", label: "Date", icon: Calendar },
  { id: "checkbox", label: "Checkbox", icon: Check },
  { id: "select", label: "Dropdown", icon: ChatBubbleQuestion },
];

export function FormComposerSidebar() {
  return (
    <div className="w-[360px] box-border p-4 shrink-0 h-full border-l border-kb-border-tertiary flex flex-col gap-6">
      {/* Form Fields Group */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-kb-content-tertiary uppercase tracking-wider">
          Form Fields
        </h3>
        <div className="flex flex-col gap-2">
          {formFieldTypes.map((field) => (
            <Button
              key={field.id}
              variant="secondary"
              className="justify-start gap-3"
            >
              <field.icon className="w-5 h-5" />
              {field.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Form Settings Group */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-kb-content-tertiary uppercase tracking-wider">
          Settings
        </h3>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" className="justify-start">
            Form Settings
          </Button>
          <Button variant="secondary" className="justify-start">
            Success Message
          </Button>
          <Button variant="secondary" className="justify-start">
            Notifications
          </Button>
        </div>
      </div>
    </div>
  );
}
