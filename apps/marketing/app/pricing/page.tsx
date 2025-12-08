"use client";

import { useState } from "react";
import { Heading, Text } from "@kibamail/owly";
import * as Tabs from "@kibamail/owly/tabs";
import { SendIcon } from "@/app/_components/_icons/send.svg";
import { EngageIcon } from "@/app/_components/_icons/engage.svg";
import { TransactionalPricing } from "@/app/_components/pricing/transactional-pricing";
import { MarketingPricing } from "@/app/_components/pricing/marketing-pricing";
import { InboundPricing } from "@/app/_components/pricing/inbound-pricing";
import { PricingProvider } from "@/app/_components/pricing/pricing-context";
import { InboundIcon } from "@/app/_components/_icons/inbound.svg";

type PricingTab = "transactional" | "marketing" | "inbound";

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<PricingTab>("transactional");

  return (
    <div className="bg-kb-bg-primary dark:bg-kb-bg-secondary w-full">
      <div className="w-full max-w-7xl mx-auto py-16 ">
        <div className="px-6 md:px-0">
          <Heading variant="display" className="text-center">
            Pricing
          </Heading>

          <div className="max-w-lg mx-auto w-full mt-4">
            <Text className="text-center w-full inline-block">
              No subscriptions. No lock in. Pay only for emails we successfully
              delivered.
            </Text>
          </div>
        </div>

        <div className="mt-6 flex justify-center px-6 md:px-0">
          <Tabs.Root
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PricingTab)}
            className="w-full!"
          >
            <div className="w-full flex items-center justify-center">
              <Tabs.List className="h-12! w-full flex max-w-xl mx-auto">
                <Tabs.Trigger value="transactional" className="cursor-pointer">
                  <SendIcon className="text-kb-content-negative" />
                  Transactional
                </Tabs.Trigger>
                <Tabs.Trigger value="marketing" className="cursor-pointer">
                  <EngageIcon className="text-kb-content-positive" />
                  Marketing
                </Tabs.Trigger>
                <Tabs.Trigger value="inbound" className="cursor-pointer">
                  <InboundIcon className="text-kb-content-brand" />
                  Inbound
                </Tabs.Trigger>

                <Tabs.Indicator />
              </Tabs.List>
            </div>

            <PricingProvider defaultEmailCount={50_000}>
              <Tabs.Content value="transactional">
                <TransactionalPricing />
              </Tabs.Content>
              <Tabs.Content value="marketing">
                <MarketingPricing />
              </Tabs.Content>
              <Tabs.Content value="inbound">
                <InboundPricing />
              </Tabs.Content>
            </PricingProvider>
          </Tabs.Root>
        </div>
      </div>
    </div>
  );
}
