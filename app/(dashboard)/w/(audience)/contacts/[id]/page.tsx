import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderIcon,
  DashboardLayoutStickyDetailHeaderTitle,
} from "@kibamail/owly/dashboard-layout";
import gravatarUrl from "gravatar-url";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { ContactActionsDropdown } from "./_components/contact-actions-dropdown";

interface ContactDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      workspaceId: session.currentOrganization.id,
    },
  });

  if (!contact) {
    notFound();
  }

  return (
    <DashboardLayoutStickyContentHeaderContainer>
      <DashboardLayoutStickyDetailHeader>
        <DashboardLayoutStickyDetailHeaderIcon>
          <img
            src={gravatarUrl(contact.email, { size: 40 })}
            alt={`Avatar for ${contact.email}`}
            className="w-10 h-10 rounded-full object-cover"
          />
        </DashboardLayoutStickyDetailHeaderIcon>

        <div className="flex items-center">
          <div className="flex flex-col flex-1">
            <DashboardLayoutStickyDetailHeaderDescription>
              Contact
            </DashboardLayoutStickyDetailHeaderDescription>
            <DashboardLayoutStickyDetailHeaderTitle>
              {contact.email}
            </DashboardLayoutStickyDetailHeaderTitle>
          </div>

          <ContactActionsDropdown variant="default" />
        </div>
      </DashboardLayoutStickyDetailHeader>

      {/* TODO: Add contact details content here */}
      <div className="p-6">
        <p className="text-kb-content-tertiary">
          Contact details coming soon...
        </p>
      </div>
    </DashboardLayoutStickyContentHeaderContainer>
  );
}
