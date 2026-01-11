import { Button, Text } from "@kibamail/owly";
import { ProductToggle } from "./product-toggle";
import { HeroFeatures } from "./hero-features";
import Image from "next/image";
import Link from "next/link";

export function HomePageHero() {
  return (
    <div className="relative px-6 xl:px-0">
      <div className="w-full min-h-[728px] border-t-[0.5px] border-l-[0.5px] border-r-[0.5px] border-[rgba(91,47,14,0.10)] dark:border-kb-border-tertiary/40 overflow-hidden">
        <div className="mt-18 w-full mx-auto lg:max-w-2xl flex flex-col items-center px-6 sm:px-0">
          <h1 className="w-full font-heading text-kb-content-brand text-2xl lg:text-3xl xl:text-5xl text-left sm:text-center font-bold">
            Open-source <br /> alternative to aws ses
          </h1>
          <p className="mt-2 font-sans text-left sm:text-center w-full mx-auto sm:max-w-lg text-kb-content-secondary font-medium text-lg">
            Send transactional and marketing emails with a simple API.
            Pay only for what you send, with automatic deliverability
            best practices built in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 lg:gap-3 mt-6 items-center lg:justify-center w-full sm:max-w-lg lg:max-w-none">
            <Button className="w-full! lg:w-fit! px-[42px]!" asChild>
              <Link href="/w?action=register">Get started for free</Link>
            </Button>
            <Button variant="secondary" className="w-full! lg:w-fit!">
              Calculate your email savings
            </Button>
          </div>

          <HeroFeatures className="mt-6" />
        </div>

        <div className="relative w-full max-w-[1210px] overflow-hidden">
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
