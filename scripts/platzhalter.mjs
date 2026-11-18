#!/usr/bin/env node
/**
 * Erzeugt Platzhalter-Clips (abstrakte Farbverläufe mit Beschriftung), solange noch kein
 * Behind-the-Scenes-Material eingepflegt ist. Läuft durch dieselbe Pipeline wie echtes Material.
 * Wird ein Projekt mit echtem Material angelegt (npm run projekt:neu), werden die Dateien überschrieben.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { vorschau, standbild, film, loop } from './medien.mjs';

const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const tmp = 'rohmaterial/platzhalter';
mkdirSync(tmp, { recursive: true });

function quelle(name, text, c0, c1, { hoch = false, sek = 14, ton = false } = {}) {
  const out = `${tmp}/${name}.mp4`;
  if (existsSync(out)) return out;
  const s = hoch ? '1080x1920' : '1920x1080';
  const fs = hoch ? 64 : 84;
  const vf = [
    `noise=alls=7:allf=t`,
    `vignette=PI/4`,
    `drawtext=fontfile=${FONT}:text='${text}':fontcolor=white@0.9:fontsize=${fs}:x=(w-tw)/2:y=(h-th)/2`,
    `drawtext=fontfile=${FONT}:text='PLATZHALTER  ·  BEHIND-THE-SCENES FOLGT':fontcolor=white@0.55:fontsize=${Math.round(fs * 0.32)}:x=(w-tw)/2:y=(h/2)+${Math.round(fs * 1.1)}`,
  ].join(',');
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `gradients=s=${s}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=${hoch ? 1080 : 1920}:y1=${hoch ? 1920 : 1080}:speed=0.015:duration=${sek}:rate=25`];
  if (ton) args.push('-f', 'lavfi', '-i', `sine=frequency=220:duration=${sek}`, '-shortest');
  args.push('-vf', vf, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p');
  if (ton) args.push('-c:a', 'aac', '-af', 'volume=0.05');
  args.push(out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  return out;
}

const projekte = [
  ['champions-league', 'CHAMPIONS LEAGUE', '0x0b2a4a', '0x2e8fe3', { film: true, galerie: 3 }],
  ['matchday-1-show', 'MATCHDAY-1-SHOW', '0x1b1033', '0x6b4fd8'],
  ['bauer-sucht-frau', 'BAUER SUCHT FRAU', '0x2a1d0b', '0xd8902e', { film: true, galerie: 3 }],
  ['nations-league', 'NATIONS LEAGUE', '0x0b2a1d', '0x2ed88a'],
  ['nfl', 'NFL', '0x2a0b0b', '0xd83a2e'],
  ['baller-league', 'BALLER LEAGUE', '0x101010', '0xb8e32e'],
  ['24h-nuerburgring', '24H NÜRBURGRING', '0x1d1d1d', '0xe3c22e'],
  ['ibsf-bob-skeleton', 'BOB & SKELETON', '0x0b1d2a', '0xbfe4ff'],
  ['bundeskunsthalle', 'BUNDESKUNSTHALLE BONN', '0x1a1a1a', '0x8a8a8a'],
  ['spieltag-reels', 'SPIELTAG-REELS', '0x2a0b22', '0xe32eb0', { hoch: true, film: true }],
];

for (const [slug, text, c0, c1, o = {}] of projekte) {
  console.log(slug);
  const src = quelle(slug, text, c0, c1, { hoch: o.hoch, ton: false });
  standbild(src, `src/assets/projekte/${slug}/poster.jpg`, 2);
  vorschau(src, `public/media/projekte/${slug}/vorschau.mp4`, 1, 6);
  if (o.film) film(quelle(`${slug}-film`, text, c0, c1, { hoch: o.hoch, sek: 20, ton: true }), `public/media/projekte/${slug}/film`);
  for (let i = 1; i <= (o.galerie ?? 0); i++) standbild(src, `src/assets/projekte/${slug}/set-${i}.jpg`, 2 + i * 3);
}

console.log('showreel');
const reel = quelle('showreel', 'BILDMECHANIKER', '0x0b0c0e', '0x0072bb', { sek: 16 });
loop(reel, 'public/media/showreel/loop', 0, 12);
standbild(reel, 'src/assets/showreel/poster.jpg', 0.5);
film(quelle('showreel-film', 'SHOWREEL', '0x0b0c0e', '0x0072bb', { sek: 30, ton: true }), 'public/media/showreel/showreel');
