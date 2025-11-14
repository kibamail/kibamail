import { notFound } from "next/navigation";
import {
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderIcon,
  DashboardLayoutStickyDetailHeaderTitle,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import { User } from "iconoir-react";
import { ContactDetailClient } from "../_components/contact-detail-client";

interface ContactDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Mock function to get contact - replace with real API call
async function getContact(id: string) {
  // This would be replaced with actual API call
  const mockContacts = [
    {
      id: "cm3yz1abc123",
      workspaceId: "org_123",
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      phone: "+1-555-0123",
      country: "US",
      timezone: "America/New_York",
      city: "New York",
      status: "SUBSCRIBED" as const,
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "cm3yz2def456",
      workspaceId: "org_123",
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+1-555-0124",
      country: "CA",
      timezone: "America/Toronto",
      city: "Toronto",
      status: "UNSUBSCRIBED" as const,
      createdAt: "2024-01-10T14:20:00Z",
      updatedAt: "2024-01-12T09:15:00Z",
    },
    {
      id: "cm3yz3ghi789",
      workspaceId: "org_123",
      email: "bob.johnson@example.com",
      firstName: "Bob",
      lastName: "Johnson",
      phone: null,
      country: "GB",
      timezone: "Europe/London",
      city: "London",
      status: "SUBSCRIBED" as const,
      createdAt: "2024-01-08T16:45:00Z",
      updatedAt: "2024-01-08T16:45:00Z",
    },
    {
      id: "cm3yz4jkl012",
      workspaceId: "org_123",
      email: "alice.brown@example.com",
      firstName: "Alice",
      lastName: "Brown",
      phone: "+1-555-0125",
      country: "AU",
      timezone: "Australia/Sydney",
      city: "Sydney",
      status: "BOUNCED" as const,
      createdAt: "2024-01-05T08:10:00Z",
      updatedAt: "2024-01-06T12:30:00Z",
    },
  ];

  return mockContacts.find(contact => contact.id === id) || null;
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;
  
  const contact = await getContact(id);

  if (!contact) {
    notFound();
  }

  const displayName = contact.firstName && contact.lastName 
    ? `${contact.firstName} ${contact.lastName}`
    : contact.firstName || contact.lastName || contact.email;

  return (
    <DashboardLayoutStickyContentHeaderContainer>
      <DashboardLayoutStickyDetailHeader>
        <DashboardLayoutStickyDetailHeaderIcon>
          <User />
        </DashboardLayoutStickyDetailHeaderIcon>

        <div className="flex items-center">
          <div className="flex flex-col flex-1">
            <DashboardLayoutStickyDetailHeaderDescription>
              Contact
            </DashboardLayoutStickyDetailHeaderDescription>
            <DashboardLayoutStickyDetailHeaderTitle>
              {displayName}
            </DashboardLayoutStickyDetailHeaderTitle>
          </div>

          {/* Contact actions dropdown would go here */}
        </div>
      </DashboardLayoutStickyDetailHeader>

      <ContactDetailClient contact={contact} />
    </DashboardLayoutStickyContentHeaderContainer>
  );
}
