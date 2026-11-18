import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Zweisprachiger Text. Fehlt Englisch, wird Deutsch angezeigt. */
const t = z.object({ de: z.string(), en: z.string().optional() });

/** Die Filterkategorien. Neue Kategorie: hier ergänzen und in src/i18n/ui.ts benennen. */
export const KATEGORIEN = ['sport', 'motorsport', 'tv', 'kunst', 'social'] as const;

const projekte = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projekte' }),
  schema: ({ image }) =>
    z.object({
      titel: t,
      /** Ein Satz für die Kachel und Suchmaschinen. */
      kurz: t,
      /** Ausführliche Beschreibung für die Detailseite. Absätze mit Leerzeile trennen. */
      beschreibung: t,
      /** Produktionsjahr, z. B. 2025 oder "seit 2009". Ohne Angabe wird es nicht angezeigt. */
      jahr: z.union([z.number(), z.string()]).optional(),
      /** Auftraggeber (meist die Produktionsfirma). Optional. */
      auftraggeber: z.string().optional(),
      /** Sender bzw. Plattform, auf der die Produktion lief. Optional. */
      sender: z.string().optional(),
      /** Unsere Rolle in dieser Produktion. */
      rolle: z.object({ de: z.array(z.string()), en: z.array(z.string()).optional() }),
      kategorien: z.array(z.enum(KATEGORIEN)).min(1),
      equipment: z.array(z.string()).default([]),

      /** Standbild der Kachel und der Detailseite (wird automatisch als AVIF/WebP optimiert). */
      poster: image(),
      posterAlt: t,
      /** Kurzer, stummer Vorschauclip (4–8 s, ca. 640 px breit), Pfad unter /public. */
      vorschau: z.string().optional(),
      /** Der eigentliche Film: eigene Datei unter /public oder YouTube. */
      video: z
        .discriminatedUnion('typ', [
          z.object({ typ: z.literal('datei'), src: z.string(), srcMobil: z.string().optional() }),
          z.object({ typ: z.literal('youtube'), id: z.string() }),
        ])
        .optional(),
      format: z.enum(['16:9', '9:16']).default('16:9'),

      galerie: z.array(z.object({ bild: image(), alt: t })).default([]),

      /** Auf der Startseite zeigen. */
      highlight: z.boolean().default(false),
      /** Kleinere Zahl = weiter vorn. */
      reihenfolge: z.number().default(100),
      entwurf: z.boolean().default(false),
    }),
});

export const collections = { projekte };
