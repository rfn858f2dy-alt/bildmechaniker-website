/**
 * Mehrstufiges Anfrageformular: Schritte, Plausibilitätsprüfung, Datei-Upload, Zusammenfassung, Versand.
 * Der Server (public/api/anfrage.php) prüft alles noch einmal – die Prüfung hier dient nur dem Komfort.
 */

type Texte = Record<string, string>;
type Grenzen = {
  maxDateien: number; maxMB: number; maxGesamtMB: number; endungen: string[];
  beschreibungMin: number; beschreibungMax: number;
};

const API = '/api/anfrage.php';
const SCHRITTE = 4;
/** Welche Felder gehören zu welchem Schritt (für Prüfung und Rücksprung bei Serverfehlern). */
const FELDER: Record<string, number> = {
  projektart: 1, leistungen: 1,
  beschreibung: 2, von: 2, bis: 2, ort: 2, budget: 2, unterlagen: 2,
  name: 3, firma: 3, email: 3, telefon: 3,
  datenschutz: 4,
};

export function initAnfrage(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-form]')!;
  const T: Texte = JSON.parse(root.dataset.texte!);
  const G: Grenzen = JSON.parse(root.dataset.grenzen!);
  const $ = <E extends Element = HTMLElement>(s: string) => form.querySelector<E>(s)!;
  const $$ = <E extends Element = HTMLElement>(s: string) => [...form.querySelectorAll<E>(s)];
  const feld = (name: string) => form.elements.namedItem(name) as HTMLInputElement | RadioNodeList | null;

  form.hidden = false;
  let schritt = 1;
  let dateien: File[] = [];
  const heute = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  /* ---------- Token für den Spamschutz ---------- */
  const tokenFeld = $<HTMLInputElement>('[data-token]');
  const holeToken = () =>
    fetch(`${API}?token`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => (tokenFeld.value = d.token ?? ''))
      .catch(() => {});
  holeToken();

  /* ---------- Bezug von einer Projektseite (?projekt=…) ---------- */
  const bezug = new URLSearchParams(location.search).get('projekt');
  if (bezug) {
    $<HTMLInputElement>('[data-bezug]').value = bezug.slice(0, 160);
    const anz = $('[data-bezug-anzeige]');
    anz.querySelector('strong')!.textContent = bezug.slice(0, 160);
    anz.hidden = false;
  }

  /* ---------- Kleinigkeiten ---------- */
  const von = $<HTMLInputElement>('#f-von');
  const bis = $<HTMLInputElement>('#f-bis');
  const offen = $<HTMLInputElement>('[data-offen]');
  von.min = bis.min = heute;
  von.addEventListener('change', () => (bis.min = von.value || heute));
  offen.addEventListener('change', () => {
    von.disabled = bis.disabled = offen.checked;
    if (offen.checked) setzeFehler('von', ''), setzeFehler('bis', '');
  });

  const beschr = $<HTMLTextAreaElement>('#f-beschreibung');
  const zaehler = $('[data-zaehler]');
  const zaehle = () => (zaehler.textContent = `${beschr.value.length} / ${G.beschreibungMax}`);
  beschr.addEventListener('input', zaehle);

  /* ---------- Prüfregeln ---------- */
  const wert = (n: string) => {
    const f = feld(n);
    return f ? String((f as HTMLInputElement).value ?? '').trim() : '';
  };
  const regeln: Record<string, () => string> = {
    projektart: () => (wert('projektart') ? '' : T.projektart),
    leistungen: () => ($$<HTMLInputElement>('[name="leistungen[]"]:checked').length ? '' : T.leistungen),
    beschreibung: () => (wert('beschreibung').length >= G.beschreibungMin ? '' : T.beschreibung),
    von: () => (offen.checked ? '' : !von.value ? T.von : von.value < heute ? T.vonVergangen : ''),
    bis: () => (offen.checked || !bis.value ? '' : von.value && bis.value < von.value ? T.bis : ''),
    ort: () => (wert('ort').length >= 2 ? '' : T.ort),
    budget: () => (wert('budget') ? '' : T.budget),
    unterlagen: () => pruefeDateien(dateien),
    name: () => (wert('name').length >= 2 ? '' : T.name),
    email: () => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(wert('email')) ? '' : T.email),
    telefon: () => (!wert('telefon') || /^\+?[0-9 ()/\-.]{6,30}$/.test(wert('telefon')) ? '' : T.telefon),
    datenschutz: () => ($<HTMLInputElement>('[name="datenschutz"]').checked ? '' : T.datenschutz),
  };

  function setzeFehler(name: string, msg: string) {
    const p = form.querySelector<HTMLElement>(`#fehler-${name}`);
    const box = form.querySelector<HTMLElement>(`[data-feld="${name}"]`);
    if (p) {
      p.textContent = msg;
      p.hidden = !msg;
    }
    // aria-invalid am Eingabefeld bzw. an der Gruppe
    const ziel = box?.matches('fieldset') ? box : box?.querySelector('input:not([type=hidden]),textarea') ?? box;
    if (ziel) msg ? ziel.setAttribute('aria-invalid', 'true') : ziel.removeAttribute('aria-invalid');
  }

  const fehlerbox = $('[data-fehlerbox]');
  function zeigeFehlerliste(fehler: [string, string][]) {
    const ul = fehlerbox.querySelector('ul')!;
    ul.replaceChildren(
      ...fehler.map(([n, m]) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${zielId(n)}`;
        a.textContent = m;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          fokussiere(n);
        });
        li.append(a);
        return li;
      }),
    );
    fehlerbox.hidden = !fehler.length;
    if (fehler.length) fehlerbox.focus();
  }
  const zielId = (n: string) => {
    const box = form.querySelector(`[data-feld="${n}"]`);
    const el = box?.querySelector<HTMLElement>('input:not([type=hidden]):not(:disabled),textarea');
    return el?.id || box?.id || '';
  };
  function fokussiere(n: string) {
    const box = form.querySelector(`[data-feld="${n}"]`);
    const el = box?.querySelector<HTMLElement>('input:not([type=hidden]):not(:disabled),textarea');
    (el ?? (box as HTMLElement))?.focus();
    box?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function pruefeSchritt(n: number, anzeigen = true): boolean {
    const fehler: [string, string][] = [];
    for (const [name, s] of Object.entries(FELDER)) {
      if (s !== n || !regeln[name]) continue;
      const m = regeln[name]();
      setzeFehler(name, m);
      if (m) fehler.push([name, m]);
    }
    if (anzeigen) zeigeFehlerliste(fehler);
    return !fehler.length;
  }

  // Sofortiges Feedback: Fehler verschwinden, sobald sie behoben sind
  form.addEventListener('input', (e) => live(e.target as HTMLInputElement));
  form.addEventListener('change', (e) => live(e.target as HTMLInputElement));
  function live(el: HTMLInputElement) {
    const n = el.name?.replace('[]', '');
    if (!n || !regeln[n]) return;
    const p = form.querySelector<HTMLElement>(`#fehler-${n}`);
    if (p && !p.hidden && !regeln[n]()) setzeFehler(n, '');
  }
  // Beim Verlassen eines Textfeldes prüfen (nicht während des Tippens)
  form.addEventListener('focusout', (e) => {
    const el = e.target as HTMLInputElement;
    const n = el.name;
    if (['email', 'telefon', 'name', 'ort'].includes(n) && el.value) setzeFehler(n, regeln[n]());
  });

  /* ---------- Schritte ---------- */
  const zurueck = $<HTMLButtonElement>('[data-zurueck]');
  const weiter = $<HTMLButtonElement>('[data-weiter]');
  const senden = $<HTMLButtonElement>('[data-senden]');
  const status = $('[data-status]');
  const schrittzahl = $('[data-schrittzahl]');
  const namen = $$('[data-anzeige] .name').map((e) => e.textContent ?? '');

  function gehe(n: number, fokus = true) {
    schritt = n;
    $$('[data-schritt]').forEach((s) => (s.hidden = Number(s.dataset.schritt) !== n));
    $$('[data-anzeige]').forEach((li) => {
      const i = Number(li.dataset.anzeige);
      li.toggleAttribute('aria-current', i === n);
      if (i === n) li.setAttribute('aria-current', 'step');
      li.classList.toggle('erledigt', i < n);
    });
    zurueck.hidden = n === 1;
    weiter.hidden = n === SCHRITTE;
    senden.hidden = n !== SCHRITTE;
    const txt = T.schrittVon.replace('99', String(n)).replace('98', String(SCHRITTE));
    schrittzahl.textContent = txt;
    status.textContent = `${txt}: ${namen[n - 1]}`;
    fehlerbox.hidden = true;
    if (n === SCHRITTE) zusammenfassen();
    if (fokus) {
      root.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const erstes = form.querySelector<HTMLElement>(`[data-schritt="${n}"] .schritt__titel, [data-schritt="${n}"] input:not([type=hidden]):not(.visually-hidden), [data-schritt="${n}"] textarea`);
      erstes?.focus({ preventScroll: true });
    }
  }
  weiter.addEventListener('click', () => pruefeSchritt(schritt) && gehe(schritt + 1));
  zurueck.addEventListener('click', () => gehe(schritt - 1));
  // Enter in einem Textfeld führt zum nächsten Schritt statt das Formular abzusenden
  form.addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement;
    if (e.key === 'Enter' && el.tagName === 'INPUT' && schritt < SCHRITTE) {
      e.preventDefault();
      weiter.click();
    }
  });
  $('[data-schritt="4"] .schritt__titel').tabIndex = -1;

  /* ---------- Dateien ---------- */
  const input = $<HTMLInputElement>('#f-unterlagen');
  const zone = $('[data-dropzone]');
  const liste = $('[data-dateien]');
  const mb = (b: number) => {
    const n = new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 1 });
    return b < 1048576 ? `${n.format(Math.max(1, Math.round(b / 1024)))} KB` : `${n.format(b / 1048576)} MB`;
  };

  function pruefeDateien(fs: File[]): string {
    if (fs.length > G.maxDateien) return T.dateiAnzahl;
    let summe = 0;
    for (const f of fs) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (!G.endungen.includes(ext)) return T.dateiTyp.replace('{n}', f.name);
      if (f.size > G.maxMB * 1048576) return T.dateiGross.replace('{n}', f.name);
      summe += f.size;
    }
    return summe > G.maxGesamtMB * 1048576 ? T.dateiGesamt : '';
  }
  function hinzufuegen(neu: FileList | File[]) {
    for (const f of neu) if (!dateien.some((d) => d.name === f.name && d.size === f.size)) dateien.push(f);
    zeichneDateien();
    setzeFehler('unterlagen', pruefeDateien(dateien));
  }
  function zeichneDateien() {
    liste.replaceChildren(
      ...dateien.map((f, i) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="dname"></span><span class="dgroesse"></span><button type="button"></button>';
        li.querySelector('.dname')!.textContent = f.name;
        li.querySelector('.dgroesse')!.textContent = mb(f.size);
        const b = li.querySelector('button')!;
        b.textContent = T.entfernen;
        b.setAttribute('aria-label', `${f.name} ${T.entfernen}`);
        b.addEventListener('click', () => {
          dateien.splice(i, 1);
          zeichneDateien();
          setzeFehler('unterlagen', pruefeDateien(dateien));
          input.focus();
        });
        return li;
      }),
    );
  }
  input.addEventListener('change', () => {
    if (input.files) hinzufuegen(input.files);
    input.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.add('ist-drueber');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('ist-drueber')));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files.length) hinzufuegen(e.dataTransfer.files);
  });
  zone.addEventListener('click', (e) => {
    if (e.target === input || (e.target as HTMLElement).closest('label')) return;
    input.click();
  });

  /* ---------- Zusammenfassung ---------- */
  const dl = $('[data-zusammenfassung]');
  const labels: Record<string, [string, number]> = JSON.parse(dl.dataset.labels!);
  const optText = (name: string) =>
    $$<HTMLInputElement>(`[name="${name}"]:checked`).map((i) => i.nextElementSibling?.textContent?.trim() ?? i.value);
  const datum = (d: string) => (d ? new Date(d + 'T12:00').toLocaleDateString(document.documentElement.lang) : '');

  function zusammenfassen() {
    const werte: Record<string, string> = {
      projektart: optText('projektart').join(', '),
      leistungen: optText('leistungen[]').join(', '),
      beschreibung: wert('beschreibung'),
      zeitraum: offen.checked ? T.offen : [datum(von.value), datum(bis.value)].filter(Boolean).join(' – '),
      ort: wert('ort'),
      budget: optText('budget').join(''),
      unterlagen: dateien.map((f) => f.name).join(', '),
      name: wert('name'),
      firma: wert('firma'),
      email: wert('email'),
      telefon: wert('telefon'),
    };
    dl.replaceChildren(
      ...Object.entries(labels).map(([k, [label, s]]) => {
        const div = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        const b = document.createElement('button');
        dt.textContent = label;
        dd.textContent = werte[k] || T.keineAngabe;
        b.type = 'button';
        b.textContent = dl.dataset.aendern!;
        b.setAttribute('aria-label', `${label}: ${dl.dataset.aendern}`);
        b.addEventListener('click', () => {
          gehe(s);
          fokussiere(k === 'zeitraum' ? 'von' : k);
        });
        div.append(dt, dd, b);
        return div;
      }),
    );
  }

  /* ---------- Absenden ---------- */
  const upload = $('[data-upload]');
  const balken = upload.querySelector('span')!;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (senden.getAttribute('aria-busy') === 'true') return;
    // Alle Schritte prüfen; beim ersten fehlerhaften Schritt stehen bleiben
    for (let n = 1; n <= SCHRITTE; n++) {
      if (!pruefeSchritt(n, false)) {
        gehe(n);
        pruefeSchritt(n);
        return;
      }
    }
    const daten = new FormData(form);
    daten.delete('unterlagen[]');
    dateien.forEach((f) => daten.append('unterlagen[]', f, f.name));

    senden.setAttribute('aria-busy', 'true');
    senden.textContent = T.sendet;
    zurueck.disabled = true;
    const mitDateien = dateien.length > 0;
    upload.hidden = !mitDateien;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API);
    xhr.responseType = 'json';
    xhr.upload.addEventListener('progress', (ev) => {
      if (!ev.lengthComputable || !mitDateien) return;
      const p = Math.round((ev.loaded / ev.total) * 100);
      balken.style.width = p + '%';
      status.textContent = T.hochladen.replace('99', String(p));
    });
    xhr.addEventListener('load', () => fertig(xhr.status, xhr.response));
    xhr.addEventListener('error', () => fertig(0, null));
    xhr.send(daten);
  });

  function fertig(code: number, res: any) {
    senden.removeAttribute('aria-busy');
    senden.textContent = T.senden;
    zurueck.disabled = false;
    upload.hidden = true;
    balken.style.width = '0';

    if (code === 200 && res?.ok) return erfolg(res);

    if (res?.felder) {
      const eintraege = Object.entries(res.felder as Record<string, string>);
      eintraege.forEach(([n, m]) => setzeFehler(n, m));
      const ersterSchritt = Math.min(...eintraege.map(([n]) => FELDER[n] ?? SCHRITTE));
      gehe(ersterSchritt, false);
      zeigeFehlerliste(eintraege.filter(([n]) => (FELDER[n] ?? SCHRITTE) === ersterSchritt));
      return;
    }
    // Abgelaufenes Token: neu holen, Nutzer kann direkt erneut senden
    if (res?.fehler === 'abgelaufen' || res?.fehler === 'spam') holeToken();
    zeigeFehlerliste([['datenschutz', res?.meldung ?? T.netz]]);
  }

  function erfolg(res: { ref: string; bestaetigung?: boolean }) {
    const box = root.querySelector<HTMLElement>('[data-erfolg]')!;
    box.querySelector('[data-ref]')!.textContent = res.ref;
    const p = box.querySelector<HTMLElement>('[data-erfolg-text]')!;
    p.textContent = res.bestaetigung === false ? p.dataset.ohneMail! : p.dataset.ok!;
    form.hidden = true;
    form.reset();
    dateien = [];
    box.hidden = false;
    box.scrollIntoView({ block: 'start' });
    box.focus();
  }

  gehe(1, false);
  zaehle();
}
