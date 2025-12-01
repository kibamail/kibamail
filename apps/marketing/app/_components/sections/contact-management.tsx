import Image from "next/image";
import { Button, Heading, Text } from "@kibamail/owly";
import { SectionCard } from "../layout/section-card";

export function ContactManagement() {
  return (
    <SectionCard className="relative p-0! min-h-[400px]! overflow-hidden">
      <Image
        src="/images/contact-filters.png"
        alt="contact management"
        className="w-[75%] absolute left-[50%] translate-x-[-50%] top-6 hidden dark:block"
        width={1304}
        height={1160}
      />
      <Image
        src="/images/contact-filters-light.png"
        alt="contact management"
        className="w-[75%] absolute left-[50%] translate-x-[-50%] top-6 dark:hidden"
        width={1304}
        height={1160}
      />
      <div className="absolute w-full p-6 bottom-0 pb-6 md:px-8 md:pb-8 bg-linear-to-b from-transparent to-kb-bg-primary to-40%">
        <Heading
          className="mb-2! text-kb-content-primary text-base!"
          asChild
        >
          <h3>Contact management without limits</h3>
        </Heading>
        <Text variant="secondary" asChild>
          <p>
            We give you unlimited access to tools that help you build
            meaningful contact relationships that convert. Segments,
            topics, custom contact properties, and more.
          </p>
        </Text>
        <Button className="mt-6" variant="secondary">
          Explore contact management
        </Button>
      </div>
    </SectionCard>
  );
}
