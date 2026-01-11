"use client";

import { StatUp } from "iconoir-react";

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center min-h-96 rounded-lg">
      <div className="text-center">
        <StatUp className="w-12 h-12 text-kb-content-tertiary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-kb-content-primary mb-2">
          {title}
        </h2>
        <p className="text-kb-content-secondary max-w-md">{description}</p>
      </div>
    </div>
  );
}
