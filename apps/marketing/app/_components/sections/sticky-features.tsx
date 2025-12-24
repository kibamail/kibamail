"use client";

import { Button, Text } from "@kibamail/owly";
import { useEffect, useRef, useState } from "react";

export interface StickyFeature {
  label: string;
  title: string;
  description: string;
  image: string;
  learnMoreHref?: string;
}

interface StickyFeaturesProps {
  features: StickyFeature[];
  className?: string;
}

export function StickyFeatures({ features, className }: StickyFeaturesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 2;

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      featureRefs.current.forEach((ref, index) => {
        if (!ref) return;

        const rect = ref.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [features.length]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        {/* Sticky image container - left side */}
        <div className="hidden lg:block lg:w-1/2 lg:sticky lg:top-32 lg:self-start">
          <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-kb-border-tertiary">
            {features.map((feature, index) => (
              <img
                key={feature.title}
                src={feature.image}
                alt={feature.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  activeIndex === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Features list - right side */}
        <div className="lg:w-1/2 flex flex-col gap-8 lg:gap-0">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => {
                featureRefs.current[index] = el;
              }}
              className={`py-8 lg:py-36 transition-opacity duration-300 flex flex-col ${
                activeIndex === index ? "opacity-100" : "lg:opacity-40"
              }`}
            >
              {/* Mobile image */}
              <div className="lg:hidden mb-6 rounded-xl overflow-hidden border border-kb-border-tertiary">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-auto object-cover"
                />
              </div>

              <Text
                size="xs"
                className="uppercase text-kb-content-disabled! font-semibold! tracking-wide"
              >
                {feature.label}
              </Text>

              <Text
                size="xl"
                className="mt-2 font-bold! text-kb-content-primary text-2xl!"
              >
                {feature.title}
              </Text>

              <Text variant="secondary" className="mt-3" size="lg">
                {feature.description}
              </Text>

              <Button
                variant="secondary"
                className="mt-6"
                asChild={!!feature.learnMoreHref}
              >
                {feature.learnMoreHref ? (
                  <a href={feature.learnMoreHref}>Learn more</a>
                ) : (
                  "Learn more"
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
