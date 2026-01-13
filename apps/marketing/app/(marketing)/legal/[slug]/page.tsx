import { notFound } from "next/navigation";
import { Heading, Text } from "@kibamail/owly";
import { format } from "date-fns";
import { getAllLegalSlugs, getLegalDocumentBySlug } from "@/app/_lib/blog";
import { renderMarkdown } from "@/app/_lib/markdown";
import { SectionCard } from "@/app/_components/layout/section-card";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllLegalSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = await getLegalDocumentBySlug(slug);

  if (!document) {
    return { title: "Document Not Found" };
  }

  return {
    title: `${document.title} | Kibamail`,
    description: document.description,
  };
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMMM d, yyyy");
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = await getLegalDocumentBySlug(slug);

  if (!document) {
    notFound();
  }

  const contentHtml = await renderMarkdown(document.content);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 sm:mt-12 lg:mt-16 px-6 md:px-0 mb-12 sm:mb-16 lg:mb-24">
      {/* Page Header */}
      <div className="text-center mb-8 sm:mb-10 lg:mb-12">
        <Heading
          size="sm"
          variant="display"
          className="font-bold! text-2xl! sm:text-3xl! md:text-4xl!"
        >
          {document.title}
        </Heading>

        <Text variant="secondary" className="mt-3 text-base! sm:text-lg!">
          {document.description}
        </Text>

        <Text variant="tertiary" size="sm" className="mt-4">
          Last updated: {formatDate(document.lastUpdated)}
        </Text>
      </div>

      {/* Content Card */}
      <SectionCard spacing="regular">
        <article
          className="kb-docs-content"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </SectionCard>
    </div>
  );
}
