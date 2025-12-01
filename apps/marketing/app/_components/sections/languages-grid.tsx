"use client";

import { useState, useEffect, type ComponentType, type SVGProps } from "react";

import { ElixirSvg } from "@/app/_components/_icons/frameworks/elixir.svg";
import { FlaskSvg } from "@/app/_components/_icons/frameworks/flask.svg";
import { GoSvg } from "@/app/_components/_icons/frameworks/go.svg";
import { HttpSvg } from "@/app/_components/_icons/frameworks/http.svg";
import { JavaSvg } from "@/app/_components/_icons/frameworks/java.svg";
import { LaravelSvg } from "@/app/_components/_icons/frameworks/laravel.svg";
import { NextjsSvg } from "@/app/_components/_icons/frameworks/nextjs.svg";
import { NodejsSvg } from "@/app/_components/_icons/frameworks/nodejs.svg";
import { PhoenixSvg } from "@/app/_components/_icons/frameworks/phoenix.svg";
import { PhpSvg } from "@/app/_components/_icons/frameworks/php.svg";
import { PythonSvg } from "@/app/_components/_icons/frameworks/python.svg";
import { RubySvg } from "@/app/_components/_icons/frameworks/ruby.svg";
import { RustSvg } from "@/app/_components/_icons/frameworks/rust.svg";
import { RailsIcon } from "../_icons/frameworks/rails.svg";
import { SmtpSvg } from "../_icons/frameworks/smtp.svg";

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface GridItem {
  id: string;
  label: string;
  icon: SvgIcon;
  codeId: string;
}

// Top row: Programming languages
const languages: GridItem[] = [
  { id: "nodejs", label: "Node.js", icon: NodejsSvg, codeId: "nodejs" },
  { id: "php", label: "PHP", icon: PhpSvg, codeId: "php" },
  { id: "python", label: "Python", icon: PythonSvg, codeId: "python" },
  { id: "ruby", label: "Ruby", icon: RubySvg, codeId: "ruby" },
  { id: "rust", label: "Rust", icon: RustSvg, codeId: "rust" },
  { id: "java", label: "Java", icon: JavaSvg, codeId: "java" },
  { id: "elixir", label: "Elixir", icon: ElixirSvg, codeId: "elixir" },
  { id: "http", label: "HTTP", icon: HttpSvg, codeId: "curl" },
];

// Bottom row: Frameworks
const frameworks: GridItem[] = [
  { id: "nextjs", label: "Next.js", icon: NextjsSvg, codeId: "typescript" },
  { id: "laravel", label: "Laravel", icon: LaravelSvg, codeId: "laravel" },
  { id: "flask", label: "Flask", icon: FlaskSvg, codeId: "flask" },
  { id: "rails", label: "Rails", icon: RailsIcon, codeId: "rails" },
  { id: "go", label: "Go", icon: GoSvg, codeId: "go" },
  { id: "spring", label: "Spring", icon: LaravelSvg, codeId: "spring" },
  { id: "phoenix", label: "Phoenix", icon: PhoenixSvg, codeId: "phoenix" },
  { id: "curl", label: "smtp", icon: SmtpSvg, codeId: "curl" },
];

// Combined grid: languages first (top row), then frameworks (bottom row)
export const gridItems = [...languages, ...frameworks];
const mobileGridItems = [...languages.slice(0, 4), ...frameworks.slice(0, 4)];

interface LanguagesGridProps {
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

// Tailwind md breakpoint is 768px
const MD_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < MD_BREAKPOINT);

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}

export function LanguagesGrid({
  selectedId,
  onSelect,
  className,
}: LanguagesGridProps) {
  const isMobile = useIsMobile();
  const items = isMobile ? mobileGridItems : gridItems;

  const halfSize = items.length / 2;
  const halfSizePlusOne = halfSize + 1;
  const firstItem = 1;

  return (
    <div className={`grid grid-cols-4 md:grid-cols-8 gap-0 ${className ?? ""}`}>
      {items.map((item, index) => {
        const itemNumber = index + 1;
        const Icon = item.icon;
        const isSelected = selectedId === item.id;

        return (
          <button
            className={`flex items-center justify-center py-6 transition ease-in-out relative cursor-pointer ${
              isSelected ? "bg-kb-bg-positive" : "hover:bg-kb-bg-secondary"
            }`}
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            title={item.label}
          >
            <div className="flex flex-col items-center gap-2">
              <Icon
                className={`w-4 h-4 lg:w-8 lg:h-8 transition-colors ${
                  isSelected ? "text-white" : "text-kb-content-primary"
                }`}
              />
              <p
                className={`text-xs uppercase font-bold hidden md:block ${
                  isSelected ? "text-white" : "text-kb-content-secondary"
                }`}
              >
                {item?.label}
              </p>
            </div>

            {itemNumber <= halfSize && itemNumber > firstItem ? (
              <div className="absolute h-[70%] top-0 transform translate-x-[-50%] bg-kb-border-tertiary w-px -left-[0.5px]" />
            ) : null}

            {itemNumber < halfSize ? (
              <>
                <div className="absolute bottom-0 right-0 w-4 h-px bg-kb-border-tertiary" />
                <div className="absolute bottom-0 right-0 h-4 w-px bg-kb-border-tertiary" />
              </>
            ) : null}
            {itemNumber > halfSize ? (
              <div className="absolute w-[64%] left-[50%] transform translate-x-[-50%] bg-kb-border-tertiary h-px -top-px" />
            ) : null}
            {itemNumber > halfSizePlusOne ? (
              <div className="absolute h-[70%] top-[30%] transform translate-x-[-50%] bg-kb-border-tertiary w-px -left-[0.5px]" />
            ) : null}
            {itemNumber > halfSizePlusOne ? (
              <>
                <div className="absolute left-0 -top-px w-4 h-px bg-kb-border-tertiary" />
                <div className="absolute -left-px top-0 h-4 w-px bg-kb-border-tertiary" />
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
