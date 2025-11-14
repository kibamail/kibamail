import * as Tabs from "@kibamail/owly/tabs";
import { SegmentsTable } from "./_components/segments-table";

export default function SegmentsPage() {
  return (
    <Tabs.Content value="segments" className="py-4">
      <SegmentsTable />
    </Tabs.Content>
  );
}
