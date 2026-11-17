// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.bildmechaniker.de',
  // Statische Ausgabe: der fertige Ordner dist/ wird per SFTP zu Host Europe geladen.
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  image: {
    // Vorschaubilder werden beim Build als AVIF/WebP in mehreren Breiten erzeugt.
    responsiveStyles: false,
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
});
