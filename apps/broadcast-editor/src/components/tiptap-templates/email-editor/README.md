# @kibamail/email-editor

A powerful, customizable email editor component built with TipTap and React. Perfect for building rich email editing experiences with support for advanced formatting, custom nodes, and side panels.

## Features

- 🎨 **Rich Text Editing** - Full-featured WYSIWYG editor powered by TipTap
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎯 **Side Panels** - Built-in left and right panels for global and node-specific settings
- 🌈 **Customizable** - Extensive styling options and configuration
- 📦 **TypeScript Support** - Full type definitions included
- ⚡ **Performance** - Optimized for large documents with virtual scrolling
- 🎨 **Styling** - Comes with beautiful default styles that can be customized

## Installation

```bash
npm install @kibamail/email-editor
```

### Peer Dependencies

Make sure you have the required peer dependencies installed:

```bash
npm install react react-dom @tiptap/core @tiptap/react
```

## Usage

### Basic Example

```tsx
import { EmailEditor } from '@kibamail/email-editor';
import '@kibamail/email-editor/styles';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <EmailEditor placeholder="Start writing your email..." />
    </div>
  );
}
```

### Important Notes

1. **Container Height**: The EmailEditor must be placed in a container with a defined height. It will take 100% of the parent container's height.

2. **Styles**: Don't forget to import the styles:
   ```tsx
   import '@kibamail/email-editor/styles';
   ```

## Props

### EmailEditorProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`placeholder\` | \`string\` | \`"Start writing..."\` | Placeholder text shown when editor is empty |

## Layout

The EmailEditor features a three-column layout:

- **Left Panel** (300px): Global settings panel
- **Center Editor** (flexible, max 600px): Main editing area
- **Right Panel** (300px): Active node settings panel

The center editor remains perfectly centered regardless of panel state, and all sections maintain the height of their parent container.

## Styling

The component comes with default styles, but you can customize them by overriding CSS classes:

```css
/* Customize the root container */
.email-editor-root {
  /* your styles */
}

/* Customize the panels */
.email-editor-left-panel,
.email-editor-right-panel {
  /* your styles */
}

/* Customize the editor content area */
.email-editor-content {
  /* your styles */
}
```

## Advanced Usage

### Custom Container Height

```tsx
<div style={{ height: '600px' }}>
  <EmailEditor />
</div>
```

The editor will automatically adjust to the container height, with all three sections (left panel, editor, right panel) matching that height and becoming scrollable independently.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/kibamail/email-editor/issues).
