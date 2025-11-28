import { Code, GitFork, Book, GraduationCap, X } from "iconoir-react";
import { EngageIcon } from "../../_icons/engage.svg";
import { GithubIcon } from "../../_icons/github.svg";
import { InboundIcon } from "../../_icons/inbound.svg";
import { SendIcon } from "../../_icons/send.svg";
import { ValidateIcon } from "../../_icons/validate.svg";
import { NavIconWrapper } from "./nav-icon-wrapper";

export const productLinks = [
  {
    href: "/products/transactional",
    icon: (
      <NavIconWrapper>
        <SendIcon className="w-5 h-5 shrink-0 text-kb-content-negative" />
      </NavIconWrapper>
    ),
    title: "Transactional emails",
    description: "Password reset emails, invoices, notifications and more.",
  },
  {
    href: "/products/marketing",
    icon: (
      <NavIconWrapper>
        <EngageIcon className="w-5 h-5 shrink-0 text-kb-content-positive" />
      </NavIconWrapper>
    ),
    title: "Marketing emails",
    description: "Campaigns, newsletters, and broadcasts that convert.",
  },
  {
    href: "/products/inbound",
    icon: (
      <NavIconWrapper>
        <InboundIcon className="w-5 h-5 shrink-0 text-kb-content-brand" />
      </NavIconWrapper>
    ),
    title: "Inbound emails",
    description: "Automate user replies, or let ai take care of your inbox.",
  },
  {
    href: "/products/validation",
    icon: (
      <NavIconWrapper>
        <ValidateIcon className="w-5 h-5 shrink-0 text-kb-content-highlight" />
      </NavIconWrapper>
    ),
    title: "Email validation",
    description: "Clean your lists, boost deliverability",
  },
];

export const resourceLinks = [
  {
    href: "/docs/api",
    icon: (
      <NavIconWrapper>
        <Code className="w-5 h-5 shrink-0 text-kb-content-positive" />
      </NavIconWrapper>
    ),
    title: "API documentation",
    description: "Integrate Kibamail into your applications.",
  },
  {
    href: "/changelog",
    icon: (
      <NavIconWrapper>
        <GitFork className="w-5 h-5 shrink-0 text-kb-content-highlight stroke-current" />
      </NavIconWrapper>
    ),
    title: "Changelog",
    description: "Latest updates, features, and improvements.",
  },
  {
    href: "/blog",
    icon: (
      <NavIconWrapper>
        <Book className="w-5 h-5 shrink-0 text-kb-content-info" />
      </NavIconWrapper>
    ),
    title: "Blog",
    description: "Insights, tips, and email marketing best practices.",
  },
  {
    href: "/tutorials",
    icon: (
      <NavIconWrapper>
        <GraduationCap className="w-5 h-5 shrink-0 text-kb-content-notice" />
      </NavIconWrapper>
    ),
    title: "Tutorials",
    description: "Step-by-step guides to get the most out of Kibamail.",
  },
];

export const communityLinks = [
  {
    href: "https://x.com/kibamail",
    icon: (
      <NavIconWrapper>
        <X className="w-5 h-5 shrink-0 text-kb-content-primary" />
      </NavIconWrapper>
    ),
    title: "X",
    description: "Follow us for updates and announcements.",
  },
  {
    href: "https://github.com/kibamail/kibamail",
    icon: (
      <NavIconWrapper>
        <GithubIcon className="w-5 h-5 shrink-0 text-kb-content-primary" />
      </NavIconWrapper>
    ),
    title: "GitHub",
    description: "Star the repo and explore the source code.",
  },
];
