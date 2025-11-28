import { LaravelSvg } from "./_components/_icons/frameworks/laravel.svg";
import { PageSection } from "./_components/layout/page-section";
import { SectionCard } from "./_components/layout/section-card";
import { HomePageHero } from "./_components/sections/heroes/homepage-hero";

export default function Home() {
  return (
    <>
      <HomePageHero />
      <PageSection
        label="transactional"
        title="Integrate in minutes"
        description="a simple, easy to use sdk for any programming language, any stack and any platform"
      >
        <SectionCard>
          <div className="grid grid-cols-8 gap-0">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(
              (x) => (
                <button
                  className="flex items-center justify-center py-6 transition ease-in-out relative hover:bg-kb-bg-secondary cursor-pointer"
                  key={x}
                  type="button"
                >
                  <LaravelSvg className="text-kb-content-primary" />

                  {x < 8 ? (
                    <>
                      <div
                        data-x={x}
                        className="absolute bottom-0 right-0 w-4 h-px bg-kb-border-tertiary"
                      ></div>
                      <div
                        data-x={x}
                        className="absolute bottom-0 right-0 h-4 w-px bg-kb-border-tertiary"
                      ></div>
                    </>
                  ) : null}
                  {x > 8 ? (
                    <>
                      <div className="absolute w-[64%] left-[50%] transform translate-x-[-50%] bg-kb-border-tertiary h-px -top-px" />
                    </>
                  ) : null}
                  {x > 9 ? (
                    <>
                      <div className="absolute h-[70%] top-[30%] transform translate-x-[-50%] bg-kb-border-tertiary w-px -left-px" />
                    </>
                  ) : null}
                  {x > 9 ? (
                    <>
                      <div
                        data-x={x}
                        className="absolute left-0 -top-px w-4 h-px bg-kb-border-tertiary"
                      ></div>
                      <div
                        data-x={x}
                        className="absolute -left-px top-0 h-4 w-px bg-kb-border-tertiary"
                      ></div>
                    </>
                  ) : null}
                </button>
              )
            )}
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-6 my-6">
          <div className="w-full bg-kb-bg-brand rounded-3xl p-12 border border-transparent"></div>
          <SectionCard></SectionCard>
        </div>
      </PageSection>
    </>
  );
}
