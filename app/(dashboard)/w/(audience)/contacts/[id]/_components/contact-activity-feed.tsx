"use client";

import {
  Mail,
  MouseButtonRight,
  Page,
  UserPlus,
  EditPencil,
  Bookmark,
} from "iconoir-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface ActivityEvent {
  id: string;
  type:
    | "email_received"
    | "email_clicked"
    | "form_filled"
    | "subscribed"
    | "property_updated"
    | "topic_added";
  title: string;
  description?: string;
  timestamp: Date;
}

// Sample events for demonstration
const SAMPLE_EVENTS: ActivityEvent[] = [
  {
    id: "1",
    type: "email_clicked",
    title: "Clicked link in Welcome Email",
    description: "Clicked on 'Get Started' button in the welcome campaign",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "2",
    type: "email_received",
    title: "Received Welcome Email",
    description: "Welcome campaign - First email sent successfully",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "3",
    type: "form_filled",
    title: "Completed signup form",
    description: "Filled out the newsletter signup form on the homepage",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
  },
  {
    id: "4",
    type: "subscribed",
    title: "Subscribed to Marketing",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "5",
    type: "property_updated",
    title: "Profile updated",
    description: "Company name changed to 'Acme Corp'",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    id: "6",
    type: "topic_added",
    title: "Added to Product Updates topic",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
];

function getEventIcon(type: ActivityEvent["type"]) {
  const iconClass = "w-5 h-5";

  switch (type) {
    case "email_received":
      return <Mail className={iconClass} />;
    case "email_clicked":
      return <MouseButtonRight className={iconClass} />;
    case "form_filled":
      return <Page className={iconClass} />;
    case "subscribed":
      return <UserPlus className={iconClass} />;
    case "property_updated":
      return <EditPencil className={iconClass} />;
    case "topic_added":
      return <Bookmark className={iconClass} />;
    default:
      return <Mail className={iconClass} />;
  }
}

function getEventColors(type: ActivityEvent["type"]) {
  switch (type) {
    case "email_received":
      return {
        bg: "bg-blue-100 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
      };
    case "email_clicked":
      return {
        bg: "bg-green-100 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
      };
    case "form_filled":
      return {
        bg: "bg-purple-100 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
      };
    case "subscribed":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-900/20",
        text: "text-emerald-600 dark:text-emerald-400",
      };
    case "property_updated":
      return {
        bg: "bg-amber-100 dark:bg-amber-900/20",
        text: "text-amber-600 dark:text-amber-400",
      };
    case "topic_added":
      return {
        bg: "bg-indigo-100 dark:bg-indigo-900/20",
        text: "text-indigo-600 dark:text-indigo-400",
      };
    default:
      return {
        bg: "bg-gray-100 dark:bg-gray-900/20",
        text: "text-gray-600 dark:text-gray-400",
      };
  }
}

export function ContactActivityFeed() {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-kb-content-secondary mb-6">
        Contact activity
      </h3>

      <div className="space-y-0">
        {SAMPLE_EVENTS.map((event, index) => {
          const isLast = index === SAMPLE_EVENTS.length - 1;
          const hasDescription = !!event.description;
          const colors = getEventColors(event.type);

          return (
            <div key={event.id} className="flex gap-4">
              {/* Left side - Icon and timeline */}
              <div className="flex flex-col items-center">
                {/* Icon circle */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${colors.bg} ${colors.text} flex-shrink-0`}
                >
                  {getEventIcon(event.type)}
                </div>

                {/* Vertical line */}
                {!isLast && (
                  <div
                    className={`w-px bg-[var(--border-tertiary)] ${
                      hasDescription ? "h-20" : "h-16"
                    }`}
                  />
                )}
              </div>

              {/* Right side - Event details */}
              <div className={`flex-1 ${!isLast ? "pb-6" : ""}`}>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-kb-content-primary">
                    {event.title}
                  </h4>
                  <span className="text-xs text-kb-content-tertiary">
                    {dayjs(event.timestamp).fromNow()}
                  </span>
                </div>

                {event.description && (
                  <p className="text-sm text-kb-content-secondary mt-1">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
