/**
 * Leistungen. Die Schlüssel entsprechen public/api/optionen.json → „leistungen“,
 * damit „Anfragen“ die Leistung im Formular vorauswählt.
 * Reihenfolge hier = Reihenfolge auf der Seite. Eine Leistung entfernen: Eintrag löschen
 * (und bei Bedarf auch in optionen.json).
 */
import type { ImageMetadata } from 'astro';
import mobile from '../assets/projekte/champions-league/set-9.jpg';
import dop from '../assets/projekte/bauer-sucht-frau/poster.jpg';
import kamera from '../assets/symbolbilder/fx9-bildmechaniker.jpg';
import assistenz from '../assets/projekte/nfl-europa/set-4.jpg';
import produktion from '../assets/projekte/champions-league/set-3.jpg';
import social from '../assets/projekte/champions-league/set-8.jpg';
import reels from '../assets/projekte/champions-league/set-7.jpg';
import event from '../assets/projekte/nfl-europa/set-6.jpg';

type T = { de: string; en: string };
export type Leistung = {
  key: string;
  titel: T;
  text: T;
  einsaetze: { de: string[]; en: string[] };
  bild: ImageMetadata;
  bildAlt: T;
};

export const leistungen: Leistung[] = [
  {
    key: 'mobile-kamera',
    titel: { de: 'Mobile Kamera & Live-Bildfunk', en: 'Mobile camera & live wireless video' },
    text: {
      de: 'Ein kleines, bewegliches System auf dem Gimbal, kombiniert mit einer Funkstrecke für Livebild ohne Kabel. So entstehen Bilder ganz nah am Geschehen: am Spielfeldrand, im Tunnel, bei der Ankunft der Teams und im Jubel nach dem Abpfiff.',
      en: 'A small, agile gimbal system paired with a wireless link for cable-free live pictures. It gets us right into the action: on the touchline, in the tunnel, at team arrivals and in the celebrations after the final whistle.',
    },
    einsaetze: {
      de: ['Fußball live', 'NFL', 'Hallen- und Arenaformate', 'Vorberichte'],
      en: ['Live football', 'NFL', 'Arena formats', 'Pre-match shows'],
    },
    bild: mobile,
    bildAlt: { de: 'Kabellose Gimbal-Kamera am Spielfeldrand', en: 'Wireless gimbal camera on the touchline' },
  },
  {
    key: 'dop',
    titel: { de: 'Bildgestaltung (DOP)', en: 'Cinematography (DOP)' },
    text: {
      de: 'Wir verantworten den Look einer Produktion: Licht, Kameraplanung und Bildsprache – vom Konzept bis zum Drehtag.',
      en: 'We take care of a production’s look: lighting, camera planning and visual language – from concept to shooting day.',
    },
    einsaetze: { de: ['TV-Formate', 'Shows und Specials', 'Ausstellungen'], en: ['TV formats', 'Shows and specials', 'Exhibitions'] },
    bild: dop,
    bildAlt: { de: 'Luftaufnahme: Traktor zieht ein Herz ins Feld', en: 'Aerial shot: a tractor draws a heart into a field' },
  },
  {
    key: 'kamerafuehrung',
    titel: { de: 'Kameraführung', en: 'Camera operation' },
    text: {
      de: 'Erfahrene Kameraleute an Schulter-, Stativ- oder Systemkamera – mit eigener Technik oder in euer Setup integriert.',
      en: 'Experienced operators on shoulder, tripod or system cameras – with our own kit or integrated into your setup.',
    },
    einsaetze: { de: ['EB-Einsätze', 'Live-Produktionen', 'Interviews'], en: ['ENG assignments', 'Live productions', 'Interviews'] },
    bild: kamera,
    bildAlt: { de: 'Sony FX9 der Bildmechaniker auf dem Schulter-Rig', en: 'Bildmechaniker Sony FX9 on a shoulder rig' },
  },
  {
    key: 'kameraassistenz',
    titel: { de: 'Kameraassistenz', en: 'Camera assistance' },
    text: {
      de: 'Aufbau, Verkabelung, Funk und Akkus: Wir sorgen dafür, dass die Technik läuft, damit vorne alles klappt.',
      en: 'Setup, cabling, wireless and batteries: we keep the kit running so everything works out front.',
    },
    einsaetze: { de: ['Live-Sport', 'Studio', 'Mehrkamera-Drehs'], en: ['Live sports', 'Studio', 'Multi-camera shoots'] },
    bild: assistenz,
    bildAlt: { de: 'Vorbereitetes Kamera-Rig am Moderationsplatz', en: 'Prepared camera rig at the presentation desk' },
  },
  {
    key: 'videoproduktion',
    titel: { de: 'Videoproduktion', en: 'Video production' },
    text: {
      de: 'Von der Idee bis zum fertigen Film: Planung, Dreh und Team aus einer Hand – mit unserem Netzwerk aus erfahrenen Freelancern.',
      en: 'From idea to finished film: planning, shooting and crew from a single source – backed by our network of experienced freelancers.',
    },
    einsaetze: { de: ['Imagefilme', 'Reportagen', 'Formate für Sender'], en: ['Corporate films', 'Features', 'Broadcast formats'] },
    bild: produktion,
    bildAlt: { de: 'Blick auf den Kameramonitor am Moderationsplatz', en: 'Looking at the camera monitor at the presentation desk' },
  },
  {
    key: 'social',
    titel: { de: 'Social Media Content', en: 'Social media content' },
    text: {
      de: 'Inhalte für Instagram, TikTok und Co.: schnell, nah dran und im passenden Format für jeden Kanal.',
      en: 'Content for Instagram, TikTok and more: fast, close-up and in the right format for every channel.',
    },
    einsaetze: { de: ['Behind the Scenes', 'Spieltag-Content', 'Eventbegleitung'], en: ['Behind the scenes', 'Matchday content', 'Event coverage'] },
    bild: social,
    bildAlt: { de: 'Gelbe Brille vor der Eckfahne in Dortmund', en: 'Yellow sunglasses in front of the corner flag in Dortmund' },
  },
  {
    key: 'reels',
    titel: { de: 'Reels und Kurzvideos', en: 'Reels and short-form video' },
    text: {
      de: 'Kurze, hochformatige Clips, die im Feed funktionieren – gedreht und geschnitten mit Blick auf die ersten Sekunden.',
      en: 'Short vertical clips that work in the feed – shot and cut with the first seconds in mind.',
    },
    einsaetze: { de: ['Instagram Reels', 'TikTok', 'YouTube Shorts'], en: ['Instagram Reels', 'TikTok', 'YouTube Shorts'] },
    bild: reels,
    bildAlt: { de: 'Eckfahne im Signal Iduna Park bei Flutlicht', en: 'Corner flag at Signal Iduna Park under floodlights' },
  },
  {
    key: 'event',
    titel: { de: 'Event- und Dokumentationsproduktionen', en: 'Event and documentary productions' },
    text: {
      de: 'Wir begleiten Veranstaltungen, Preisverleihungen und Ausstellungen – live, zur Dokumentation oder als Grundlage für spätere Formate.',
      en: 'We cover events, award ceremonies and exhibitions – live, for documentation or as the basis for later formats.',
    },
    einsaetze: { de: ['Großveranstaltungen', 'Preisverleihungen', 'Ausstellungen'], en: ['Major events', 'Award ceremonies', 'Exhibitions'] },
    bild: event,
    bildAlt: { de: 'Großes Schild „Berlin Game 2025“ im Stadion', en: 'Large “Berlin Game 2025” sign inside the stadium' },
  },
];

export const equipment = {
  de: [
    ['Sony FX9', 'Vollformat-Kamera für Schulter- und Stativeinsätze'],
    ['Sony FX6', 'Kompakte Kamera für das mobile Gimbal-System'],
    ['Ronin-Gimbal', 'Stabilisierte Bilder aus der Bewegung'],
    ['DTC Domo Live', 'Funkstrecke für Livebild ohne Kabel'],
  ],
  en: [
    ['Sony FX9', 'Full-frame camera for shoulder and tripod work'],
    ['Sony FX6', 'Compact camera for the mobile gimbal system'],
    ['Ronin gimbal', 'Stabilised shots on the move'],
    ['DTC Domo Live', 'Wireless link for cable-free live pictures'],
  ],
} as const;
