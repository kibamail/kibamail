import { notFound } from "next/navigation";
import { getTagInfo, getOperation, getAllOperationPaths } from "../_lib/openapi";
import { EndpointPage } from "../_components/endpoint-page";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// Generate static params for all API operation pages
export async function generateStaticParams() {
  const operationPaths = getAllOperationPaths();
  return operationPaths.map(({ tagSlug, operationSlug }) => ({
    slug: [tagSlug, operationSlug],
  }));
}

// Generate metadata for each page
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  if (slug.length !== 2) {
    return { title: "Not Found" };
  }

  const operation = getOperation(slug[0], slug[1]);
  if (!operation) return { title: "Not Found" };

  return {
    title: `${operation.summary} - ${operation.tags[0]} API - Kibamail`,
    description: operation.description?.slice(0, 160) || operation.summary,
  };
}

export default async function ApiDynamicPage({ params }: PageProps) {
  const { slug } = await params;

  // Only handle operation pages: /docs/api/[tag]/[operation]
  if (slug.length !== 2) {
    notFound();
  }

  const [tagSlug, operationSlug] = slug;
  const operation = getOperation(tagSlug, operationSlug);

  if (!operation) {
    notFound();
  }

  const tagInfo = getTagInfo(tagSlug);
  const tagName = tagInfo?.tag || tagSlug;

  return <EndpointPage operation={operation} tagName={tagName} />;
}
