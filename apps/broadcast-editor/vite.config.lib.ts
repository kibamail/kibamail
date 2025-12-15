import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'lib/index.ts'),
      name: 'EmailEditor',
      formats: ['es', 'cjs'],
      fileName: (format) => `email-editor.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: [
        // Peer dependencies
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@kibamail/owly',
        '@tiptap/core',
        '@tiptap/react',
        'classnames',
        'iconoir-react',
        // TipTap extensions (dependencies)
        '@tiptap/pm',
        '@tiptap/starter-kit',
        '@tiptap/extension-drag-handle-react',
        '@tiptap/extension-emoji',
        '@tiptap/extension-heading',
        '@tiptap/extension-highlight',
        '@tiptap/extension-horizontal-rule',
        '@tiptap/extension-image',
        '@tiptap/extension-list',
        '@tiptap/extension-mathematics',
        '@tiptap/extension-mention',
        '@tiptap/extension-paragraph',
        '@tiptap/extension-subscript',
        '@tiptap/extension-superscript',
        '@tiptap/extension-text-align',
        '@tiptap/extension-text-style',
        '@tiptap/extension-typography',
        '@tiptap/extensions',
        '@tiptap/suggestion',
        // Other dependencies
        '@floating-ui/react',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-popover',
        'lodash.throttle',
        'react-hotkeys-hook'
      ],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        },
        // Preserve CSS imports
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'email-editor.css';
          return assetInfo.name || 'asset';
        }
      }
    },
    cssCodeSplit: false,
    sourcemap: true,
    // Ensure compatibility
    target: 'es2015',
    minify: false,
    // Don't clear dist folder (TypeScript generates types there first)
    emptyOutDir: false
  }
})
