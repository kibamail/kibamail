import { notFound } from "next/navigation";
import { Badge, Button, Heading, Text } from "@kibamail/owly";
import { format } from "date-fns";
import { getAllBlogSlugs, getBlogPostBySlug } from "@/app/_lib/blog";
import { renderMarkdown } from "@/app/_lib/markdown";

interface BlogArticleProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogArticleProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: post.title,
    description: post.description,
  };
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

export default async function BlogArticle({ params }: BlogArticleProps) {
  const { slug } = await params;
  const blogPost = await getBlogPostBySlug(slug);

  if (!blogPost) {
    notFound();
  }

  const contentHtml = renderMarkdown(blogPost.content);

  return (
    <div className="w-full max-w-7xl mx-auto mt-8 sm:mt-12 lg:mt-16 px-6 md:px-0 mb-12">
      {/* Article Header */}
      <div className="grid grid-cols-1 gap-5">
        {/* Author, Badge, Date Row */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-kb-surface-tertiary overflow-hidden">
              <img
                src={blogPost.author.avatar}
                alt={blogPost.author.name}
                className="w-full h-full object-cover"
              />
            </div>
            <Text size="sm" className="font-medium">
              {blogPost.author.name}
            </Text>
          </div>

          <div className="h-4 w-px bg-kb-border-tertiary hidden sm:block" />

          <Badge size="sm">{blogPost.category.name}</Badge>

          <div className="h-4 w-px bg-kb-border-tertiary hidden sm:block" />

          <Text size="sm" variant="secondary">
            {formatDate(blogPost.date)}
          </Text>
        </div>

        {/* Title */}
        <Heading
          size="sm"
          variant="display"
          className="font-bold! text-2xl! sm:text-3xl! md:text-4xl! lg:text-5xl! mt-6 sm:mt-8 max-w-4xl"
        >
          {blogPost.title}
        </Heading>

        {/* Description */}
        <Text variant="secondary" className="text-base! sm:text-lg! max-w-3xl">
          {blogPost.description}
        </Text>
      </div>

      {/* Content Box */}
      <div className="mt-8 sm:mt-10 lg:mt-12 md:border md:border-kb-border-tertiary">
        <div className="sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-8 lg:gap-10">
            {/* Left Column - Blog Content */}
            <article
              className="kb-blog-content"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Right Column - Sticky CTA Card */}
            <aside className="hidden lg:block">
              <div className="sticky top-8">
                <div className="bg-kb-surface-secondary flex flex-col border border-kb-border-tertiary rounded-xl p-6">
                  <Heading
                    size="sm"
                    variant="display"
                    className="font-semibold! text-lg!"
                  >
                    Get started for free
                  </Heading>

                  <Text variant="secondary" className="mt-2">
                    Create beautiful emails, automate your campaigns, and grow
                    your audience with Kibamail. Create beautiful emails,
                    automate your campaigns, and grow your audience with
                    Kibamail.
                  </Text>

                  <Button variant="primary" className="w-full mt-4" asChild>
                    <a href="/w?action=register">
                      Send your first 10,000 emails for free
                    </a>
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          {/* Mobile CTA - Shows at bottom on mobile/tablet */}
          <div className="lg:hidden mt-8 sm:mt-10">
            <div className="bg-kb-surface-secondary flex flex-col border border-kb-border-tertiary rounded-xl p-5 sm:p-6">
              <Heading
                size="sm"
                variant="display"
                className="font-semibold! text-lg!"
              >
                Get started for free
              </Heading>

              <Text variant="secondary" size="sm" className="mt-2">
                Create beautiful emails, automate your campaigns, and grow your
                audience with Kibamail.
              </Text>

              <Button variant="primary" size="sm" className="mt-4" asChild>
                <a href="/w?action=register">Sign up free</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
