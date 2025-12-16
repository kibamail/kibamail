"use client";

import CountUp from "react-countup";
import { Heading, SelectField, Text } from "@kibamail/owly";
import * as Tooltip from "@kibamail/owly/tooltip";
import { BadgeCheck, CheckCircleSolid } from "iconoir-react";
import { USFlagIcon } from "@/app/_components/_icons/flags/us-flag.svg";
import { NigeriaFlagIcon } from "@/app/_components/_icons/flags/nigeria-flag.svg";
import { PricingSlider } from "./pricing-slider";
import {
  type Currency,
  type PricingType,
  PRICING_CONFIGS,
  CURRENCY_SYMBOLS,
  calculateTieredPrice,
  getTierRate,
} from "./pricing-config";
import { usePricing } from "./pricing-context";

const features = [
  "Unlimited contacts",
  "Unlimited automations",
  "Unlimited forms & landing pages",
  "Unlimited team members",
  "Unlimited sending domains",
  "Unlimited sender identities",
  "Unlimited email templates",
  "Unlimited broadcasts",
];

const featureGroups: {
  title: string;
  features: { name: string; description?: string; value?: string }[];
}[] = [
  {
    title: "Sending & Receiving",
    features: [
      {
        name: "Daily limit",
        description: "Maximum emails sent per day",
        value: "Unlimited",
      },
      {
        name: "SMTP Relay",
        description: "Send emails using our SMTP service",
        value: "Unlimited",
      },
    ],
  },
  {
    title: "Security & Compliance",
    features: [
      {
        name: "Social login",
        description:
          "Login to your account using your Google or GitHub account.",
      },
      {
        name: "Multi-factor authentication",
        description:
          "Secure your accounts with passkeys, authenticator app TOTP, SMS, email and backup codes.",
      },
      {
        name: "Role based access control",
        description:
          "Manage your team access using organization level roles and permissions.",
      },
      {
        name: "Scope based API access",
        description:
          "Generate API keys with fine grained scoped permissions for added security.",
      },
      {
        name: "Signed webhook events",
        description: "Webhook events and payloads are signed securely.",
      },
    ],
  },
];

interface EmailPricingProps {
  type: PricingType;
}

export function EmailPricing({ type }: EmailPricingProps) {
  const {
    emailCount,
    setEmailCount,
    currency,
    setCurrency,
    previousPrice,
    setPreviousPrice,
  } = usePricing();

  const config = PRICING_CONFIGS[type];
  const currentPrice = calculateTieredPrice(emailCount, currency, type);
  const symbol = CURRENCY_SYMBOLS[currency];

  const handleSliderChange = (value: number[]) => {
    setPreviousPrice(currentPrice);
    setEmailCount(value[0]);
  };

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as Currency;
    setPreviousPrice(calculateTieredPrice(emailCount, newCurrency, type));
    setCurrency(newCurrency);
  };

  return (
    <>
      <div className="max-w-5xl mx-auto">
        <Heading size="sm" className="my-6! text-kb-content-primary">
          Pay-as-you-go pricing
        </Heading>

        {config.tiers.map((tier) => (
          <div
            key={tier.label}
            className="w-full grid grid-cols-12 h-14 items-center border-b border-kb-border-tertiary"
          >
            <div className="col-span-10 md:col-span-8">
              <Text size="lg" variant="primary">
                {tier.label}
              </Text>
            </div>

            <div className="col-span-2">
              <Text size="lg" variant="secondary" className="font-semibold!">
                {getTierRate(tier, currency)}
              </Text>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-kb-bg-secondary relative max-w-5xl mx-auto p-8 border border-kb-border-tertiary my-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col-reverse gap-8 md:gap-0 md:flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <Heading
                  size="xl"
                  className="font-bold! text-5xl!"
                  variant="display"
                >
                  {symbol}
                  <CountUp
                    start={previousPrice}
                    end={currentPrice}
                    duration={0.5}
                    decimals={2}
                    preserveValue
                  />
                </Heading>

                <Text size="lg" variant="secondary">
                  for {emailCount.toLocaleString()} emails
                </Text>
              </div>

              <div className="w-full md:max-w-40">
                <SelectField.Root
                  className="w-full"
                  value={currency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectField.Trigger placeholder="Select currency" />
                  <SelectField.Content>
                    <SelectField.Item value="usd">
                      <USFlagIcon className="w-5 h-4" />
                      USD
                    </SelectField.Item>
                    <SelectField.Item value="ngn">
                      <NigeriaFlagIcon className="w-5 h-4" />
                      NGN
                    </SelectField.Item>
                  </SelectField.Content>
                </SelectField.Root>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <PricingSlider
              min={0}
              max={1_000_000}
              value={[emailCount]}
              onValueChange={handleSliderChange}
              markers={[
                { value: 0, label: "0" },
                { value: 200_000, label: "200k" },
                { value: 400_000, label: "400k" },
                { value: 600_000, label: "600k" },
                { value: 800_000, label: "800k" },
                { value: 1_000_000, label: "1M" },
              ]}
            />

            <div className="flex flex-wrap gap-4 justify-center p-4 bg-kb-bg-secondary border border-kb-border-tertiary mt-6 rounded-xl">
              {features.map((feature) => (
                <div
                  className="flex items-center rounded-full border border-kb-border-tertiary px-3 py-2 gap-2 bg-kb-bg-primary"
                  key={feature}
                >
                  <BadgeCheck className="text-kb-content-info w-4 h-4" />

                  <Text size="sm" variant="secondary">
                    {feature}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {featureGroups.map((group) => (
        <div className="max-w-5xl w-full mx-auto mb-8" key={group.title}>
          <Heading className="mb-6! text-kb-content-primary">
            {group.title}
          </Heading>

          {group.features.map((feature) => (
            <div
              className="w-full grid grid-cols-12 max-w-5xl mx-auto h-14 items-center border-b border-kb-border-tertiary"
              key={feature.name}
            >
              <div className="col-span-10 md:col-span-8">
                {feature.description ? (
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex cursor-help"
                        >
                          <Text
                            size="lg"
                            variant="secondary"
                            className="underline decoration-dashed underline-offset-4"
                          >
                            {feature.name}
                          </Text>
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content>{feature.description}</Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                ) : (
                  <Text size="lg" variant="secondary">
                    {feature.name}
                  </Text>
                )}
              </div>
              <div className="col-span-2 md:col-span-4 flex items-center gap-2">
                <CheckCircleSolid className="text-kb-content-positive w-5 h-5" />

                {feature?.value ? <Text>{feature?.value}</Text> : null}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
