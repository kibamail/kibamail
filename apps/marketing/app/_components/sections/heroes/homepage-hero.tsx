import { Badge, Button, Text } from "@kibamail/owly";
import * as Tooltip from "@kibamail/owly/tooltip";
import { CheckCircle, HelpCircle } from "iconoir-react";
import type { ReactNode } from "react";
import { ProductToggle } from "./product-toggle";
import Image from "next/image";

interface Feature {
  title: string;
  description?: ReactNode;
}

const unlimitedSet = [
  "Unlimited contacts & automations",
  "Unlimited forms & landing pages",
  "Unlimited team members",
  "Unlimited domains",
  "Unlimited email templates",
];

const features: Feature[] = [
  { title: "No monthly subscriptions" },
  {
    title: "Unlimited features",
    description: (
      <div className="flex flex-col p-1">
        <div className="flex flex-col gap-2">
          <Text>
            We only charge you for one thing: a successful email delivery.
          </Text>

          <Text>In addition, you get:</Text>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {unlimitedSet.map((item) => (
            <div className="flex items-center gap-2" key={item}>
              <CheckCircle className="text-kb-content-positive w-4 h-4 shrink-0" />
              <Text className="font-semibold">{item}</Text>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Best in class deliverability",
  },
];

export function HomePageHero() {
  return (
    <div className="relative px-6 xl:px-0">
      <div className="w-full min-h-[728px] border-t-[0.5px] border-l-[0.5px] border-r-[0.5px] border-[rgba(91,47,14,0.10)] dark:border-kb-border-tertiary/40 overflow-hidden">
        {/* Background shape with notch */}

        <div className="mt-18 w-full mx-auto lg:max-w-2xl flex flex-col items-center px-6 sm:px-0">
          <h1 className="w-full font-heading text-kb-content-brand text-2xl lg:text-3xl xl:text-5xl text-left sm:text-center font-bold">
            Open-source <br /> alternative to aws ses
          </h1>
          <p className="mt-2 font-sans text-left sm:text-center w-full mx-auto sm:max-w-lg text-kb-content-secondary font-medium text-lg">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam
            blanditiis vel ipsa inventore qui accopritum.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 lg:gap-3 mt-6 items-center lg:justify-center w-full sm:max-w-lg lg:max-w-none">
            <Button className="w-full! lg:w-fit! px-[42px]!">
              Get started for free
            </Button>
            <Button variant="secondary" className="w-full! lg:w-fit!">
              Calculate your email savings
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 max-w-3xl mt-6">
            {features.map((feature) => (
              <div className="flex items-center gap-1" key={feature.title}>
                <CheckCircle className="text-kb-content-positive w-4 h-4 shrink-0" />
                <Text>{feature.title}</Text>
                {feature.description && (
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <button
                          type="button"
                          className="inline-flex cursor-pointer"
                        >
                          <HelpCircle className="text-kb-content-tertiary w-4 h-4" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content>{feature.description}</Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-[1210px] overflow-hidden">
          {/* Image positioned on top of SVG, inset from the rect */}
          <div className="w-full max-w-5xl mx-auto p-6">
            <div className="p-2 md:p-4 border border-white/20 shadow-md rounded-xl backdrop-blur-2xl bg-white/10">
              <Image
                src="/images/flat-brand.png"
                alt="Kibamail dashboard"
                className="relative rounded-xl object-cover"
                width={1060}
                height={685}
              />
            </div>
          </div>
        </div>

        <ProductToggle />
      </div>

      <div className="w-full py-6 border border-kb-border-tertiary dark:border-kb-border-tertiary/40">
        <div className="flex w-full flex-col items-center gap-2">
          <Text className="text-center" variant="secondary">
            Trusted by companies of all sizes
          </Text>

          <Text size="sm" variant="tertiary">
            No one yet, but it's coming soon.
          </Text>
        </div>
      </div>
    </div>
  );
}
