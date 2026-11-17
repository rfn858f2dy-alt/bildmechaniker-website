/**
 * Verhalten der Portfolio-Komponente:
 *  – Filter nach Kategorie (Zustand steht in der URL: ?kategorie=sport)
 *  – Desktop: stumme Vorschau beim Überfahren mit der Maus oder Tastaturfokus
 *  – Handy/Tablet: die Kachel in der Bildschirmmitte spielt ihre Vorschau, sobald gescrollt wird
 *  – Vorschauclips werden nie beim Seitenaufruf geladen, sondern erst bei Bedarf
 *  – Keine Vorschauen bei "Bewegung reduzieren" oder aktivem Datensparmodus
 */

type Conn = { saveData?: boolean; effectiveType?: string };
const conn = (navigator as Navigator & { connection?: Conn }).connection;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

export const previewsErlaubt = () =>
  !reduceMotion.matches && !conn?.saveData && !/(^|-)2g$/.test(conn?.effectiveType ?? '');

/* ---------- Vorschau-Video einer Kachel ---------- */

const aktiv = new Set<HTMLElement>();

function videoFuer(card: HTMLElement): HTMLVideoElement | null {
  const link = card.querySelector<HTMLAnchorElement>('[data-preview]');
  const src = link?.dataset.preview;
  if (!src) return null;
  let v = card.querySelector('video');
  if (v) return v;

  v = document.createElement('video');
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('aria-hidden', 'true');
  v.setAttribute('tabindex', '-1');
  v.disablePictureInPicture = true;

  let bufferTimer = 0;
  v.addEventListener('waiting', () => {
    clearTimeout(bufferTimer);
    bufferTimer = window.setTimeout(() => card.classList.add('is-buffering'), 250);
  });
  v.addEventListener('playing', () => {
    clearTimeout(bufferTimer);
    card.classList.remove('is-buffering');
    if (aktiv.has(card)) card.classList.add('is-playing');
  });
  v.src = src;
  card.querySelector('.card__media')!.appendChild(v);
  return v;
}

function start(card: HTMLElement) {
  if (!previewsErlaubt()) return;
  const v = videoFuer(card);
  if (!v) return;
  aktiv.add(card);
  card.classList.add('is-buffering');
  v.play().catch(() => card.classList.remove('is-buffering'));
}

function stop(card: HTMLElement) {
  aktiv.delete(card);
  card.classList.remove('is-playing', 'is-buffering');
  const v = card.querySelector('video');
  if (!v) return;
  v.pause();
  // Nach dem Ausblenden an den Anfang zurück, damit die Vorschau beim nächsten Mal von vorn beginnt
  window.setTimeout(() => !aktiv.has(card) && (v.currentTime = 0), 450);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) [...aktiv].forEach(stop);
});

/* ---------- Initialisierung pro Portfolio ---------- */

export function initPortfolio(root: HTMLElement) {
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];

  // Ladeanimation: Kachel einblenden, sobald das Standbild da ist
  for (const card of cards) {
    const img = card.querySelector('img');
    if (!img || img.complete) card.classList.add('is-loaded');
    else img.addEventListener('load', () => card.classList.add('is-loaded'), { once: true });
  }

  initFilter(root, cards);

  if (finePointer.matches) initHover(cards);
  else initScrollPreview(cards);
}

/* Desktop: Maus und Tastatur */
function initHover(cards: HTMLElement[]) {
  for (const card of cards) {
    const link = card.querySelector<HTMLElement>('.card__link');
    if (!link?.dataset.preview) continue;
    let timer = 0;
    // Kurze Verzögerung: wer nur mit der Maus darüberfährt, löst keinen Download aus
    link.addEventListener('pointerenter', () => (timer = window.setTimeout(() => start(card), 140)));
    link.addEventListener('pointerleave', () => (clearTimeout(timer), stop(card)));
    link.addEventListener('focus', () => link.matches(':focus-visible') && start(card));
    link.addEventListener('blur', () => stop(card));
  }
}

/* Touch: Die Kachel in der Mitte des Bildschirms spielt, immer nur eine */
function initScrollPreview(cards: HTMLElement[]) {
  const mitVorschau = cards.filter((c) => c.querySelector<HTMLElement>('[data-preview]')?.dataset.preview);
  if (!mitVorschau.length) return;

  const imBand = new Set<HTMLElement>();
  const auswerten = () => {
    // Von mehreren Kandidaten gewinnt die Kachel, deren Mitte der Bildschirmmitte am nächsten ist
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    const mitte = innerHeight / 2;
    for (const c of imBand) {
      if (c.hidden) continue;
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mitte);
      if (d < bestDist) (bestDist = d), (best = c);
    }
    for (const c of [...aktiv]) if (c !== best) stop(c);
    if (best && !aktiv.has(best)) start(best);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? imBand.add(e.target as HTMLElement) : imBand.delete(e.target as HTMLElement);
      auswerten();
    },
    // Nur ein schmales Band in der Bildschirmmitte zählt
    { rootMargin: '-40% 0px -40% 0px' },
  );

  // Erst nach der ersten Scrollbewegung beginnen: beim Seitenaufruf wird kein Video geladen
  const los = () => {
    removeEventListener('scroll', los);
    mitVorschau.forEach((c) => io.observe(c));
  };
  addEventListener('scroll', los, { passive: true, once: true });
}

/* Filter */
function initFilter(root: HTMLElement, cards: HTMLElement[]) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  if (!buttons.length) return;
  const count = root.querySelector<HTMLElement>('[data-count]');

  const anwenden = (kat: string, animieren = true) => {
    if (!buttons.some((b) => b.dataset.filter === kat)) kat = 'alle';
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === kat)));
    let n = 0;
    for (const c of cards) {
      const passt = kat === 'alle' || c.dataset.kategorien!.split(' ').includes(kat);
      const warVersteckt = c.hidden;
      c.hidden = !passt;
      if (passt) {
        n++;
        if (animieren && warVersteckt !== c.hidden) {
          c.classList.remove('is-entering');
          void c.offsetWidth;
          c.classList.add('is-entering');
        }
      } else stop(c);
    }
    // Große Akzentkacheln nur in der Gesamtansicht, gefiltert bleibt das Raster ruhig
    root.classList.toggle('is-filtered', kat !== 'alle');
    if (count) count.textContent = n === 1 ? count.dataset.eins! : count.dataset.viele!.replace('99', String(n));

    const url = new URL(location.href);
    kat === 'alle' ? url.searchParams.delete('kategorie') : url.searchParams.set('kategorie', kat);
    history.replaceState(history.state, '', url);
  };

  buttons.forEach((b) => b.addEventListener('click', () => anwenden(b.dataset.filter!)));
  const start = new URLSearchParams(location.search).get('kategorie');
  if (start) anwenden(start, false);
}
