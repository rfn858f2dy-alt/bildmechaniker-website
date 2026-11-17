// Video-Lightbox: lädt den Film erst beim Öffnen, gibt ihn beim Schließen wieder frei.
const dlg = document.querySelector<HTMLDialogElement>('[data-lb]');

if (dlg) {
  const stage = dlg.querySelector<HTMLElement>('[data-lb-stage]')!;
  const status = dlg.querySelector<HTMLElement>('[data-lb-status]')!;

  const leeren = () => {
    const v = stage.querySelector('video');
    if (v) {
      v.pause();
      v.removeAttribute('src');
      v.load(); // bricht einen laufenden Download ab
    }
    stage.replaceChildren();
    dlg.classList.remove('is-ready', 'is-hochkant');
  };

  const bereit = () => {
    dlg.classList.add('is-ready');
    status.textContent = '';
  };

  const youtube = (id: string, title: string) => {
    const box = document.createElement('div');
    box.className = 'lb__consent';
    const p = document.createElement('p');
    p.textContent = dlg.dataset.ytHinweis!;
    const b = document.createElement('button');
    b.className = 'btn btn--primary';
    b.type = 'button';
    b.textContent = dlg.dataset.ytLaden!;
    b.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
      f.title = title;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.addEventListener('load', bereit, { once: true });
      stage.replaceChildren(f);
      dlg.classList.remove('is-ready');
      f.focus();
    });
    box.append(p, b);
    stage.replaceChildren(box);
    dlg.classList.add('is-ready');
    b.focus();
  };

  const datei = (el: HTMLElement) => {
    const v = document.createElement('video');
    const mobil = el.dataset.videoSrcMobil && matchMedia('(max-width: 900px)').matches;
    v.src = (mobil ? el.dataset.videoSrcMobil : el.dataset.videoSrc)!;
    if (el.dataset.poster) v.poster = el.dataset.poster;
    v.controls = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('aria-label', el.dataset.title ?? 'Video');
    v.addEventListener('loadeddata', bereit, { once: true });
    v.addEventListener('ended', () => dlg.close());
    stage.replaceChildren(v);
    v.play().catch(() => {
      /* Autoplay blockiert: Nutzer startet über die Steuerung */
      bereit();
    });
    v.focus();
  };

  document.addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-lightbox]');
    if (!el) return;
    e.preventDefault();
    leeren();
    status.textContent = status.dataset.text ?? '';
    dlg.setAttribute('aria-label', el.dataset.title ?? 'Video');
    dlg.classList.toggle('is-hochkant', el.dataset.format === '9:16');
    dlg.showModal();
    if (el.dataset.youtube) youtube(el.dataset.youtube, el.dataset.title ?? 'Video');
    else datei(el);
  });

  dlg.querySelector('[data-lb-close]')!.addEventListener('click', () => dlg.close());
  // Klick neben das Video schließt
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  dlg.addEventListener('close', leeren);
}
