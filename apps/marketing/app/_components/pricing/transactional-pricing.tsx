"use client";

import { useState } from "react";
import CountUp from "react-countup";
import { Heading, SelectField, Text } from "@kibamail/owly";
import * as Tooltip from "@kibamail/owly/tooltip";
import { BadgeCheck, CheckCircleSolid } from "iconoir-react";
import { USFlagIcon } from "@/app/_components/_icons/flags/us-flag.svg";
import { NigeriaFlagIcon } from "@/app/_components/_icons/flags/nigeria-flag.svg";
import { PricingSlider } from "./pricing-slider";

const features = [
  "Unlimited contacts",
  "Unlimited automations",
  "Unlimited forms & landing pages",
  "Unlimited team members",
  "Unlimited sending domains",
  "Unlimited email templates",
  "Unlimited broadcasts",
];

type Currency = "usd" | "ngn";

const PRICING = {
  usd: { rate: 0.1, symbol: "$" },
  ngn: { rate: 150, symbol: "₦" },
} as const;

function calculatePrice(emailCount: number, currency: Currency): number {
  return (emailCount / 1000) * PRICING[currency].rate;
}

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

export function TransactionalPricing() {
  const [emailCount, setEmailCount] = useState(0);
  const [currency, setCurrency] = useState<Currency>("usd");
  const [previousPrice, setPreviousPrice] = useState(
    calculatePrice(10000, "usd")
  );
  const currentPrice = calculatePrice(emailCount, currency);

  const handleSliderChange = (value: number[]) => {
    setPreviousPrice(currentPrice);
    setEmailCount(value[0]);
  };

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as Currency;
    setPreviousPrice(calculatePrice(emailCount, newCurrency));
    setCurrency(newCurrency);
  };

  const { symbol, rate } = PRICING[currency];

  return (
    <>
      <div className="w-full flex items-center justify-center mt-12 max-w-5xl mx-auto">
        <Text variant="secondary" size="lg" className="font-semibold!">
          {symbol}
          {rate} / 1,000 emails
        </Text>
      </div>

      <div className="w-full max-w-6xl mx-auto py-16 relative">
        <div className="rounded-2xl bg-kb-bg-secondary relative max-w-5xl mx-auto p-8 border border-kb-border-tertiary my-12">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col-reverse gap-8 md:gap-0 md:flex-row items-center justify-between">
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

              <Text variant="secondary" size="lg" className="font-semibold!">
                {emailCount.toLocaleString()} emails at {symbol}
                {rate} / 1,000 emails
              </Text>
            </div>

            <div className="flex flex-col gap-1">
              <PricingSlider
                min={0}
                max={1_000_000}
                value={[emailCount]}
                onValueChange={handleSliderChange}
              />

              <div className="flex items-center justify-between pl-1">
                <Text className="font-semibold!" size="lg" variant="secondary">
                  0
                </Text>
                <Text className="font-semibold!" size="lg" variant="secondary">
                  1,000,000
                </Text>
              </div>

              <div className="flex flex-wrap gap-4 justify-center p-4 bg-kb-bg-secondary border border-kb-border-tertiary mt-6 rounded-xl">
                {features.map((feature) => (
                  <div
                    className="flex items-center rounded-full border border-kb-border-tertiary px-3 py-2 gap-2 bg-kb-bg-primary"
                    key={feature}
                  >
                    <BadgeCheck className="text-kb-content-info w-4 h-4" />

                    <Text size="sm" variant="tertiary">
                      {feature}
                    </Text>
                  </div>
                ))}
              </div>
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
