#!/usr/bin/env node
/**
 * Fotos vom Set in ein Projekt übernehmen.
 *
 *   npm run fotos -- --projekt nfl  fotos/IMG_1.HEIC fotos/IMG_2.jpg
 *   npm run fotos -- --projekt nfl --poster fotos/IMG_3.jpg
 *   npm run fotos -- --showreel-poster fotos/stadion.HEIC
 *
 * Was passiert:
 *  – HEIC (iPhone), JPG, PNG, WebP werden gelesen und richtig gedreht
 *  – ALLE Metadaten werden entfernt (GPS-Ort, Gerät, Aufnahmezeit)
 *  – auf höchstens 2560 px verkleinert und als JPG gespeichert (Astro erzeugt daraus AVIF/WebP)
 *  – Galeriefotos werden automatisch in der Projektdatei unter „galerie:“ eingetragen
 *  – --poster schneidet das Bild automatisch auf 16:9 zu (Bildausschnitt mit dem meisten Inhalt)
 *    und setzt es als Standbild der Kachel. Ausschnitt steuern mit --fokus top|centre|bottom
 *    oder genau mit Prozent, z. B. --fokus 30% (0% = oben/links, 100% = unten/rechts).
 */
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const { values: a, positionals: dateien } = parseArgs({
  allowPositionals: true,
  options: {
    projekt: { type: 'string' },
    poster: { type: 'string' },
    fokus: { type: 'string', default: 'attention' },
    'showreel-poster': { type: 'string' },
  },
});

const MAX = 2560;
const tmp = mkdtempSync(join(tmpdir(), 'fotos-'));

/** HEIC lesen: sharp kann das nicht, daher über vorhandene Werkzeuge in JPG wandeln. */
function lesbar(datei) {
  if (!/\.hei[cf]$/i.test(datei)) return datei;
  const ziel = join(tmp, basename(datei, extname(datei)) + '.jpg');
  const versuche = [
    ['sips', ['-s', 'format', 'jpeg', datei, '--out', ziel]], // macOS
    ['heif-convert', ['-q', '95', datei, ziel]], // Linux (libheif-examples)
    ['python3', ['-c', `import sys;from PIL import Image,ImageOps;import pillow_heif;pillow_heif.register_heif_opener();ImageOps.exif_transpose(Image.open(sys.argv[1])).convert('RGB').save(sys.argv[2],quality=95)`, datei, ziel]],
  ];
  for (const [cmd, args] of versuche) {
    try {
      execFileSync(cmd, args, { stdio: 'ignore' });
      if (existsSync(ziel)) return ziel;
    } catch {}
  }
  throw new Error(`HEIC konnte nicht gelesen werden: ${datei}. Auf dem Mac geht es automatisch; sonst das Foto vorher als JPG exportieren.`);
}

/** Bild drehen, verkleinern, Metadaten entfernen (sharp entfernt sie standardmäßig). */
async function speichern(datei, ziel, { format169 = false, fokus = 'attention' } = {}) {
  // Erst richtig drehen, dann in einem zweiten Schritt zuschneiden und verkleinern
  let puffer = await sharp(lesbar(datei)).rotate().toBuffer();
  if (format169) {
    const { width, height } = await sharp(puffer).metadata();
    const w = Math.min(width, Math.round((height * 16) / 9));
    const h = Math.round((w * 9) / 16);
    const prozent = /^(\d{1,3})%$/.exec(fokus);
    puffer = prozent
      ? // Ausschnitt per Prozent: 0% = ganz oben/links, 100% = ganz unten/rechts
        await sharp(puffer)
          .extract({
            left: Math.round(((width - w) * Number(prozent[1])) / 100),
            top: Math.round(((height - h) * Number(prozent[1])) / 100),
            width: w,
            height: h,
          })
          .toBuffer()
      : await sharp(puffer)
          .resize(w, h, { fit: 'cover', position: fokus === 'attention' ? sharp.strategy.attention : fokus })
          .toBuffer();
  }
  await sharp(puffer).resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toFile(ziel);
  const m = await sharp(ziel).metadata();
  console.log(`  ✓ ${ziel} (${m.width}×${m.height}, ohne Metadaten${m.exif ? ' – WARNUNG: EXIF noch vorhanden' : ''})`);
}

try {
  if (a['showreel-poster']) {
    await speichern(a['showreel-poster'], 'src/assets/showreel/poster.jpg');
  }

  if (a.projekt) {
    const md = `src/content/projekte/${a.projekt}.md`;
    if (!existsSync(md)) throw new Error(`Projekt nicht gefunden: ${md} (zuerst mit „npm run projekt:neu“ anlegen)`);
    const ordner = `src/assets/projekte/${a.projekt}`;
    mkdirSync(ordner, { recursive: true });

    if (a.poster) await speichern(a.poster, `${ordner}/poster.jpg`, { format169: true, fokus: a.fokus });

    if (dateien.length) {
      const vorhanden = readdirSync(ordner).map((f) => /^set-(\d+)\.jpg$/.exec(f)?.[1]).filter(Boolean).map(Number);
      let nr = Math.max(0, ...vorhanden);
      const neu = [];
      for (const d of dateien) {
        nr++;
        await speichern(d, `${ordner}/set-${nr}.jpg`);
        neu.push(nr);
      }
      galerieEintragen(md, a.projekt, neu);
    }
  }
  if (!a.projekt && !a['showreel-poster']) {
    console.error('Bitte --projekt <slug> (mit Fotos und/oder --poster) oder --showreel-poster angeben.');
    process.exitCode = 1;
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/** Neue Galeriefotos in der Projektdatei ergänzen (vorhandene Einträge bleiben unverändert). */
function galerieEintragen(md, slug, nummern) {
  const text = readFileSync(md, 'utf8');
  const eintraege = nummern
    .map((n) => `  - bild: ../../assets/projekte/${slug}/set-${n}.jpg\n    alt:\n      de: "Am Set – bitte Bildbeschreibung ergänzen"\n      en: "On set – please add an image description"`)
    .join('\n');
  const zeilen = text.split('\n');
  const start = zeilen.findIndex((z) => /^galerie:\s*(\[\])?\s*$/.test(z));
  let neu;
  if (start === -1) {
    const vor = zeilen.findIndex((z) => /^highlight:/.test(z));
    zeilen.splice(vor === -1 ? zeilen.lastIndexOf('---') : vor, 0, 'galerie:', eintraege);
    neu = zeilen.join('\n');
  } else {
    zeilen[start] = 'galerie:';
    let ende = start + 1;
    while (ende < zeilen.length && /^(\s|-)/.test(zeilen[ende])) ende++;
    zeilen.splice(ende, 0, eintraege);
    neu = zeilen.join('\n');
  }
  writeFileSync(md, neu);
  console.log(`  ✓ ${md}: ${nummern.length} Foto(s) in der Galerie ergänzt – bitte Bildbeschreibungen (alt) ausfüllen.`);
}
