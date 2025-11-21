# MDX Setup Documentation

MDX support has been successfully added to this Next.js app.

## Packages Installed

- `@next/mdx` - Next.js MDX integration
- `@mdx-js/loader` - MDX loader for webpack
- `@mdx-js/react` - React runtime for MDX
- `@types/mdx` - TypeScript types for MDX

## Configuration Files

### 1. `next.config.ts`

The Next.js config has been updated to support MDX files:

```typescript
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // ... other config
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
```

### 2. `mdx-components.tsx`

Custom MDX component styling using Tailwind CSS:

- Styled headings (h1, h2, h3)
- Styled paragraphs and lists
- Styled code blocks and inline code
- Styled links and blockquotes

## Usage

### Creating MDX Pages

Create `.mdx` files in the `app` directory just like regular pages:

```mdx
// app/my-page/page.mdx

export const metadata = {
  title: "My Page",
  description: "My page description",
};

# My Page Title

Content goes here...
```

### Using React Components in MDX

You can use React components directly in MDX:

```mdx
<div className="bg-blue-50 p-4 rounded">
  <p>This is a custom component!</p>
</div>
```

### Example Pages

Two example pages have been created:

1. `/test-mdx` - Basic MDX features demo
2. `/docs/getting-started` - Documentation example

## Adding Plugins

To add remark or rehype plugins, update `next.config.ts`:

```typescript
const withMDX = createMDX({
  options: {
    remarkPlugins: [
      // Add remark plugins here
    ],
    rehypePlugins: [
      // Add rehype plugins here
    ],
  },
});
```

### Popular Plugins

- `remark-gfm` - GitHub Flavored Markdown
- `remark-math` - Math support
- `rehype-highlight` - Syntax highlighting
- `rehype-slug` - Add IDs to headings
- `rehype-autolink-headings` - Add links to headings

## Building

The app builds successfully with MDX support:

```bash
pnpm build
# ✓ Compiled successfully
# ✓ Generated 6 pages including MDX pages
```

## Development

```bash
pnpm dev
# Visit http://localhost:3000/test-mdx to see MDX in action
```

## Customization

### Custom Styles

Edit `mdx-components.tsx` to customize the styling of MDX elements.

### Custom Components

Create custom components and import them in your MDX files:

```mdx
import { MyComponent } from "@/components/MyComponent";

# My Page

<MyComponent />
```

## Resources

- [Next.js MDX Documentation](https://nextjs.org/docs/pages/building-your-application/configuring/mdx)
- [MDX Documentation](https://mdxjs.com/)
- [Remark Plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)
- [Rehype Plugins](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)
