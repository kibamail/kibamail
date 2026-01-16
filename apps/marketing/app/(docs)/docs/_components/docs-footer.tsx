import clsx from "clsx";
import Link from "next/link";

export function DocsFooterSitemap({ className }: { className?: string }) {
  return (
    <footer className="text-sm/loose text-kb-content-secondary bg-kb-bg-primary">
      {/* Mobile layout */}
      <div className={clsx("flex gap-4 p-4 md:hidden", className)}>
        <div className="flex flex-1 flex-col gap-10">
          <FooterKibamail />
          <FooterResources />
        </div>
        <div className="flex flex-1 flex-col gap-10">
          <FooterDevelopers />
          <FooterCommunity />
        </div>
      </div>

      {/* Desktop layout */}
      <div
        className={clsx(
          "mx-auto hidden w-full grid-cols-4 justify-between gap-y-0 md:grid md:grid-cols-4 md:gap-6 md:gap-x-4 lg:gap-8",
          className
        )}
      >
        <div className="border-x border-b border-gray-950/5 py-10 pl-2 not-md:border-0 md:border-b-0 dark:border-white/10">
          <FooterKibamail />
        </div>
        <div className="border-x border-b border-gray-950/5 py-10 pl-2 not-md:border-0 md:border-b-0 dark:border-white/10">
          <FooterDevelopers />
        </div>
        <div className="border-x border-b border-gray-950/5 py-10 pl-2 not-md:border-0 sm:border-b-0 dark:border-white/10">
          <FooterResources />
        </div>
        <div className="border-x border-gray-950/5 py-10 pl-2 not-md:border-0 dark:border-white/10">
          <FooterCommunity />
        </div>
      </div>
    </footer>
  );
}

export function DocsFooterMeta({ className }: { className?: string }) {
  return (
    <div className="px-2 pt-10 pb-24">
      <div
        className={clsx(
          "mx-auto flex w-full flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
          className
        )}
      >
        <div />
        <div className="flex flex-col gap-4 text-sm/6 text-kb-content-secondary sm:flex-row sm:gap-2 sm:pr-4">
          <span>Copyright &copy; {new Date().getFullYear()} Kibamail.</span>
          <span className="max-sm:hidden">&middot;</span>
          <Link href="/legal/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

function FooterKibamail() {
  return (
    <>
      <h3 className="font-semibold">Kibamail</h3>
      <ul className="mt-4 grid gap-4">
        <li>
          <Link href="/docs" className="hover:underline">
            Documentation
          </Link>
        </li>
        <li>
          <Link href="/pricing" className="hover:underline">
            Pricing
          </Link>
        </li>
        <li>
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>
        </li>
        <li>
          <Link href="/changelog" className="hover:underline">
            Changelog
          </Link>
        </li>
      </ul>
    </>
  );
}

function FooterDevelopers() {
  return (
    <>
      <h3 className="font-semibold">Developers</h3>
      <ul className="mt-4 grid gap-4">
        <li>
          <Link href="/docs/api/authentication" className="hover:underline">
            API Reference
          </Link>
        </li>
        <li>
          <Link href="/docs/sdks/nodejs" className="hover:underline">
            SDKs
          </Link>
        </li>
        <li>
          <Link href="/docs/guides/deliverability" className="hover:underline">
            Guides
          </Link>
        </li>
        <li>
          <Link href="https://status.kibamail.com" className="hover:underline">
            Status
          </Link>
        </li>
      </ul>
    </>
  );
}

function FooterResources() {
  return (
    <>
      <h3 className="font-semibold">Resources</h3>
      <ul className="mt-4 grid gap-4">
        <li>
          <Link href="/docs/guides/deliverability" className="hover:underline">
            Deliverability
          </Link>
        </li>
        <li>
          <Link href="/docs/guides/dkim-spf" className="hover:underline">
            Email Authentication
          </Link>
        </li>
        <li>
          <Link href="/docs/guides/best-practices" className="hover:underline">
            Best Practices
          </Link>
        </li>
      </ul>
    </>
  );
}

function FooterCommunity() {
  return (
    <>
      <h3 className="font-semibold">Community</h3>
      <ul className="mt-4 grid gap-4">
        <li>
          <Link href="https://github.com/kibamail" className="hover:underline">
            GitHub
          </Link>
        </li>
        <li>
          <Link href="https://discord.gg/kibamail" className="hover:underline">
            Discord
          </Link>
        </li>
        <li>
          <Link href="https://x.com/kibamail" className="hover:underline">
            X
          </Link>
        </li>
      </ul>
    </>
  );
}
