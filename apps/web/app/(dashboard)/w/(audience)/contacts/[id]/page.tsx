import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderTitle,
} from "@kibamail/owly/dashboard-layout";
import type { ContactPropertyType } from "@prisma/client";
import dayjs from "dayjs";
import gravatarUrl from "gravatar-url";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { ContactActionsDropdown } from "./_components/contact-actions-dropdown";
import { CopyableId } from "./_components/copyable-id";
import { ContactActivityFeed } from "./_components/contact-activity-feed";

interface ContactDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Build properties object for a contact from contact property definitions
 */
function buildContactProperties(
  contact: any,
  properties: Array<{ name: string; slot: string }>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const property of properties) {
    const value = contact[property.slot];

    if (value !== null && value !== undefined) {
      result[property.name] = value;
    }
  }

  return result;
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const workspaceId = session.currentOrganization.id;

  // Fetch contact with topics
  const contact = await prisma.contact.findFirst({
    where: {
      id,
      workspaceId,
    },
    include: {
      topics: {
        select: {
          topicId: true,
        },
      },
    },
  });

  if (!contact) {
    notFound();
  }

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  // Build properties object
  const properties = buildContactProperties(contact, contactProperties);

  // Fetch topic details for display
  const topicDetails = await prisma.topic.findMany({
    where: {
      id: { in: contact.topics.map((t) => t.topicId) },
      workspaceId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Prepare contact data for the dropdown
  const contactForDropdown = {
    id: contact.id,
    email: contact.email,
    status: contact.status,
    topics: contact.topics.map((t) => t.topicId),
    properties,
  };

  return (
    <DashboardLayoutStickyContentHeaderContainer className="mt-8">
      <DashboardLayoutStickyDetailHeader>
        <div className="flex items-center gap-4 flex-1">
          <img
            src={gravatarUrl(contact.email, { size: 56 })}
            alt={`Avatar for ${contact.email}`}
            className="w-14 h-14 rounded-full object-cover"
          />

          <div className="flex flex-col flex-1">
            <DashboardLayoutStickyDetailHeaderDescription>
              Contact
            </DashboardLayoutStickyDetailHeaderDescription>
            <DashboardLayoutStickyDetailHeaderTitle>
              {contact.email}
            </DashboardLayoutStickyDetailHeaderTitle>
          </div>

          <ContactActionsDropdown variant="default" contact={contactForDropdown} />
        </div>
      </DashboardLayoutStickyDetailHeader>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-6">
          {/* Subscribed/Unsubscribed At */}
          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              {contact.status === "SUBSCRIBED" ? "Subscribed At" : "Unsubscribed At"}
            </div>
            <div className="text-sm text-kb-content-primary">
              {contact.status === "SUBSCRIBED"
                ? contact.subscribedAt
                  ? dayjs(contact.subscribedAt).format("MMM D, YYYY h:mm A")
                  : "-"
                : contact.unsubscribedAt
                ? dayjs(contact.unsubscribedAt).format("MMM D, YYYY h:mm A")
                : "-"}
            </div>
          </div>

          {/* ID */}
          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              ID
            </div>
            <CopyableId id={contact.id} />
          </div>

          {/* Status */}
          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              Status
            </div>
            <div className="text-sm text-kb-content-primary">
              {contact.status}
            </div>
          </div>

          {/* Topics */}
          <div>
            <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
              Topics
            </div>
            <div className="text-sm text-kb-content-primary">
              {topicDetails.length > 0
                ? topicDetails.map((t) => t.name).join(", ")
                : "-"}
            </div>
          </div>

          {/* Custom Properties */}
          {contactProperties.map((property) => {
            const value = properties[property.name];

            if (value === null || value === undefined) {
              return null;
            }

            let displayValue: string;

            if (property.type === "DATE" && typeof value === "number") {
              displayValue = dayjs(value).format("MMM D, YYYY");
            } else if (typeof value === "number") {
              displayValue = value.toLocaleString();
            } else {
              displayValue = String(value);
            }

            return (
              <div key={property.name}>
                <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
                  {property.name}
                </div>
                <div className="text-sm text-kb-content-primary">
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>

        <ContactActivityFeed />
      </div>
    </DashboardLayoutStickyContentHeaderContainer>
  );
}
