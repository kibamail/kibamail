"use client";

import type { ComponentType, SVGProps } from "react";
import { useState, useEffect } from "react";
import {
  CheckCircleSolid,
  Clock,
  CursorPointer,
  MinusCircleSolid,
  SendSolid,
  WarningTriangleSolid,
  XmarkCircleSolid,
} from "iconoir-react";
import { Button, Text } from "@kibamail/owly";
import { format } from "date-fns";
import { SectionCard } from "../layout/section-card";

const ROTATION_INTERVAL = 1800;
const ITEM_HEIGHT = 78;

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface EmailEvent {
  id: string;
  type: string;
  icon: IconComponent;
  iconColor: string;
  description: string;
  secondsAgo: number; // Offset in seconds from current time
}

const events: EmailEvent[] = [
  {
    id: "1",
    type: "Delivered",
    icon: SendSolid,
    iconColor: "text-kb-content-positive",
    description: "Your email was successfully delivered to the recipient.",
    secondsAgo: 3,
  },
  {
    id: "2",
    type: "Received",
    icon: CheckCircleSolid,
    iconColor: "text-kb-content-positive",
    description:
      "We successfully received your email and it is now queued for sending.",
    secondsAgo: 12,
  },
  {
    id: "3",
    type: "Clicked",
    icon: CursorPointer,
    iconColor: "text-kb-content-highlight",
    description: "The recipient clicked a link in your email.",
    secondsAgo: 24,
  },
  {
    id: "4",
    type: "Bounced",
    icon: XmarkCircleSolid,
    iconColor: "text-kb-content-negative",
    description:
      "The email could not be delivered. The recipient address may be invalid.",
    secondsAgo: 38,
  },
  {
    id: "5",
    type: "Complained",
    icon: WarningTriangleSolid,
    iconColor: "text-kb-content-notice",
    description: "The recipient marked this email as spam.",
    secondsAgo: 47,
  },
  {
    id: "6",
    type: "Blacklisted",
    icon: MinusCircleSolid,
    iconColor: "text-kb-content-negative",
    description:
      "This recipient has been blacklisted and will not receive emails.",
    secondsAgo: 55,
  },
];

function formatTimestamp(date: Date): string {
  return format(date, "MMM d, HH:mm:ss");
}

function getEventTimestamp(baseTime: Date, secondsAgo: number): string {
  const eventTime = new Date(baseTime.getTime() - secondsAgo * 1000);
  return formatTimestamp(eventTime);
}

export function EmailEvents() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [baseTime, setBaseTime] = useState<Date | null>(null);

  useEffect(() => {
    setBaseTime(new Date());
  }, []);

  const extendedEvents = [...events, ...events, ...events];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= events.length) {
          setTimeout(() => {
            setIsTransitioning(false);
            setCurrentIndex(0);

            setTimeout(() => setIsTransitioning(true), 50);
          }, 700);
        }
        return next;
      });
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const translateY = currentIndex * ITEM_HEIGHT;

  return (
    <SectionCard spacing="small" className="relative py-4! sm:py-6! lg:py-8!">
      <div className="px-6 max-h-56 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none dark:hidden bg-linear-to-t from-white/0 to-white" />
        <div className="absolute bottom-0 left-0 right-0 h-16 z-10 pointer-events-none dark:hidden bg-linear-to-b from-white/0 to-white" />
        <div
          className={`grid grid-cols-1 gap-3 ${
            isTransitioning
              ? "transition-transform duration-700 ease-in-out"
              : ""
          }`}
          style={{ transform: `translateY(-${translateY}px)` }}
        >
          {extendedEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div
                key={`${event.id}-${index}`}
                className="w-full bg-kb-bg-primary border border-kb-border-tertiary px-3 py-4 rounded-2xl flex items-center gap-3"
                style={{
                  boxShadow: "0 8px 16px -4px rgba(0, 0, 0, 0.08)",
                }}
              >
                <Icon className={event.iconColor} />

                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between">
                    <Text variant="primary">{event.type}</Text>
                    <Text
                      variant="secondary"
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <Clock className="w-4 h-4" />{" "}
                      {baseTime
                        ? getEventTimestamp(baseTime, event.secondsAgo)
                        : "--"}
                    </Text>
                  </div>

                  <Text variant="secondary">{event.description}</Text>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full flex flex-col gap-0 dark:pt-4">
        <Text size="lg" variant="primary">
          Real-time email events
        </Text>
        <Text variant="secondary">
          Get detailed clarity on the status of your emails. Receive real time
          webhooks to multiple destinations.
        </Text>

        <div className="mt-5">
          <Button variant="secondary">Learn more</Button>
        </div>
      </div>
    </SectionCard>
  );
}
