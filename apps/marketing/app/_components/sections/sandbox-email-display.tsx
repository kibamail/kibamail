"use client";

import { useState, useEffect } from "react";
import { Badge, type BadgeProps, Text } from "@kibamail/owly";

interface SandboxEmail {
  email: string;
  variant: BadgeProps["variant"];
  label: string;
}

const sandboxEmails: SandboxEmail[] = [
  {
    email: "bounced@kibamail.dev",
    variant: "error",
    label: "Bounced",
  },
  {
    email: "complained@kibamail.dev",
    variant: "warning",
    label: "Complained",
  },
  {
    email: "delivered@kibamail.dev",
    variant: "success",
    label: "Delivered",
  },
  {
    email: "clicked@kibamail.dev",
    variant: "info",
    label: "Clicked",
  },
];

const ROTATION_INTERVAL = 2000;

export function SandboxEmailDisplay() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % sandboxEmails.length);
        setIsTransitioning(false);
      }, 300);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const currentEmail = sandboxEmails[currentIndex];

  return (
    <div className="absolute w-[85%] md:w-[70%] border-2 border-kb-bg-brand rounded-lg h-12 top-[35%] left-[50%] translate-x-[-50%] flex items-center justify-center px-6 gap-3 overflow-hidden">
      <div
        className={`flex items-center gap-3 transition-all duration-300 ease-in-out ${
          isTransitioning
            ? "translate-y-8 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <Badge
          variant={currentEmail.variant}
          className="rounded-full! px-3!"
          size="sm"
        >
          {currentEmail.label}
        </Badge>
        <Text className="font-mono! text-white! font-semibold! md:text-lg! cursor-pointer">
          {currentEmail.email}
        </Text>
      </div>
    </div>
  );
}
