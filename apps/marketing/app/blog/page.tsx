import { Badge, Heading } from "@kibamail/owly";

export default function Blog() {
  return (
    <div className="w-full h-96 max-w-7xl mx-auto border border-kb-border-tertiary">
      <div className="flex flex-col gap-4 p-6">
        <Badge size="sm">blog</Badge>

        <Heading size="sm" variant="display">
          Insights on email marketing, email best practices and building a
          healthy email strategy.
        </Heading>
      </div>
    </div>
  );
}
