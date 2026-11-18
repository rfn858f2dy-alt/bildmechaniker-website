#!/usr/bin/env node
/**
 * Neues Projekt anlegen – erzeugt Standbild, Vorschauclip, optional den Film und die Textdatei.
 *
 *   npm run projekt:neu -- --slug baller-league --clip rohmaterial/bl.mov --start 12 \
 *        --titel "Baller League" --auftraggeber "Baller League" --kategorie sport
 *
 * Optionen:
 *   --slug          Adresse des Projekts (Kleinbuchstaben, Bindestriche)       [Pflicht]
 *   --clip          Clip, aus dem Standbild und Vorschau entstehen             [Pflicht]
 *   --start         Sekunde im Clip, ab der die Vorschau beginnt (Standard 0)
 *   --dauer         Länge der Vorschau in Sekunden (Standard 6)
 *   --standbild     Sekunde für das Standbild (Standard: start + 1)
 *   --film          Längerer Film mit Ton für die Lightbox (optional)
 *   --youtube       Stattdessen eine YouTube-ID (optional)
 *   --titel, --auftraggeber (Produktionsfirma), --sender, --jahr, --kategorie (mehrfach möglich), --rolle (mehrfach möglich)
 */
import { parseArgs } from 'node:util';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { vorschau, standbild, film } from './medien.mjs';

const { values: a } = parseArgs({
  options: {
    slug: { type: 'string' },
    clip: { type: 'string' },
    start: { type: 'string', default: '0' },
    dauer: { type: 'string', default: '6' },
    standbild: { type: 'string' },
    film: { type: 'string' },
    youtube: { type: 'string' },
    titel: { type: 'string' },
    auftraggeber: { type: 'string', default: '' },
    sender: { type: 'string', default: '' },
    jahr: { type: 'string' },
    kategorie: { type: 'string', multiple: true, default: ['sport'] },
    rolle: { type: 'string', multiple: true, default: ['Mobile Kamera'] },
  },
});

if (!a.slug || !a.clip || !/^[a-z0-9-]+$/.test(a.slug)) {
  console.error('Bitte --slug (nur a–z, 0–9, -) und --clip angeben. Hilfe: siehe Kopf dieser Datei.');
  process.exit(1);
}
if (!existsSync(a.clip)) {
  console.error(`Clip nicht gefunden: ${a.clip}`);
  process.exit(1);
}

const media = `public/media/projekte/${a.slug}`;
const assets = `src/assets/projekte/${a.slug}`;
mkdirSync(assets, { recursive: true });

console.log(`Projekt „${a.slug}“`);
standbild(a.clip, `${assets}/poster.jpg`, a.standbild ?? Number(a.start) + 1);
vorschau(a.clip, `${media}/vorschau.mp4`, a.start, a.dauer);
if (a.film) film(a.film, `${media}/film`);

const md = `src/content/projekte/${a.slug}.md`;
if (existsSync(md)) {
  console.log(`  • ${md} existiert schon – Text bleibt unverändert.`);
} else {
  const titel = a.titel ?? a.slug;
  const video = a.film
    ? `video:\n  typ: datei\n  src: /media/projekte/${a.slug}/film-1080.mp4\n  srcMobil: /media/projekte/${a.slug}/film-720.mp4\n`
    : a.youtube
      ? `video:\n  typ: youtube\n  id: ${a.youtube}\n`
      : '';
  writeFileSync(
    md,
    `---
titel:
  de: ${titel}
  en: ${titel}
kurz:
  de: Ein Satz, der das Projekt beschreibt.
  en: One sentence describing the project.
beschreibung:
  de: |
    Was war die Aufgabe, wie haben wir sie gelöst?

    Zweiter Absatz.
  en: |
    What was the brief, how did we approach it?
${a.auftraggeber ? `auftraggeber: "${a.auftraggeber}"` : '# auftraggeber: "Produktionsfirma"'}
${a.sender ? `sender: "${a.sender}"` : '# sender: "Sender"'}
${a.jahr ? `jahr: ${a.jahr}` : '# jahr: 2025'}
rolle:
  de: [${a.rolle.join(', ')}]
kategorien: [${a.kategorie.join(', ')}]
equipment: []
poster: ../../assets/projekte/${a.slug}/poster.jpg
posterAlt:
  de: Beschreibung des Standbilds für Screenreader
vorschau: /media/projekte/${a.slug}/vorschau.mp4
${video}highlight: false
reihenfolge: 100
---
`,
  );
  console.log(`  ✓ ${md} – bitte Texte ergänzen.`);
}
