import type { EventType } from "@prisma/client";
import dayjs from "dayjs";
import {
  CheckCircle,
  WarningTriangle,
  Mail,
  Eye,
  MouseButtonRight,
  Clock,
  Xmark,
  MessageAlert,
  RefreshDouble,
  SendDiagonal,
  UserXmark,
} from "iconoir-react";

interface EmailEvent {
  id: string;
  type: EventType;
  createdAt: Date;
}

interface EmailEventTimelineProps {
  events: EmailEvent[];
}

function getEventIcon(type: EventType) {
  const iconClass = "w-5 h-5";

  switch (type) {
    case "Queued":
      return <Clock className={iconClass} />;
    case "Delivery":
      return <CheckCircle className={iconClass} />;
    case "Reception":
      return <Mail className={iconClass} />;
    case "Bounce":
    case "AdminBounce":
    case "OOB":
      return <WarningTriangle className={iconClass} />;
    case "TransientFailure":
      return <RefreshDouble className={iconClass} />;
    case "Expiration":
      return <Clock className={iconClass} />;
    case "Feedback":
      return <MessageAlert className={iconClass} />;
    case "Rejection":
      return <Xmark className={iconClass} />;
    case "Open":
      return <Eye className={iconClass} />;
    case "Click":
      return <MouseButtonRight className={iconClass} />;
    case "Unsubscribed":
    case "ListUnsubscribe":
      return <UserXmark className={iconClass} />;
    default:
      return <SendDiagonal className={iconClass} />;
  }
}

function getEventColors(type: EventType) {
  switch (type) {
    case "Queued":
      return {
        bg: "bg-slate-100 dark:bg-slate-900/20",
        text: "text-slate-600 dark:text-slate-400",
      };
    case "Delivery":
      return {
        bg: "bg-green-100 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
      };
    case "Reception":
      return {
        bg: "bg-blue-100 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
      };
    case "Bounce":
    case "AdminBounce":
    case "OOB":
      return {
        bg: "bg-red-100 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
      };
    case "TransientFailure":
      return {
        bg: "bg-amber-100 dark:bg-amber-900/20",
        text: "text-amber-600 dark:text-amber-400",
      };
    case "Expiration":
      return {
        bg: "bg-orange-100 dark:bg-orange-900/20",
        text: "text-orange-600 dark:text-orange-400",
      };
    case "Feedback":
      return {
        bg: "bg-rose-100 dark:bg-rose-900/20",
        text: "text-rose-600 dark:text-rose-400",
      };
    case "Rejection":
      return {
        bg: "bg-red-100 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
      };
    case "Open":
      return {
        bg: "bg-purple-100 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
      };
    case "Click":
      return {
        bg: "bg-indigo-100 dark:bg-indigo-900/20",
        text: "text-indigo-600 dark:text-indigo-400",
      };
    case "Unsubscribed":
    case "ListUnsubscribe":
      return {
        bg: "bg-gray-100 dark:bg-gray-900/20",
        text: "text-gray-600 dark:text-gray-400",
      };
    default:
      return {
        bg: "bg-gray-100 dark:bg-gray-900/20",
        text: "text-gray-600 dark:text-gray-400",
      };
  }
}

function getEventTitle(type: EventType): string {
  switch (type) {
    case "Queued":
      return "Email queued";
    case "Delivery":
      return "Email delivered";
    case "Reception":
      return "Email received by mail agent";
    case "Bounce":
      return "Email bounced";
    case "AdminBounce":
      return "Admin bounce";
    case "OOB":
      return "Out of band bounce";
    case "TransientFailure":
      return "Temporary delivery failure";
    case "Expiration":
      return "Email expired";
    case "Feedback":
      return "Spam complaint received";
    case "Rejection":
      return "Email rejected";
    case "AdminRebind":
      return "Admin rebind";
    case "Open":
      return "Email opened";
    case "Click":
      return "Link clicked";
    case "Unsubscribed":
      return "Unsubscribed via link";
    case "ListUnsubscribe":
      return "Unsubscribed via email client";
    default:
      return "Event";
  }
}

function formatTimestamp(date: Date): string {
  return dayjs(date).format("MMM D, YYYY [at] h:mm:ss A");
}

export function EmailEventTimeline({ events }: EmailEventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-kb-content-secondary mb-6">
          Email activity
        </h3>
        <p className="text-sm text-kb-content-tertiary">
          No events recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-kb-content-secondary mb-6">
        Email activity
      </h3>

      <div className="space-y-0">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
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
                  <div className="w-px bg-[var(--border-tertiary)] h-12" />
                )}
              </div>

              {/* Right side - Event details */}
              <div className={`flex-1 ${!isLast ? "pb-2" : ""}`}>
                <h4 className="text-sm font-medium text-kb-content-primary">
                  {getEventTitle(event.type)}
                </h4>
                <p className="text-sm text-kb-content-tertiary mt-0.5">
                  {formatTimestamp(event.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
