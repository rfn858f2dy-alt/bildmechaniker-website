/**
 * Showreel der Startseite. Austauschen: neue Dateien mit `npm run showreel -- <clip>` erzeugen
 * und hier die Pfade anpassen. Solange es kein fertiges Showreel gibt, entfällt der Button
 * „Showreel ansehen“ (film: undefined). Beispiel mit Datei:
 *   loop: { mobil: '/media/showreel/loop-720.mp4', desktop: '/media/showreel/loop-1080.mp4' }
 *   film: { typ: 'datei', src: '/media/showreel/showreel-1080.mp4', srcMobil: '/media/showreel/showreel-720.mp4' }
 */
import poster from '../assets/showreel/poster.jpg';

export const showreel = {
  poster,
  /**
   * Stummer Hintergrund-Loop, 8–15 s. Mobil kleiner, damit er schnell startet.
   * undefined = nur Standbild mit langsamer Kamerafahrt (solange es noch keine Clips gibt).
   */
  loop: undefined as { mobil: string; desktop: string } | undefined,
  /** Das ganze Showreel mit Ton für die Lightbox. Datei oder YouTube. */
  film: undefined as { typ: 'datei'; src: string; srcMobil?: string } | { typ: 'youtube'; id: string } | undefined,
};
