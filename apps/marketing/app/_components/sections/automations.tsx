import { Button, Text } from "@kibamail/owly";
import { AutomationsIcon } from "../_icons/automations.svg";

export function Automations() {
  return (
    <div className="w-full bg-kb-bg-brand-hover min-h-[420px] rounded-3xl relative p-0 border border-transparent overflow-hidden">
      <AutomationsIcon />

      <div
        className="absolute w-full bottom-0 rounded-b-3xl px-6 md:px-8 left-0 pt-12 pb-6 md:pb-8"
        style={{
          background:
            "linear-gradient(180deg, rgba(73, 38, 11, 0.00) 0%, #49260B 75%)",
        }}
      >
        <div className="w-full flex flex-col gap-0 dark:pt-4">
          <Text
            size="lg"
            variant="primary"
            className="text-white! font-semibold! mb-2"
          >
            Complete email automation solution
          </Text>
          <Text variant="secondary" className="text-(--gray-80)!">
            Flexible email automation enables you to sell digital products,
            onboard new customers, personalize your broadcasts and deliver high
            quality emails optimised for the inbox.
          </Text>

          <div className="mt-5">
            <Button variant="secondary">Explore marketing automation</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
