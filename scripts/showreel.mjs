#!/usr/bin/env node
/**
 * Showreel bzw. Hintergrund-Loop für die Startseite erzeugen.
 *
 *   npm run showreel -- --loop rohmaterial/bts-schnitt.mov --start 3 --dauer 12
 *   npm run showreel -- --film rohmaterial/showreel-final.mov
 *
 * --loop  erzeugt den stummen Hero-Loop (1080p + 720p) und das Standbild
 * --film  erzeugt das ganze Showreel mit Ton für die Lightbox (1080p + 720p)
 */
import { parseArgs } from 'node:util';
import { loop, film, standbild } from './medien.mjs';

const { values: a } = parseArgs({
  options: {
    loop: { type: 'string' },
    film: { type: 'string' },
    start: { type: 'string', default: '0' },
    dauer: { type: 'string', default: '12' },
  },
});
if (!a.loop && !a.film) {
  console.error('Bitte --loop und/oder --film angeben.');
  process.exit(1);
}
if (a.loop) {
  loop(a.loop, 'public/media/showreel/loop', a.start, a.dauer);
  standbild(a.loop, 'src/assets/showreel/poster.jpg', Number(a.start) + 0.5);
}
if (a.film) film(a.film, 'public/media/showreel/showreel');
console.log('Fertig. Pfade stehen in src/data/showreel.ts.');
