import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Clean, lightweight Vite plugin to support HTML partial components:
 * <include src="./src/components/foo.html" />
 * Evaluates recursively at build & dev time and watches partials during dev.
 */
function htmlInjectPlugin() {
  return {
    name: 'vite-plugin-html-inject',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        function processIncludes(content, baseDir) {
          return content.replace(/<include\s+src=["']([^"']+)["']\s*(?:\/>|>\s*<\/include>)/gi, (match, src) => {
            const filePath = path.resolve(baseDir, src);
            if (!fs.existsSync(filePath)) {
              console.warn(`[html-inject] Component file not found: ${filePath}`);
              return `<!-- Missing include: ${src} -->`;
            }
            if (ctx.server && ctx.server.watcher) {
              ctx.server.watcher.add(filePath);
            }
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return processIncludes(fileContent, path.dirname(filePath));
          });
        }
        return processIncludes(html, path.resolve(__dirname));
      },
    },
  };
}

export default defineConfig({
  plugins: [htmlInjectPlugin()],
  server: {
    port: 5173,
    host: true,
    cors: true,
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
