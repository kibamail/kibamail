import { Badge, Button, Heading, Text } from "@kibamail/owly";

const categories = [
  {
    name: "All categories",
    slug: "all",
  },
  {
    name: "Product updates",
    slug: "product-updates",
  },
  {
    name: "Case studies",
    slug: "case-studies",
  },
  {
    name: "Email marketing",
    slug: "email-marketing",
  },
  {
    name: "Email automation",
    slug: "email-automation",
  },
  {
    name: "Transactional email",
    slug: "transactional-email",
  },
];

export default function Blog() {
  return (
    <div className="w-full min-h-96 max-w-7xl mx-auto border border-kb-border-tertiary">
      <div className="flex flex-col gap-4 p-6">
        <Badge size="sm">blog</Badge>

        <div className="max-w-3xl">
          <Heading
            size="sm"
            variant="display"
            className="font-bold! text-2xl! md:text-4xl!"
          >
            Insights on email marketing, email best practices and email
            automation.
          </Heading>

          <Text
            variant="secondary"
            size="lg"
            className="mt-2 md:mt-4 inline-block"
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam
            blanditiis vel ipsa inventore qui accopritum.
          </Text>
        </div>

        <div className="w-full flex flex-wrap items-center gap-2 md:gap-4">
          {categories.map((category) => (
            <Button
              key={category.slug}
              variant="secondary"
              className="rounded-full!"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
