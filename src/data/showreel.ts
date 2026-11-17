/**
 * Showreel der Startseite. Austauschen: neue Dateien mit `npm run showreel -- <clip>` erzeugen
 * und hier die Pfade anpassen. Solange es kein fertiges Showreel gibt, läuft ein Loop
 * aus Behind-the-Scenes-Clips und der Button „Showreel ansehen“ entfällt (film: undefined).
 */
import poster from '../assets/showreel/poster.jpg';

export const showreel = {
  poster,
  /** Stummer Hintergrund-Loop, 8–15 s. Mobil kleiner, damit er schnell startet. */
  loop: {
    mobil: '/media/showreel/loop-720.mp4',
    desktop: '/media/showreel/loop-1080.mp4',
  },
  /** Das ganze Showreel mit Ton für die Lightbox. Datei oder YouTube. */
  film: {
    typ: 'datei' as const,
    src: '/media/showreel/showreel-1080.mp4',
    srcMobil: '/media/showreel/showreel-720.mp4',
  } as { typ: 'datei'; src: string; srcMobil?: string } | { typ: 'youtube'; id: string } | undefined,
};
