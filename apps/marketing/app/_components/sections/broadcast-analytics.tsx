import Image from "next/image";
import { Button, Heading, Text } from "@kibamail/owly";
import { SectionCard } from "../layout/section-card";

export function BroadcastAnalytics() {
  return (
    <SectionCard className="relative md:h-[480px]! overflow-hidden">
      <div className="flex md:absolute mb-6 md:mb-0 z-2 top-0 h-full flex-col w-full md:w-[40%] bg-linear-to-l from-transparent to-white dark:to-kb-bg-primary">
        <div className="flex flex-col justify-center h-full">
          <Heading className="mb-4 text-kb-content-primary" asChild>
            <h3>Rich analytics and broadcast reports</h3>
          </Heading>
          <Text variant="secondary" className="mt-2!" asChild>
            <p>
              Get detailed information about your email campaigns,
              including open rates, click rates, and more. At a glance,
              know what works and improve.
            </p>
          </Text>
          <div className="mt-4">
            <Button variant="secondary">
              Explore broadcast analytics
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full md:absolute md:w-[65%] md:-right-6">
        <Image
          src="/images/broadcast-analytics-light-mode.png"
          width={3688}
          height={2438}
          className="dark:hidden"
          alt="broadcast analytics"
        />
        <Image
          src="/images/broadcast-analytics-dark-mode.png"
          width={3688}
          height={2438}
          className="hidden dark:block"
          alt="broadcast analytics"
        />
      </div>
    </SectionCard>
  );
}
