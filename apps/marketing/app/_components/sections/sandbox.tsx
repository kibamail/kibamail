import { Button, Text } from "@kibamail/owly";
import { SandboxBackgroundSvg } from "../_icons/sandbox-background.svg";
import { SandboxEmailDisplay } from "./sandbox-email-display";

export function Sandbox() {
  return (
    <div className="w-full bg-kb-bg-brand-hover min-h-[400px] rounded-3xl relative p-0 border border-transparent">
      <SandboxBackgroundSvg />

      <SandboxEmailDisplay />

      <div className="absolute w-full bottom-0 rounded-b-3xl px-6 md:px-8 left-0 bg-kb-bg-brand-hover pb-6 md:pb-12">
        <div className="w-full flex flex-col gap-0 dark:pt-4">
          <Text size="lg" variant="primary" className="text-white!">
            Test your emails in the sandbox
          </Text>
          <Text variant="secondary" className="text-(--gray-80)!">
            A safe environment to test email events, webhooks and analyze your
            email content spam score.
          </Text>

          <div className="mt-5">
            <Button variant="secondary">Learn more</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
