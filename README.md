# Bildmechaniker – Website

Zweisprachige Portfolio-Website (DE/EN) der Bildmechaniker GmbH. Gebaut mit [Astro](https://astro.build) als
statische Seite, die per SFTP auf den Host-Europe-Webspace geladen wird. Keine Cookies, kein Tracking.

## Starten

```bash
npm install
npm run dev        # Vorschau unter http://localhost:4321
npm run build      # fertige Seite in dist/ (diesen Ordner hochladen)
```

Für die Medien-Befehle wird `ffmpeg` benötigt.

## Neues Projekt hinzufügen

**1. Medien erzeugen und Textdatei anlegen (ein Befehl):**

```bash
npm run projekt:neu -- --slug baller-league --clip rohmaterial/baller.mov --start 12 \
  --titel "Baller League" --auftraggeber "Baller League" --kategorie sport --rolle "Mobile Kamera"
```

Das erzeugt automatisch:

| Datei | Zweck | Größe |
|---|---|---|
| `src/assets/projekte/<slug>/poster.jpg` | Standbild, beim Build zu AVIF/WebP in 5 Breiten | – |
| `public/media/projekte/<slug>/vorschau.mp4` | stumme 6-s-Vorschau für die Kachel, 640 px | ca. 0,3–0,7 MB |
| `public/media/projekte/<slug>/film-1080.mp4` / `film-720.mp4` | nur mit `--film`: der Film für die Lightbox | – |
| `src/content/projekte/<slug>.md` | Texte und Angaben | – |

**2. Texte in `src/content/projekte/<slug>.md` ausfüllen.** Alle Felder sind dort kommentiert, die
vollständige Beschreibung steht in `src/content.config.ts`. Die wichtigsten:

```yaml
titel:        { de: …, en: … }
kurz:         { de: …, en: … }      # ein Satz
beschreibung: { de: …, en: … }      # Absätze mit Leerzeile trennen
jahr: 2025                          # optional
auftraggeber: Prime Video
rolle:        { de: [Mobile Kamera], en: [Mobile camera] }
kategorien:   [sport]               # sport | motorsport | tv | kunst | social
highlight: true                     # auf der Startseite zeigen
reihenfolge: 1                      # kleiner = weiter vorn
entwurf: true                       # noch nicht veröffentlichen
```

Ein Set-Foto für die Galerie in `src/assets/projekte/<slug>/` legen und unter `galerie:` eintragen.
Fertig – Kachel, Filter, Detailseite (DE und EN), Navigation und Suchmaschinen-Daten entstehen automatisch.

## Showreel / Hero-Loop austauschen

```bash
npm run showreel -- --loop rohmaterial/bts-schnitt.mov --start 3 --dauer 12   # stummer Hintergrund-Loop
npm run showreel -- --film rohmaterial/showreel.mov                         # Showreel mit Ton (Lightbox)
```

Ohne fertiges Showreel in `src/data/showreel.ts` `film: undefined` setzen – dann entfällt der Button.

## Platzhalter

`npm run platzhalter` erzeugt abstrakte Platzhalter-Clips für alle Beispielprojekte. Sie werden durch echtes
Behind-the-Scenes-Material ersetzt, indem `projekt:neu` mit demselben `--slug` ausgeführt wird.

## Wie die Seite schnell bleibt

- **Kein Video beim Seitenaufruf.** Sichtbar ist zuerst nur das optimierte Standbild.
- **Hero-Loop** lädt erst, wenn die Seite fertig ist und der Browser Leerlauf hat; mobil in 720p.
- **Kachel-Vorschauen** werden erst beim Überfahren mit der Maus (nach 140 ms) bzw. auf dem Handy nach
  dem ersten Scrollen für die Kachel in Bildschirmmitte geladen – immer nur eine gleichzeitig.
- **Filme** laden erst beim Öffnen der Lightbox und werden beim Schließen freigegeben.
- Kein Autoplay bei „Bewegung reduzieren“, aktivem Datensparmodus oder 2G-Verbindung.
- Bilder: AVIF/WebP, responsive Größen, Lazy Loading unterhalb des sichtbaren Bereichs.

## Struktur

```
src/
  components/portfolio/   ProjectGrid (Raster + Filter), ProjectCard, VideoLightbox
  components/             Showreel, Header, Footer
  content/projekte/       ein .md pro Projekt
  data/showreel.ts        Pfade des Showreels
  i18n/ui.ts              alle Texte der Oberfläche, DE/EN, übersetzte Pfade
  scripts/                portfolio.ts (Vorschau & Filter), lightbox.ts, reveal.ts
  views/                  Seitenvorlagen, die DE und EN gemeinsam nutzen
scripts/                  Medien-Befehle (ffmpeg)
public/.htaccess          HTTPS, Sprachweiche, Caching für Host Europe
```

## Anfrageformular (`/de/kontakt/`, `/en/contact/`)

Mehrstufiges Formular (Projekt → Details → Kontakt → Prüfen & Absenden). Der Versand läuft über
`public/api/anfrage.php` auf dem Host-Europe-Webspace (PHP 8.1 oder neuer).

**Einrichtung vor dem Livegang:**

1. Im Host-Europe-KIS ein Postfach `anfrage@bildmechaniker.de` anlegen (oder ein vorhandenes nutzen).
2. `public/api/config.sample.php` als `config.php` kopieren und SMTP-Zugang, Empfänger und einen
   Zufallswert für `geheimnis` eintragen (`php -r "echo bin2hex(random_bytes(32));"`).
3. `config.php` wird nicht ins Repository übernommen. Nach dem Build per SFTP nach `/api/` hochladen.
4. Einmal eine Testanfrage senden.

**Optionen ändern:** Projektarten, Leistungen, Budgetrahmen, Upload-Grenzen und Spamschutz-Werte stehen in
`public/api/optionen.json`, die Formular und Server gemeinsam nutzen. Texte stehen in `src/i18n/anfrage.ts`.

**Was passiert beim Absenden:**

- Prüfung im Browser (sofortiges Feedback) und noch einmal auf dem Server.
- Spamschutz ohne Drittanbieter: unsichtbares Honigtopf-Feld, signiertes Token mit Mindestbearbeitungszeit
  (5 s) und Ablauf (3 h), höchstens 5 Anfragen pro Stunde und IP (nur als gehashter Wert, 1 h gespeichert),
  höchstens drei Links in der Beschreibung.
- Uploads: bis 5 Dateien, je 10 MB, zusammen 20 MB; Endung *und* tatsächlicher Dateityp werden geprüft.
- Mail an Bildmechaniker mit allen Angaben und Anhängen, „Antworten“ geht direkt an den Interessenten.
- Eingangsbestätigung an den Interessenten mit Referenznummer und dem deutlichen Hinweis, dass dies noch keine
  Buchung ist. Sie enthält bewusst keinen Freitext aus dem Formular, damit niemand das Formular nutzen kann,
  um Dritten Nachrichten zu schicken.
- Nichts wird dauerhaft auf dem Server gespeichert.
