import type { ReactNode } from "react";
import Link from "next/link";
import { Button, Text } from "@kibamail/owly";
import {
  CardLock,
  DatabaseStats,
  Mail,
  Page,
  ScanBarcode,
} from "iconoir-react";

export interface Feature {
  title: string;
  content: ReactNode;
  icon: ReactNode;
}

export interface FeaturesWithCTAProps {
  /** Label text above the title */
  label?: string;
  /** Main heading text */
  title?: string;
  /** Description text below the title */
  description?: string;
  /** CTA button text */
  buttonText?: string;
  /** CTA button href */
  buttonHref?: string;
  /** Array of features to display */
  features?: Feature[];
  /** Whether to show the community section at the bottom */
  showCommunitySection?: boolean;
}

const defaultFeatures: Feature[] = [
  {
    title: "Automated email compliance",
    content:
      "We automatically setup and monitor your sending IP pools, DNS, SPF, DMARC and DKIM configurations to ensure you are 100% compliant with email provider requirements.",
    icon: <DatabaseStats className="text-kb-content-tertiary" />,
  },
  {
    title: "Unlimited forms & landing pages",
    content:
      "Powerful tools to grow your audience, run surveys and grow your business. We do not charge you for how many contacts or forms you have.",
    icon: <Page className="text-kb-content-tertiary" />,
  },
  {
    title: "No subscriptions - scale sending to zero",
    content: (
      <>
        With no subscriptions, pay less when you send less emails. No lock in,
        no pricing tiers based on your contacts or team size.
        <Link
          href="/pricing"
          className="underline text-kb-content-link hover:text-kb-content-link-hover underline-offset-4 ml-1"
        >
          Learn more about our pricing.
        </Link>
      </>
    ),
    icon: <CardLock className="text-kb-content-tertiary" />,
  },
  {
    title: "Email reputation monitoring",
    content: (
      <>
        We monitor and adjust your email sending to ensure you are in compliance
        with the provider regulations. Landing in the inbox is our number one
        goal.
      </>
    ),
    icon: <ScanBarcode className="text-kb-content-tertiary" />,
  },
];

function DecorativeCircle() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className="text-kb-bg-secondary"
    >
      <title>circle</title>
      <g filter="url(#filter0_d_399_11635)">
        <circle cx={12} cy={10} r={8} fill="currentColor" />
        <circle cx={12} cy={10} r={8} fill="black" fillOpacity="0.01" />
        <circle cx={12} cy={10} r="7.625" stroke="#DAD1C9" strokeWidth="0.75" />
      </g>
      <defs>
        <filter
          x={0}
          y={0}
          width={24}
          height={24}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={2} />
          <feGaussianBlur stdDeviation={2} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.384314 0 0 0 0 0.176471 0 0 0 0 0.00392157 0 0 0 0.1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_399_11635"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_399_11635"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}

function DecorativeCorners() {
  return (
    <>
      <div className="absolute w-12 h-12 -top-6 -left-6 flex items-center justify-center">
        <DecorativeCircle />
      </div>
      <div className="absolute w-12 h-12 -top-6 -right-6 flex items-center justify-center">
        <DecorativeCircle />
      </div>
      <div className="absolute w-12 h-12 -bottom-6 -left-6 flex items-center justify-center">
        <DecorativeCircle />
      </div>
      <div className="absolute w-12 h-12 -bottom-6 -right-6 flex items-center justify-center">
        <DecorativeCircle />
      </div>
    </>
  );
}

export function FeaturesWithCTA({
  label = "VALUE",
  title = "Send quality emails effortlessly.",
  description = "Reach your audience easily with smart, affordable and reliable email delivery. you get complete control without hidden fees or limits.",
  buttonText = "Start sending now",
  buttonHref,
  features = defaultFeatures,
  showCommunitySection = true,
}: FeaturesWithCTAProps = {}) {
  const buttonContent = buttonHref ? (
    <Link href={buttonHref}>
      <Button className="mt-4">{buttonText}</Button>
    </Link>
  ) : (
    <Button className="mt-4">{buttonText}</Button>
  );

  return (
    <div className="w-full bg-kb-bg-primary dark:bg-kb-bg-secondary relative px-6 lg:px-0 overflow-hidden">
      <div className="absolute h-px w-full bg-kb-border-tertiary top-20"></div>
      <div className="absolute h-px w-full bg-kb-border-tertiary top-[558px]"></div>

      <div className="max-w-4xl mx-auto">
        <div className="w-full h-20 border-l border-r border-kb-border-tertiary"></div>
        <div className="w-full h-[480px] relative border-r border-l border-kb-border-tertiary">
          <DecorativeCorners />
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="max-w-lg mx-auto flex flex-col items-center">
              <Text className="text-kb-content-disabled! text-xs!">{label}</Text>

              <Text size="xl" className="mt-2 font-semibold!">
                {title}
              </Text>

              <Text variant="secondary" className="text-center mt-4">
                {description}
              </Text>

              {buttonContent}
            </div>
          </div>
        </div>
        <div className="w-full border-l border-r border-kb-border-tertiary pb-20">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative">
            <div className="w-12 h-12 absolute top-[50%] hidden md:block left-[50%] translate-x-[-50%] translate-y-[-50%]">
              <div className="h-full w-px bg-kb-border-tertiary right-[50%] absolute"></div>
              <div className="h-full w-px bg-kb-border-tertiary right-[50%] absolute transform rotate-90 top-0"></div>
            </div>
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className={`px-6 py-8 flex flex-col relative`}
              >
                {idx === 0 ? (
                  <div className="w-px h-20 bg-kb-border-tertiary absolute hidden md:block md:-right-4 top-0"></div>
                ) : null}

                {idx === features.length - 1 ? (
                  <>
                    <div className="w-px h-20 bg-kb-border-tertiary absolute hidden md:block -left-4 bottom-0"></div>
                    <div className="w-12 h-px bg-kb-border-tertiary absolute hidden md:block -left-10 bottom-0"></div>
                  </>
                ) : null}

                {feature.icon}

                <Text size="lg" className="mt-2 font-semibold!">
                  {feature.title}
                </Text>

                <div className="mt-2">
                  <Text variant="secondary">{feature.content}</Text>
                </div>
              </div>
            ))}
          </div>
          {showCommunitySection && (
            <>
              <div className="w-full justify-center flex items-center mt-12">
                <Button variant="secondary">
                  <Mail />
                  Join the open email community
                </Button>
              </div>

              <p className="mt-4 text-center max-w-sm mx-auto px-6 md:px-0">
                <Text size="sm" variant="secondary">
                  An open space to share email best practices, ask questions, and
                  connect with other developers and email marketers.
                </Text>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
