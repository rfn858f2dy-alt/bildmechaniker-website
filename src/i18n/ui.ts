export const SPRACHEN = ['de', 'en'] as const;
export type Lang = (typeof SPRACHEN)[number];

export const ui = {
  de: {
    'nav.produktionen': 'Produktionen',
    'nav.leistungen': 'Leistungen',
    'nav.ueber': 'Über uns',
    'nav.kontakt': 'Kontakt',
    'nav.menu': 'Menü',
    'nav.close': 'Menü schließen',
    'nav.skip': 'Zum Inhalt springen',
    'hero.claim': 'Näher geht’s nicht.',
    'hero.sub': 'Mobile Kamera, Live-Bildfunk und Bildgestaltung für Sport, TV-Formate und Ausstellungen.',
    'hero.play': 'Showreel ansehen',
    'hero.cta': 'Produktionen',
    'home.auswahl': 'Ausgewählte Produktionen',
    'home.alle': 'Alle Produktionen',
    'portfolio.titel': 'Produktionen',
    'portfolio.intro': 'Eine Auswahl unserer Arbeit, erzählt mit Bildern vom Set.',
    'filter.label': 'Nach Kategorie filtern',
    'filter.alle': 'Alle',
    'filter.anzahl': (n: number) => (n === 1 ? '1 Produktion' : `${n} Produktionen`),
    'kat.sport': 'Sport live',
    'kat.motorsport': 'Motorsport & Wintersport',
    'kat.tv': 'TV-Formate',
    'kat.kunst': 'Kunst & Ausstellung',
    'kat.social': 'Social & Behind the Scenes',
    'projekt.jahr': 'Jahr',
    'projekt.auftraggeber': 'Auftraggeber',
    'projekt.sender': 'Sender',
    'projekt.rolle': 'Unsere Rolle',
    'projekt.kategorie': 'Kategorie',
    'projekt.equipment': 'Equipment',
    'projekt.abspielen': 'Film abspielen',
    'projekt.galerie': 'Vom Set',
    'projekt.zurueck': 'Alle Produktionen',
    'projekt.vorher': 'Vorherige Produktion',
    'projekt.weiter': 'Nächste Produktion',
    'projekt.anfragen': 'Ähnliche Produktion anfragen',
    'player.schliessen': 'Video schließen',
    'player.laden': 'Video wird geladen',
    'player.yt.hinweis': 'Dieses Video wird von YouTube abgespielt. Beim Laden werden Daten an YouTube (Google) übertragen.',
    'player.yt.laden': 'Video von YouTube laden',
    'stub.text': 'Dieser Bereich wird gerade aufgebaut.',
    'footer.impressum': 'Impressum',
    'footer.datenschutz': 'Datenschutz',
  },
  en: {
    'nav.produktionen': 'Productions',
    'nav.leistungen': 'Services',
    'nav.ueber': 'About us',
    'nav.kontakt': 'Contact',
    'nav.menu': 'Menu',
    'nav.close': 'Close menu',
    'nav.skip': 'Skip to content',
    'hero.claim': 'As close as it gets.',
    'hero.sub': 'Mobile camera, live wireless video and cinematography for sports, TV formats and exhibitions.',
    'hero.play': 'Watch showreel',
    'hero.cta': 'Productions',
    'home.auswahl': 'Selected productions',
    'home.alle': 'All productions',
    'portfolio.titel': 'Productions',
    'portfolio.intro': 'A selection of our work, told through images from the set.',
    'filter.label': 'Filter by category',
    'filter.alle': 'All',
    'filter.anzahl': (n: number) => (n === 1 ? '1 production' : `${n} productions`),
    'kat.sport': 'Live sports',
    'kat.motorsport': 'Motorsport & winter sports',
    'kat.tv': 'TV formats',
    'kat.kunst': 'Art & exhibitions',
    'kat.social': 'Social & behind the scenes',
    'projekt.jahr': 'Year',
    'projekt.auftraggeber': 'Client',
    'projekt.sender': 'Broadcaster',
    'projekt.rolle': 'Our role',
    'projekt.kategorie': 'Category',
    'projekt.equipment': 'Equipment',
    'projekt.abspielen': 'Play film',
    'projekt.galerie': 'On set',
    'projekt.zurueck': 'All productions',
    'projekt.vorher': 'Previous production',
    'projekt.weiter': 'Next production',
    'projekt.anfragen': 'Request a similar production',
    'player.schliessen': 'Close video',
    'player.laden': 'Loading video',
    'player.yt.hinweis': 'This video is played by YouTube. Loading it transfers data to YouTube (Google).',
    'player.yt.laden': 'Load video from YouTube',
    'stub.text': 'This section is under construction.',
    'footer.impressum': 'Legal notice',
    'footer.datenschutz': 'Privacy',
  },
} as const;

type Keys = keyof (typeof ui)['de'];

export function useT(lang: Lang) {
  return <K extends Keys>(key: K): (typeof ui)['de'][K] => (ui[lang] as any)[key] ?? ui.de[key];
}

/** Übersetzte Pfade: gleiche Seite in beiden Sprachen. */
export const routes = {
  home: { de: '/de/', en: '/en/' },
  produktionen: { de: '/de/produktionen/', en: '/en/productions/' },
  leistungen: { de: '/de/leistungen/', en: '/en/services/' },
  ueber: { de: '/de/ueber-uns/', en: '/en/about/' },
  kontakt: { de: '/de/kontakt/', en: '/en/contact/' },
} as const;

export const projektPfad = (lang: Lang, slug: string) => `${routes.produktionen[lang]}${slug}/`;

/** Wählt die passende Sprachfassung eines Textfeldes. */
export const tx = (v: { de: string; en?: string }, lang: Lang) => (lang === 'en' && v.en ? v.en : v.de);
export const txa = (v: { de: string[]; en?: string[] }, lang: Lang) => (lang === 'en' && v.en ? v.en : v.de);
