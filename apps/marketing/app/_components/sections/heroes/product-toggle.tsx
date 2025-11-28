"use client";

import { Text } from "@kibamail/owly";
import { useLayoutEffect, useRef, useState, type ElementRef } from "react";
import { EngageIcon } from "@/app/_components/_icons/engage.svg";
import { InboundIcon } from "@/app/_components/_icons/inbound.svg";
import { SendIcon } from "@/app/_components/_icons/send.svg";
import { ValidateIcon } from "@/app/_components/_icons/validate.svg";

const products = [
  { id: "transactional", title: "Transactional", icon: SendIcon },
  { id: "marketing", title: "Marketing", icon: EngageIcon },
  { id: "inbound", title: "Inbound", icon: InboundIcon },
  { id: "validation", title: "Validation", icon: ValidateIcon },
];

export function ProductToggle() {
  const [activeProduct, setActiveProduct] = useState("transactional");
  const containerRef = useRef<ElementRef<"div">>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeButton = buttonRefs.current.get(activeProduct);
    const container = containerRef.current;

    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeProduct]);

  return (
    <div className="w-full flex items-center justify-center box-border mb-12 md:mb-32 z-100">
      <div
        ref={containerRef}
        className="relative flex items-center border border-kb-border-tertiary rounded-[44px] bg-kb-bg-layout h-11 box-border p-1"
      >
        {/* Sliding indicator */}
        <div
          className="absolute h-[calc(100%-8px)] rounded-full bg-kb-bg-positive transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {products.map((product) => {
          const Icon = product.icon;
          const isActive = activeProduct === product.id;

          return (
            <button
              key={product.id}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(product.id, el);
                }
              }}
              type="button"
              onClick={() => setActiveProduct(product.id)}
              className="relative z-10 flex items-center gap-2 h-full rounded-full px-3 cursor-pointer transition-colors"
            >
              <Icon
                className={`w-4 h-4 transition-colors duration-300 ${
                  isActive ? "text-white" : "text-kb-content-tertiary"
                }`}
              />
              <Text
                className={`font-bold hidden md:inline-flex transition-colors duration-300 ${
                  isActive ? "text-white!" : ""
                }`}
                variant={isActive ? undefined : "tertiary"}
              >
                {product.title}
              </Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}
