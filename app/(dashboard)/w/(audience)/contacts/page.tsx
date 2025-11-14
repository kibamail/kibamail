import * as Tabs from "@kibamail/owly/tabs";
import { ContactsTable } from "./_components/contacts-table";
import { StatsCard, StatsCardItem } from "../../_components/stats-card";
import { Text } from "@kibamail/owly";

export default function ContactsPage() {
  return (
    <Tabs.Content value="contacts" className="py-4 space-y-6">
      <StatsCard>
        <StatsCardItem>
          <div className="text-center">
            <Text variant="h2" className="text-kb-content-primary">2,456</Text>
            <Text variant="label" className="text-kb-content-tertiary">Total Contacts</Text>
          </div>
        </StatsCardItem>
        <StatsCardItem>
          <div className="text-center">
            <Text variant="h2" className="text-kb-content-primary">1,823</Text>
            <Text variant="label" className="text-kb-content-tertiary">Subscribed</Text>
          </div>
        </StatsCardItem>
        <StatsCardItem>
          <div className="text-center">
            <Text variant="h2" className="text-kb-content-primary">456</Text>
            <Text variant="label" className="text-kb-content-tertiary">Unsubscribed</Text>
          </div>
        </StatsCardItem>
        <StatsCardItem>
          <div className="text-center">
            <Text variant="h2" className="text-kb-content-primary">177</Text>
            <Text variant="label" className="text-kb-content-tertiary">Bounced</Text>
          </div>
        </StatsCardItem>
      </StatsCard>

      <ContactsTable />
    </Tabs.Content>
  );
}
