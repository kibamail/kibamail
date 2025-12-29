import { Button } from "@kibamail/owly";
import {
  Box3dCenter,
  Code,
  DatabaseScript,
  Filter,
  GitFork,
  Lock,
  Mail,
  MessageText,
  Puzzle,
  ShareAndroid,
} from "iconoir-react";
import { HeroFeatures } from "../../../_components/sections/heroes/hero-features";
import { PageSection } from "../../../_components/layout/page-section";
import {
  BentoGrid,
  type BentoFeature,
} from "../../../_components/sections/bento-grid";
import {
  StickyFeatures,
  type StickyFeature,
} from "../../../_components/sections/sticky-features";
import {
  FeaturesWithCTA,
  type Feature,
} from "../../../_components/sections/features-with-cta";

const inboundFeatures: BentoFeature[] = [
  {
    title: "Automatic threading",
    description:
      "All email replies maintain proper threading automatically. Group conversations together and extract just the new content from each reply.",
    icon: <MessageText className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Flexible routing",
    description:
      "Direct specific addresses to dedicated endpoints or set up catch-all forwarding. Route emails based on recipient, sender, subject, or custom rules.",
    icon: <GitFork className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Spam filtering",
    description:
      "Built-in spam detection with configurable handling. Choose to reject, flag, or accept suspicious emails based on your application's needs.",
    icon: <Filter className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Webhook API",
    description:
      "Receive parsed emails as webhook payloads in real-time, typically under 100ms. Automatic retries with exponential backoff ensure delivery.",
    icon: <ShareAndroid className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Unlimited mailboxes",
    description:
      "Create unlimited mailboxes on your custom domains. Configure MX records once and receive email at any address on your domain.",
    icon: <Box3dCenter className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Structured parsing",
    description:
      "Automatically extract headers, body content, attachments, and metadata into clean JSON. Ready to use in your application immediately.",
    icon: <DatabaseScript className="w-5 h-5 text-kb-content-tertiary" />,
  },
];

const useCaseFeatures: StickyFeature[] = [
  {
    label: "AI email agents",
    title: "Build intelligent email agents",
    description:
      "Route all incoming mail from your support domain to a single webhook endpoint. Let AI agents read, understand, and respond to customer emails automatically. Maintain proper threading across every reply in the conversation.",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
  },
  {
    label: "Customer support",
    title: "Build support systems that scale",
    description:
      "Turn incoming emails into support tickets automatically. Parse customer emails, extract key information, route to the right team, and integrate with your existing helpdesk or CRM. Handle thousands of support emails without breaking a sweat.",
    image:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop",
  },
  {
    label: "Document processing",
    title: "Automate document workflows",
    description:
      "Receive invoices, receipts, contracts, and documents via email. Extract attachments, parse content, and route to your document management system. Perfect for accounts payable, legal, and compliance workflows.",
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop",
  },
];

const ctaFeatures: Feature[] = [
  {
    title: "Custom domains",
    content:
      "Use your own domain to receive emails. Set up unlimited email addresses and catch-all routing with simple DNS configuration.",
    icon: <Mail className="text-kb-content-tertiary" />,
  },
  {
    title: "API access",
    content:
      "Query received emails via API. Search by sender, recipient, date, or content. Perfect for building custom email clients or audit systems.",
    icon: <Code className="text-kb-content-tertiary" />,
  },
  {
    title: "Security & compliance",
    content:
      "All emails encrypted at rest. Configurable retention policies, audit logs, and GDPR compliance tools. SOC 2 Type II certified infrastructure.",
    icon: <Lock className="text-kb-content-tertiary" />,
  },
  {
    title: "Third-party integrations",
    content:
      "Connect to Slack, Discord, Zapier, and hundreds of other tools. Trigger workflows and automations when emails arrive.",
    icon: <Puzzle className="text-kb-content-tertiary" />,
  },
];

export default function InboundProductPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="relative px-6 xl:px-0 pb-24 md:pb-32">
          <div className="w-full min-h-[728px] overflow-hidden">
            <div className="mt-24 sm:mt-32 lg:mt-48 w-full mx-auto lg:max-w-2xl flex flex-col items-center">
              <h1 className="w-full font-heading text-kb-content-brand max-w-xl text-2xl lg:text-3xl xl:text-5xl text-left sm:text-center font-bold">
                Receive emails using webhooks. Automate your inbox.
              </h1>
              <p className="mt-2 font-sans text-left sm:text-center w-full mx-auto sm:max-w-lg text-kb-content-secondary font-medium text-lg">
                Receive, parse, reply, and thread emails within mailboxes. Build
                AI email agents, support systems, and automated workflows with
                our webhook API.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 lg:gap-3 mt-8 items-center lg:justify-center w-full sm:max-w-lg lg:max-w-none">
                <Button className="w-full! lg:w-fit! px-[42px]!">
                  Get started for free
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
                  src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=800&fit=crop"
                  alt="Inbound email processing dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageSection
        label="use cases"
        variant="secondary"
        title="Complete email infrastructure for modern applications"
        description="Send transactional emails, receive inbound messages, and build AI email agents with our webhook API."
      >
        <StickyFeatures features={useCaseFeatures} />
      </PageSection>

      <PageSection
        label="features"
        title="Everything you need to process emails"
        description="Powerful parsing, threading, and routing capabilities. Real-time delivery, typically under 100ms."
      >
        <BentoGrid features={inboundFeatures} />
      </PageSection>

      <FeaturesWithCTA
        label="INBOUND"
        title="Email as an input for your application."
        description="Stop building email infrastructure from scratch. Kibamail handles the complexity of receiving, parsing, and routing emails so you can focus on building your product."
        buttonText="Start receiving emails"
        features={ctaFeatures}
        showCommunitySection={false}
      />
    </>
  );
}
