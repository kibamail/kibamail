import * as Tabs from "@kibamail/owly/tabs";
import { PropertiesTable } from "./_components/properties-table";

export default function PropertiesPage() {
  return (
    <Tabs.Content value="properties" className="py-4">
      <PropertiesTable />
    </Tabs.Content>
  );
}
