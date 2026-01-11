import Link from "next/link";
import { Text } from "@kibamail/owly";
import { X } from "iconoir-react";
import { GithubIcon } from "../_icons/github.svg";
import { LogoFullBrown } from "../_icons/logo-full-brown.svg";
import { LogoFullWhite } from "../_icons/logo-full-white.svg";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: "Products",
    links: [
      { label: "Transactional emails", href: "/products/transactional" },
      { label: "Marketing emails", href: "/products/marketing" },
      { label: "Inbound email", href: "/products/inbound" },
      { label: "Email validation", href: "/docs/guides/email-validation" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Quickstart", href: "/docs/quick-start" },
      { label: "API Reference", href: "/docs/api" },
      { label: "Examples", href: "/docs/guides" },
      { label: "Libraries & SDKs", href: "/docs/sdks" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Weekly changelog", href: "/changelog" },
      { label: "Blog", href: "/blog" },
      { label: "Self hosted", href: "/docs/installation" },
      { label: "Tutorials", href: "/tutorials" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Open email forum", href: "/docs/community" },
      { label: "Github", href: "https://github.com/kibamail/kibamail" },
      { label: "X (Formerly Twitter)", href: "https://x.com/kibamail" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Why we exist", href: "/docs/company" },
      { label: "Privacy Policy", href: "/legal/privacy-policy" },
      { label: "Terms of Service", href: "/legal/terms-of-service" },
      { label: "Acceptable Use", href: "/legal/acceptable-use-policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full bg-kb-bg-layout px-6 xl:px-0 border-t border-kb-border-tertiary">
      <div className="w-full max-w-7xl mx-auto">
        <div className="w-full flex flex-col lg:flex-row py-16 gap-8 md:gap-24">
          <div className="w-full lg:w-2/6">
            <div className="mb-4">
              <Link href="/">
                <LogoFullBrown className="h-8 dark:hidden" />
              </Link>
              <Link href="/">
                <LogoFullWhite className="h-8 hidden dark:inline-block" />
              </Link>
            </div>
            <div className="max-w-md flex flex-col gap-1">
              <Text>
                At{" "}
                <span className="mx-1 text-kb-content-brand font-semibold!">
                  Kibamail Messaging systems ltd
                </span>
                , we're making email and email knowledge open, easy, cheap and
                accessible to everyone.
              </Text>

              <Text className="mt-4">
                The fastest way to become a part is to{" "}
                <Link
                  href="/docs/community"
                  className="underline underline-offset-4 text-kb-content-link"
                >
                  join our open email forum
                </Link>
                . You can also connect with us on other platforms.
              </Text>

              <div className="mt-4 flex items-center gap-4">
                <a
                  href="https://x.com/kibamail"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <X className="w-6 h-6 dark:text-white" />
                </a>
                <a
                  href="https://github.com/kibamail/kibamail"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <GithubIcon className="w-6 h-6 dark:text-white" />
                </a>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-4/6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
              {footerSections.map((section) => (
                <div key={section.title} className="flex flex-col">
                  <Text className="font-semibold!">{section.title}</Text>
                  <ul className="flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={link.label} className="mt-2 lg:mt-4">
                        <Link href={link.href}>
                          <Text variant="secondary">{link.label}</Text>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
