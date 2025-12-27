import { Text } from "@kibamail/owly";
import * as Tabs from "@kibamail/owly/tabs";

export default function SettingsUsage() {
  return (
    <Tabs.Content value="usage" className="py-4">
      <Text>This is the usage tab of the settings page.</Text>
    </Tabs.Content>
  );
}
