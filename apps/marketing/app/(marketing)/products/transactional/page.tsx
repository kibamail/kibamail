import { Button } from "@kibamail/owly";
import {
  Code,
  FastArrowRight,
  Lock,
  RefreshDouble,
  Server,
  Shield,
  Timer,
  ShareAndroid,
} from "iconoir-react";
import { HeroFeatures } from "@/app/_components/sections/heroes/hero-features";
import { PageSection } from "@/app/_components/layout/page-section";
import { SectionCard } from "@/app/_components/layout/section-card";
import {
  BentoGrid,
  type BentoFeature,
} from "@/app/_components/sections/bento-grid";
import {
  StickyFeatures,
  type StickyFeature,
} from "@/app/_components/sections/sticky-features";
import {
  FeaturesWithCTA,
  type Feature,
} from "@/app/_components/sections/features-with-cta";
import { CodeShowcase } from "@/app/_components/sections/code-showcase";
import { Sandbox } from "@/app/_components/sections/sandbox";
import { EmailEvents } from "@/app/_components/sections/email-events";
import { generateCodeSamples } from "@/app/_lib/code-samples";
import Link from "next/link";

const transactionalFeatures: BentoFeature[] = [
  {
    title: "Fast by default",
    description:
      "Emails delivered in milliseconds. Global infrastructure means your users get password resets and confirmations instantly.",
    icon: <FastArrowRight className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Always available",
    description:
      "99.99% uptime SLA. Redundant infrastructure across regions ensures your emails never wait for maintenance windows.",
    icon: <Server className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Real-time visibility",
    description:
      "Webhooks notify you the moment something happens. Deliveries, opens, clicks, bounces—all in real-time.",
    icon: <ShareAndroid className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Smart retries",
    description:
      "Temporary failures are handled automatically with exponential backoff. You write code, we handle reliability.",
    icon: <RefreshDouble className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Deliverability managed",
    description:
      "Rate limiting, IP warmup, and reputation monitoring built in. We handle the complexity so you don't have to.",
    icon: <Timer className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Secure by design",
    description:
      "Encryption in transit and at rest. Your sensitive data protected with industry-standard security.",
    icon: <Lock className="w-5 h-5 text-kb-content-tertiary" />,
  },
];

const integrationFeatures: StickyFeature[] = [
  {
    label: "SDKs",
    title: "Send with your favorite stack",
    description:
      "Node.js, Python, Ruby, Go, PHP—pick your language. Full TypeScript support, async/await patterns, and documentation that actually helps.",
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop",
  },
  {
    label: "REST API",
    title: "One API call to send",
    description:
      "REST conventions, JSON responses, predictable URLs. Send your first email in minutes. OpenAPI spec included for code generation.",
    image:
      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=600&fit=crop",
  },
  {
    label: "SMTP",
    title: "Works with existing apps",
    description:
      "Swap credentials and you're done. No code changes. Works with WordPress, legacy apps, or anything that speaks SMTP.",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
  },
];

const ctaFeatures: Feature[] = [
  {
    title: "Your own IPs",
    content:
      "Dedicated IP addresses with full reputation control. Automatic warmup and continuous health monitoring included.",
    icon: <Server className="text-kb-content-tertiary" />,
  },
  {
    title: "Templates that scale",
    content:
      "Store, version, and preview templates. Dynamic variables for personalization. Test before you send.",
    icon: <Code className="text-kb-content-tertiary" />,
  },
  {
    title: "Compliance handled",
    content:
      "Unsubscribes, bounces, and complaints processed automatically. Stay compliant without the overhead.",
    icon: <Shield className="text-kb-content-tertiary" />,
  },
  {
    title: "Analytics everywhere",
    content:
      "Delivery rates, opens, clicks—all tracked. Export to your platform or query via API.",
    icon: <Timer className="text-kb-content-tertiary" />,
  },
];

export default async function TransactionalProductPage() {
  const codeSamples = await generateCodeSamples();

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="relative px-6 xl:px-0 pb-24 md:pb-32">
          <div className="w-full min-h-[728px] overflow-hidden">
            <div className="mt-24 sm:mt-32 lg:mt-48 w-full mx-auto lg:max-w-2xl flex flex-col items-center">
              <h1 className="w-full font-heading text-kb-content-brand max-w-xl text-2xl lg:text-3xl xl:text-5xl text-left sm:text-center font-bold">
                From code to inbox
              </h1>
              <p className="mt-2 font-sans text-left sm:text-center w-full mx-auto sm:max-w-lg text-kb-content-secondary font-medium text-lg">
                Send password resets, receipts, and notifications with a single
                API call. Fast delivery, real-time tracking, and reliability
                that scales with you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 lg:gap-3 mt-8 items-center lg:justify-center w-full sm:max-w-lg lg:max-w-none">
                <Button className="w-full! lg:w-fit! px-[42px]!" asChild>
                  <Link href="https://app.kibamail.com/w?action=register">Get started for free</Link>
                </Button>
                <Button variant="secondary" className="w-full! lg:w-fit!">
                  View documentation
                </Button>
              </div>

              <HeroFeatures className="mt-6" />
            </div>

            <div className="relative w-full max-w-5xl overflow-hidden mx-auto">
              <div className="w-full border border-kb-border-tertiary mt-12 rounded-lg overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop"
                  alt="Transactional email dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageSection
        label="developer first"
        title="Start sending in minutes"
        description="One API key. One function call. Your first email in production before your coffee gets cold."
      >
        <SectionCard>
          <CodeShowcase codeSamples={codeSamples} />
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
          <Sandbox />
          <EmailEvents />
        </div>
      </PageSection>

      <PageSection
        label="flexible"
        variant="secondary"
        title="Your stack, your way"
        description="SDKs, REST API, or SMTP. Pick the integration that fits your workflow."
      >
        <StickyFeatures features={integrationFeatures} />
      </PageSection>

      <PageSection
        label="reliability"
        title="Infrastructure that disappears"
        description="You focus on building. We handle deliverability, retries, and compliance."
      >
        <BentoGrid features={transactionalFeatures} />
      </PageSection>

      <FeaturesWithCTA
        label="SCALE"
        title="Email that grows with you."
        description="Start free, scale to millions. Same API, same reliability, from your first user to your millionth."
        buttonText="Start sending for free"
        buttonHref="https://app.kibamail.com/w?action=register"
        features={ctaFeatures}
        showCommunitySection={false}
      />
    </>
  );
}
