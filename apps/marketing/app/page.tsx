import { PageSection } from "./_components/layout/page-section";
import { SectionCard } from "./_components/layout/section-card";
import { Automations } from "./_components/sections/automations";
import { BroadcastAnalytics } from "./_components/sections/broadcast-analytics";
import { CodeShowcase } from "./_components/sections/code-showcase";
import { ContactManagement } from "./_components/sections/contact-management";
import { EmailEvents } from "./_components/sections/email-events";
import { FeaturesWithCTA } from "./_components/sections/features-with-cta";
import { HomePageHero } from "./_components/sections/heroes/homepage-hero";
import { Sandbox } from "./_components/sections/sandbox";
import { generateCodeSamples } from "./_lib/code-samples";

export default async function Home() {
  const codeSamples = await generateCodeSamples();

  return (
    <>
      <svg
        className="w-[1480px] mx-auto max-w-full h-[690px] absolute top-[200px] left-[50%] translate-x-[-50%]"
        viewBox="0 0 1440 690"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>envelope back cover</title>
        <g filter="url(#filter0_d_399_12952)">
          <path
            d="M-860 315.25H127.5L325 505.25H1115L1312.5 315.25H2300V1024.25H-860V315.25Z"
            fill="currentColor"
            className="fill-current text-[#FAF7F5] dark:text-(--gray-800)"
          />
          <path
            d="M-860 315.25H127.5L325 505.25H1115L1312.5 315.25H2300V1024.25H-860V315.25Z"
            fill="black"
            fillOpacity="0.02"
          />
        </g>
        <g filter="url(#filter1_d_399_12952)">
          <path
            d="M2300 1024.25V315.25H1312.5L1115 505.25H325L127.5 315.25H-860V1024.25"
            stroke="#5B2F0E"
            strokeOpacity="0.1"
            strokeWidth="0.5"
            shapeRendering="crispEdges"
          />
        </g>
        <defs>
          <filter
            x={-1110}
            y="0.25"
            width={3660}
            height={1209}
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
            <feOffset dy={-65} />
            <feGaussianBlur stdDeviation={125} />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.356863 0 0 0 0 0.184314 0 0 0 0 0.054902 0 0 0 0.1 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_399_12952"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_399_12952"
              result="shape"
            />
          </filter>
          <filter
            x="-1110.25"
            y={0}
            width="3660.5"
            height="1209.25"
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
            <feOffset dy={-65} />
            <feGaussianBlur stdDeviation={125} />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.356863 0 0 0 0 0.184314 0 0 0 0 0.054902 0 0 0 0.1 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_399_12952"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_399_12952"
              result="shape"
            />
          </filter>
        </defs>
      </svg>
      <div className="max-w-7xl mx-auto">
        <HomePageHero />
      </div>
      <PageSection
        label="transactional"
        title="Integrate in minutes"
        description="a simple, easy to use sdk for any programming language, any stack and any platform"
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
        variant="secondary"
        label="marketing"
        className="pb-0!"
        title="Marketing emails that land in the inbox."
        description="Everything you need to send newsletters, product updates, or automate your email marketing, while following the best industry practices."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ContactManagement />
          <Automations />
        </div>

        <div className="mt-8">
          <BroadcastAnalytics />
        </div>
      </PageSection>

      <FeaturesWithCTA />
    </>
  );
}
