"use client";

import { Plus } from "iconoir-react";
import type React from "react";

interface AddNodeCardProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export function AddNodeCard({ icon, label, onClick }: AddNodeCardProps) {
  return (
    <button
      onClick={onClick}
      className="h-11 w-full border border-kb-border-tertiary rounded-[10px] transition ease-linear flex items-center p-3 gap-2 group hover:bg-kb-bg-hover cursor-pointer"
      type="button"
    >
      <div className="w-5 h-5 shrink-0 flex items-center justify-center text-kb-content-secondary">
        {icon}
      </div>
      <span className="text-sm font-medium text-kb-content-secondary flex-1 text-left">
        {label}
      </span>
      <Plus className="w-5 h-5 text-kb-content-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
