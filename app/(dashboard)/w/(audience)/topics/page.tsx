import * as Tabs from "@kibamail/owly/tabs";
import { TopicsTable } from "./_components/topics-table";

export default function TopicsPage() {
  return (
    <Tabs.Content value="topics" className="py-4">
      <TopicsTable />
    </Tabs.Content>
  );
}
