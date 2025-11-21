"use client";

import { Badge } from "@kibamail/owly/badge";
import * as Table from "@kibamail/owly/table";
import { Text } from "@kibamail/owly";

interface Contact {
  id: string;
  workspaceId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  city: string | null;
  status: "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

interface ContactDetailClientProps {
  contact: Contact;
}

// Mock activity data - would come from API
const mockActivity = [
  {
    id: "1",
    type: "email_opened",
    description: "Opened email: Welcome to our newsletter",
    timestamp: "2024-01-15T14:30:00Z",
  },
  {
    id: "2", 
    type: "email_clicked",
    description: "Clicked link in email: Product announcement",
    timestamp: "2024-01-14T09:15:00Z",
  },
  {
    id: "3",
    type: "subscribed",
    description: "Subscribed to newsletter",
    timestamp: "2024-01-10T16:45:00Z",
  },
  {
    id: "4",
    type: "profile_updated",
    description: "Updated profile information",
    timestamp: "2024-01-08T11:20:00Z",
  },
];

export function ContactDetailClient({ contact }: ContactDetailClientProps) {
  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="mt-4">
        <Text variant="h3" className="mb-4">Contact Information</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-kb-surface-secondary rounded-lg">
          <div>
            <Text variant="label" className="text-kb-content-tertiary">Email</Text>
            <Text className="font-medium">{contact.email}</Text>
          </div>
          <div>
            <Text variant="label" className="text-kb-content-tertiary">Status</Text>
            <div className="mt-1">
              <Badge 
                variant={
                  contact.status === "SUBSCRIBED" 
                    ? "success" 
                    : contact.status === "UNSUBSCRIBED" 
                    ? "error"
                    : contact.status === "BOUNCED"
                    ? "warning"
                    : contact.status === "COMPLAINED"
                    ? "error"
                    : "neutral" // ARCHIVED
                } 
                size="sm"
              >
                {contact.status.charAt(0) + contact.status.slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>
          {contact.firstName && (
            <div>
              <Text variant="label" className="text-kb-content-tertiary">First Name</Text>
              <Text className="font-medium">{contact.firstName}</Text>
            </div>
          )}
          {contact.lastName && (
            <div>
              <Text variant="label" className="text-kb-content-tertiary">Last Name</Text>
              <Text className="font-medium">{contact.lastName}</Text>
            </div>
          )}
          {contact.phone && (
            <div>
              <Text variant="label" className="text-kb-content-tertiary">Phone</Text>
              <Text className="font-medium">{contact.phone}</Text>
            </div>
          )}
          {contact.country && (
            <div>
              <Text variant="label" className="text-kb-content-tertiary">Country</Text>
              <Text className="font-medium">{contact.country}</Text>
            </div>
          )}
          {contact.city && (
            <div>
              <Text variant="label" className="text-kb-content-tertiary">City</Text>
              <Text className="font-medium">{contact.city}</Text>
            </div>
          )}
          {contact.timezone && (
            <div>
              <Text variant="label" className="text-kb-content-tertiary">Timezone</Text>
              <Text className="font-medium">{contact.timezone}</Text>
            </div>
          )}
          <div>
            <Text variant="label" className="text-kb-content-tertiary">Created</Text>
            <Text className="font-medium">
              {new Date(contact.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>
          <div>
            <Text variant="label" className="text-kb-content-tertiary">Last Updated</Text>
            <Text className="font-medium">
              {new Date(contact.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long", 
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>
        </div>
      </div>

      {/* Activity History */}
      <div>
        <Text variant="h3" className="mb-4">Recent Activity</Text>
        <Table.Container>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Activity</Table.Head>
                <Table.Head>Description</Table.Head>
                <Table.Head className="w-[200px]">Time</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {mockActivity.map((activity) => (
                <Table.Row key={activity.id}>
                  <Table.Cell>
                    <Badge variant="neutral" size="sm">
                      {activity.type.replace(/_/g, " ")}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="text-sm">{activity.description}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="text-sm text-kb-content-tertiary">
                      {new Date(activity.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </div>
    </div>
  );
}
