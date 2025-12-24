import Link from "next/link";
import { Badge, Button, Heading, Text } from "@kibamail/owly";
import { format } from "date-fns";
import { getAllBlogPosts, getAllCategories } from "@/app/_lib/blog";

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

export default async function Blog() {
  const posts = await getAllBlogPosts();
  const categories = await getAllCategories();
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <>
      {/* Header Section */}
      <div className="w-full min-h-96 max-w-7xl mx-auto mt-4 sm:mt-6">
        <div className="md:border md:border-kb-border-tertiary">
          <div className="flex flex-col gap-4 sm:p-6 lg:p-8">
            <Badge size="sm">BLOG</Badge>

            <div className="max-w-3xl">
              <Heading
                size="sm"
                variant="display"
                className="font-bold! text-xl! sm:text-2xl! md:text-3xl! lg:text-4xl!"
              >
                Insights on email marketing, email best practices and email
                automation.
              </Heading>

              <Text
                variant="secondary"
                size="lg"
                className="mt-2 md:mt-4 inline-block text-sm! sm:text-base! md:text-lg!"
              >
                Explore our latest articles on email deliverability, automation
                workflows, and marketing strategies.
              </Text>
            </div>

            {/* Category Filters */}
            <div className="w-full flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mt-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full! text-xs! sm:text-sm!"
              >
                All categories
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.slug}
                  variant="secondary"
                  size="sm"
                  className="rounded-full! text-xs! sm:text-sm!"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Featured Blog Post Card */}
            {featuredPost && (
              <Link href={`/blog/${featuredPost.slug}`}>
                <div className="mt-4 sm:mt-6 lg:mt-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 bg-kb-surface-secondary rounded-xl overflow-hidden border border-kb-border-tertiary cursor-pointer p-3 sm:p-4">
                  <div className="relative aspect-[16/9] lg:aspect-auto rounded-lg border border-kb-border-tertiary overflow-hidden">
                    <img
                      src={
                        featuredPost.image ||
                        "https://framerusercontent.com/images/9SZoLAT4bMBHDkLEUqVXmGlMkbM.png?scale-down-to=1024&width=2048&height=866"
                      }
                      alt={featuredPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-3 sm:gap-4 py-4 sm:py-8 lg:py-12 px-1 sm:px-2 lg:pr-8">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <Badge size="sm">{featuredPost.category.name}</Badge>
                      <Text size="sm" variant="secondary">
                        {formatDate(featuredPost.date)}
                      </Text>
                    </div>

                    <Heading
                      size="sm"
                      variant="display"
                      className="font-bold! text-lg! sm:text-xl! md:text-2xl! lg:text-3xl!"
                    >
                      {featuredPost.title}
                    </Heading>

                    <Text
                      variant="secondary"
                      size="md"
                      className="line-clamp-2 sm:line-clamp-3 text-sm! sm:text-base!"
                    >
                      {featuredPost.description}
                    </Text>

                    <div className="flex items-center gap-2 mt-1 sm:mt-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-kb-surface-tertiary overflow-hidden">
                        <img
                          src={featuredPost.author.avatar}
                          alt={featuredPost.author.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Text size="sm" className="font-medium">
                        {featuredPost.author.name}
                      </Text>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-7xl mx-auto my-8 sm:my-10 lg:my-12">
        <div className="md:border md:border-kb-border-tertiary">
          <div className="w-full sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {remainingPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <article className="flex flex-col h-full bg-kb-surface-secondary rounded-xl overflow-hidden border border-kb-border-tertiary cursor-pointer">
                    {/* Cover Image */}
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={
                          post.image ||
                          "https://framerusercontent.com/images/9SZoLAT4bMBHDkLEUqVXmGlMkbM.png?scale-down-to=1024"
                        }
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Card Content */}
                    <div className="flex flex-col flex-1 gap-2 sm:gap-3 p-4 sm:p-5">
                      {/* Date */}
                      <Text size="sm" variant="secondary">
                        {formatDate(post.date)}
                      </Text>

                      {/* Title */}
                      <Heading
                        size="sm"
                        variant="display"
                        className="font-semibold! text-base! sm:text-lg! lg:text-xl! line-clamp-2"
                      >
                        {post.title}
                      </Heading>

                      {/* Description */}
                      <Text
                        variant="secondary"
                        size="sm"
                        className="line-clamp-2 text-xs! sm:text-sm!"
                      >
                        {post.description}
                      </Text>

                      {/* Author & Category - Always at bottom */}
                      <div className="flex items-center justify-between mt-auto pt-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-kb-surface-tertiary overflow-hidden shrink-0">
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Text
                            size="sm"
                            className="font-medium truncate text-xs! sm:text-sm!"
                          >
                            {post.author.name}
                          </Text>
                        </div>

                        <Badge size="sm" className="shrink-0 text-xs!">
                          {post.category.name}
                        </Badge>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
