// Gemeinsame ffmpeg-Rezepte für Vorschauclips, Filme, Loops und Standbilder.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

const ff = (args) => {
  mkdirSync(dirname(args.at(-1)), { recursive: true });
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  const kb = Math.round(statSync(args.at(-1)).size / 1024);
  console.log(`  ✓ ${args.at(-1)} (${kb} KB)`);
};

/** H.264 mit Qualitätsziel (crf) und Obergrenze der Datenrate fürs Web (max in Mbit/s). */
const h264 = (crf, max) => [
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-maxrate', `${max}M`, '-bufsize', `${max * 2}M`,
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
];
/** Skaliert auf die lange Kante passend für Quer- und Hochformat. */
const scale = (quer, hoch) => `scale='if(gt(iw,ih),${quer},-2)':'if(gt(iw,ih),-2,${hoch})':flags=lanczos`;

/** Stummer Vorschauclip für die Kachel: 6 s, 640 px, ca. 300–700 KB. */
export const vorschau = (input, out, start = 0, dauer = 6) =>
  ff(['-ss', String(start), '-t', String(dauer), '-i', input, '-an', '-vf', `${scale(640, 640)},fps=25`, ...h264(28, 1.2), out]);

/** Standbild in hoher Auflösung; Astro erzeugt daraus beim Build AVIF/WebP in allen Größen. */
export const standbild = (input, out, zeit = 1) =>
  ff(['-ss', String(zeit), '-i', input, '-frames:v', '1', '-vf', scale(2560, 2560), '-q:v', '2', out]);

/** Film mit Ton für die Lightbox, in 1080p und 720p (mobil). */
export const film = (input, outBase) => {
  ff(['-i', input, '-vf', scale(1920, 1920), ...h264(22, 6), '-c:a', 'aac', '-b:a', '160k', `${outBase}-1080.mp4`]);
  ff(['-i', input, '-vf', scale(1280, 1280), ...h264(24, 3), '-c:a', 'aac', '-b:a', '128k', `${outBase}-720.mp4`]);
};

/** Stummer Hintergrund-Loop für den Hero, 1080p und 720p. */
export const loop = (input, outBase, start = 0, dauer = 12) => {
  ff(['-ss', String(start), '-t', String(dauer), '-i', input, '-an', '-vf', `${scale(1920, 1920)},fps=25`, ...h264(27, 4), `${outBase}-1080.mp4`]);
  ff(['-ss', String(start), '-t', String(dauer), '-i', input, '-an', '-vf', `${scale(1280, 1280)},fps=25`, ...h264(29, 2), `${outBase}-720.mp4`]);
};
