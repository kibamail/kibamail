import { Button } from "@kibamail/owly";
import {
  SendMail,
  Group,
  StatsReport,
  Timer,
  FilterList,
  WebWindowEnergyConsumption,
  Rocket,
  Sparks,
  GraphUp,
  MailOpen,
  UserStar,
} from "iconoir-react";
import { HeroFeatures } from "@/app/(marketing)/_components/sections/heroes/hero-features";
import { PageSection } from "@/app/(marketing)/_components/layout/page-section";
import {
  BentoGrid,
  type BentoFeature,
} from "@/app/(marketing)/_components/sections/bento-grid";
import {
  StickyFeatures,
  type StickyFeature,
} from "@/app/(marketing)/_components/sections/sticky-features";
import {
  FeaturesWithCTA,
  type Feature,
} from "@/app/(marketing)/_components/sections/features-with-cta";

const marketingFeatures: BentoFeature[] = [
  {
    title: "Visual email builder",
    description:
      "Create stunning emails with our drag-and-drop editor. No coding required. Choose from beautiful templates or build your own from scratch.",
    icon: <SendMail className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Audience segmentation",
    description:
      "Target the right people with powerful segmentation based on behavior, preferences, and custom properties.",
    icon: <Group className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Real-time analytics",
    description:
      "Track opens, clicks, and conversions in real-time. Make data-driven decisions to improve your campaigns.",
    icon: <StatsReport className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Smart scheduling",
    description:
      "Send emails at the perfect time for each subscriber based on their timezone and engagement patterns.",
    icon: <Timer className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "Advanced filtering",
    description:
      "Build complex audience filters with our intuitive query builder. Combine conditions to reach exactly who you need.",
    icon: <FilterList className="w-5 h-5 text-kb-content-tertiary" />,
  },
  {
    title: "A/B testing",
    description:
      "Test subject lines, content, and send times to optimize your campaigns. Let data guide your email strategy for maximum engagement.",
    icon: (
      <WebWindowEnergyConsumption className="w-5 h-5 text-kb-content-tertiary" />
    ),
  },
  {
    title: "Automation workflows",
    description:
      "Build powerful email sequences that trigger based on user actions. Welcome series, abandoned cart recovery, and re-engagement campaigns on autopilot.",
    icon: <Rocket className="w-5 h-5 text-kb-content-tertiary" />,
  },
];

const audienceFeatures: StickyFeature[] = [
  {
    label: "Segmentation",
    title: "Target the right audience with precision",
    description:
      "Create dynamic segments based on subscriber behavior, preferences, purchase history, and custom properties. Your segments update automatically as contacts match your criteria, ensuring your campaigns always reach the right people.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
  },
  {
    label: "Contact profiles",
    title: "Rich subscriber profiles at your fingertips",
    description:
      "Every contact has a complete profile with engagement history, custom fields, tags, and activity timeline. Understand your audience deeply and personalize every interaction based on their unique journey with your brand.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
  },
  {
    label: "List management",
    title: "Organize contacts with flexible lists and tags",
    description:
      "Group your audience into lists for different products, campaigns, or business units. Apply tags for granular organization and combine them with segments for powerful targeting capabilities.",
    image:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
  },
];

const ctaFeatures: Feature[] = [
  {
    title: "Personalization at scale",
    content:
      "Use merge tags, conditional content, and dynamic sections to personalize every email. Each subscriber receives content tailored to their preferences and behavior.",
    icon: <Sparks className="text-kb-content-tertiary" />,
  },
  {
    title: "Deliverability optimization",
    content:
      "We handle SPF, DKIM, and DMARC configuration automatically. Monitor your sender reputation and get actionable insights to keep your emails out of spam folders.",
    icon: <MailOpen className="text-kb-content-tertiary" />,
  },
  {
    title: "Campaign performance insights",
    content:
      "Track opens, clicks, conversions, and revenue attribution in real-time. Understand what resonates with your audience and optimize your campaigns accordingly.",
    icon: <GraphUp className="text-kb-content-tertiary" />,
  },
  {
    title: "Subscriber engagement scoring",
    content:
      "Automatically score subscribers based on their engagement. Identify your most active fans and re-engage those at risk of churning.",
    icon: <UserStar className="text-kb-content-tertiary" />,
  },
];

export default function MarketingProductPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="relative px-6 xl:px-0 pb-24 md:pb-32">
          <div className="w-full min-h-[728px] overflow-hidden">
            <div className="mt-24 sm:mt-32 lg:mt-48 w-full mx-auto lg:max-w-2xl flex flex-col items-center">
              <h1 className="w-full font-heading text-kb-content-brand max-w-xl text-2xl lg:text-3xl xl:text-5xl text-left sm:text-center font-bold">
                Marketing emails that land in the inbox
              </h1>
              <p className="mt-2 font-sans text-left sm:text-center w-full mx-auto sm:max-w-lg text-kb-content-secondary font-medium text-lg">
                Everything you need to send newsletters, product updates, or
                automate your email marketing, while following the best industry
                practices.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 lg:gap-3 mt-8 items-center lg:justify-center w-full sm:max-w-lg lg:max-w-none">
                <Button className="w-full! lg:w-fit! px-[42px]!">
                  Get started for free
                </Button>
                <Button variant="secondary" className="w-full! lg:w-fit!">
                  Calculate your email savings
                </Button>
              </div>

              <HeroFeatures className="mt-6" />
            </div>

            <div className="relative w-full max-w-5xl overflow-hidden mx-auto">
              <div className="w-full border border-kb-border-tertiary mt-12 rounded-lg overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=800&fit=crop"
                  alt="Email marketing dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageSection
        label="audience"
        variant="secondary"
        title="Know your audience inside and out"
        description="Powerful tools to manage, segment, and understand your subscribers."
      >
        <StickyFeatures features={audienceFeatures} />
      </PageSection>
      <PageSection
        label="features"
        title="Powerful features for modern marketers"
        description="Everything you need to create, send, and optimize your email campaigns."
      >
        <BentoGrid features={marketingFeatures} />
      </PageSection>

      <FeaturesWithCTA
        label="MARKETING"
        title="Grow your audience with email."
        description="Build lasting relationships with your subscribers through personalized, timely, and relevant email campaigns that drive engagement and conversions."
        buttonText="Start your first campaign"
        features={ctaFeatures}
        showCommunitySection={false}
      />
    </>
  );
}
