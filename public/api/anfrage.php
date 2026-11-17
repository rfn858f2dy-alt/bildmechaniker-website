<?php
/**
 * Anfrageformular der Bildmechaniker GmbH
 *
 *   GET  anfrage.php?token  → signiertes Formular-Token (Spamschutz)
 *   POST anfrage.php        → Anfrage prüfen, Mail an Bildmechaniker + Eingangsbestätigung an Absender
 *
 * Datenschutz: Anfragen und Anhänge werden nicht auf dem Server gespeichert, sondern nur per Mail
 * zugestellt. Für den Spamschutz wird pro Anfrage ein gehashter, gesalzener IP-Wert höchstens eine Stunde gehalten.
 */
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$cfgDatei = __DIR__ . '/config.php';
if (!is_file($cfgDatei)) antwort(500, ['ok' => false, 'fehler' => 'konfiguration']);
$cfg = require $cfgDatei;
$opt = json_decode((string) file_get_contents(__DIR__ . '/optionen.json'), true);
$DATEN = __DIR__ . '/daten';

/* ------------------------------------------------------------------ Token */

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['token'])) {
    $t = (string) time();
    antwort(200, ['token' => $t . '.' . signatur($t, $cfg)]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') antwort(405, ['ok' => false]);

$lang = ($_POST['lang'] ?? 'de') === 'en' ? 'en' : 'de';
$T = texte($lang);

// Zu große Uploads: PHP verwirft dann $_POST komplett
if (empty($_POST) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    antwort(413, ['ok' => false, 'fehler' => 'zu_gross', 'meldung' => $T['zu_gross']]);
}

/* ------------------------------------------------------------- Spamschutz */

// 1. Honigtopf: unsichtbares Feld, das nur Bots ausfüllen → still "erfolgreich" beenden
if (trim((string) ($_POST['website'] ?? '')) !== '') antwort(200, ['ok' => true, 'ref' => referenz()]);

// 2. Signiertes Token: Formular muss mindestens n Sekunden offen gewesen sein und darf nicht zu alt sein
[$ts, $sig] = array_pad(explode('.', (string) ($_POST['token'] ?? ''), 2), 2, '');
$alter = time() - (int) $ts;
if (!ctype_digit($ts) || !hash_equals(signatur($ts, $cfg), $sig)) spam($T, 'token');
if ($alter < $opt['grenzen']['mindestSekunden']) spam($T, 'zu_schnell');
if ($alter > $opt['grenzen']['tokenStunden'] * 3600) antwort(400, ['ok' => false, 'fehler' => 'abgelaufen', 'meldung' => $T['abgelaufen']]);


/* ---------------------------------------------------------------- Prüfung */

$f = [];
$e = [];
$txt = fn(string $k, int $max) => trim(mb_substr(str_replace("\0", '', (string) ($_POST[$k] ?? '')), 0, $max));

$f['name']        = $txt('name', 120);
$f['firma']       = $txt('firma', 160);
$f['email']       = $txt('email', 200);
$f['telefon']     = $txt('telefon', 40);
$f['projektart']  = $txt('projektart', 40);
$f['leistungen']  = array_values(array_intersect(array_keys($opt['leistungen']), (array) ($_POST['leistungen'] ?? [])));
$f['beschreibung'] = $txt('beschreibung', $opt['grenzen']['beschreibungMax']);
$f['zeitraum_offen'] = isset($_POST['zeitraum_offen']);
$f['von']         = $txt('von', 10);
$f['bis']         = $txt('bis', 10);
$f['ort']         = $txt('ort', 160);
$f['budget']      = $txt('budget', 40);
$f['bezug']       = $txt('bezug', 160);

if (mb_strlen($f['name']) < 2) $e['name'] = $T['e_name'];
if (!filter_var($f['email'], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $f['email'])) $e['email'] = $T['e_email'];
if ($f['telefon'] !== '' && !preg_match('/^\+?[0-9 ()\/\-.]{6,30}$/', $f['telefon'])) $e['telefon'] = $T['e_telefon'];
if (!isset($opt['projektarten'][$f['projektart']])) $e['projektart'] = $T['e_projektart'];
if (!$f['leistungen']) $e['leistungen'] = $T['e_leistungen'];
if (mb_strlen($f['beschreibung']) < $opt['grenzen']['beschreibungMin']) $e['beschreibung'] = $T['e_beschreibung'];
if (preg_match_all('~https?://|www\.~i', $f['beschreibung']) > 3) $e['beschreibung'] = $T['e_links'];
if (!$f['zeitraum_offen']) {
    $heute = date('Y-m-d');
    if (!datum($f['von'])) $e['von'] = $T['e_von'];
    elseif ($f['von'] < $heute) $e['von'] = $T['e_vergangen'];
    if ($f['bis'] !== '' && (!datum($f['bis']) || $f['bis'] < $f['von'])) $e['bis'] = $T['e_bis'];
} else {
    $f['von'] = $f['bis'] = '';
}
if (mb_strlen($f['ort']) < 2) $e['ort'] = $T['e_ort'];
if (!isset($opt['budget'][$f['budget']])) $e['budget'] = $T['e_budget'];
if (($_POST['datenschutz'] ?? '') !== 'ja') $e['datenschutz'] = $T['e_datenschutz'];

// Anhänge
$anhaenge = [];
$dateien = normalisiereUploads($_FILES['unterlagen'] ?? null);
$up = $opt['upload'];
$mime = [
    'pdf' => ['application/pdf'], 'txt' => ['text/plain'],
    'doc' => ['application/msword', 'application/vnd.ms-office', 'application/octet-stream'],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    'xls' => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/octet-stream'],
    'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
    'ppt' => ['application/vnd.ms-powerpoint', 'application/vnd.ms-office', 'application/octet-stream'],
    'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'application/octet-stream'],
    'odt' => ['application/vnd.oasis.opendocument.text', 'application/zip'],
    'key' => ['application/zip', 'application/x-iwork-keynote-sffkey', 'application/octet-stream'],
    'pages' => ['application/zip', 'application/x-iwork-pages-sffpages', 'application/octet-stream'],
    'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png'], 'webp' => ['image/webp'],
    'heic' => ['image/heic', 'image/heif', 'application/octet-stream'],
    'zip' => ['application/zip', 'application/x-zip-compressed'],
];
if (count($dateien) > $up['maxDateien']) $e['unterlagen'] = sprintf($T['e_anzahl'], $up['maxDateien']);
$gesamt = 0;
$fi = new finfo(FILEINFO_MIME_TYPE);
foreach ($dateien as $d) {
    if ($d['error'] === UPLOAD_ERR_NO_FILE) continue;
    if ($d['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($d['tmp_name'])) { $e['unterlagen'] = $T['e_upload']; break; }
    $ext = strtolower(pathinfo($d['name'], PATHINFO_EXTENSION));
    $typ = $fi->file($d['tmp_name']) ?: '';
    if (!in_array($ext, $up['endungen'], true) || !in_array($typ, $mime[$ext] ?? [], true)) {
        $e['unterlagen'] = sprintf($T['e_typ'], $d['name']); break;
    }
    if ($d['size'] > $up['maxMB'] * 1048576) { $e['unterlagen'] = sprintf($T['e_groesse'], $d['name'], $up['maxMB']); break; }
    $gesamt += $d['size'];
    $sauber = preg_replace('/[^A-Za-z0-9._-]+/', '_', pathinfo($d['name'], PATHINFO_FILENAME));
    $anhaenge[] = ['pfad' => $d['tmp_name'], 'name' => mb_substr($sauber ?: 'datei', 0, 60) . '.' . $ext, 'groesse' => $d['size']];
}
if ($gesamt > $up['maxGesamtMB'] * 1048576) $e['unterlagen'] = sprintf($T['e_gesamt'], $up['maxGesamtMB']);

if ($e) antwort(422, ['ok' => false, 'fehler' => 'pruefung', 'felder' => $e]);

// 3. Ratenbegrenzung pro (gehashter) IP – zählt nur vollständige, gültige Anfragen
ratenbegrenzung($DATEN, $cfg, (int) $opt['grenzen']['anfragenProStunde']) || antwort(429, ['ok' => false, 'fehler' => 'rate', 'meldung' => $T['rate']]);

/* ------------------------------------------------------------------ Mails */

$ref = referenz();
$L = fn(string $gruppe, string $k, string $sp = 'de') => $opt[$gruppe][$k][$sp] ?? $k;
$zeitraum = fn(string $sp) => $f['zeitraum_offen']
    ? texte($sp)['offen']
    : datumText($f['von'], $sp) . ($f['bis'] ? ' – ' . datumText($f['bis'], $sp) : '');

// 1. Benachrichtigung an Bildmechaniker (immer Deutsch, mit allen Angaben und Anhängen)
$zeilen = [
    'Referenz' => $ref,
    'Name' => $f['name'],
    'Unternehmen' => $f['firma'] ?: '–',
    'E-Mail' => $f['email'],
    'Telefon' => $f['telefon'] ?: '–',
    'Projektart' => $L('projektarten', $f['projektart']),
    'Leistungen' => implode(', ', array_map(fn($k) => $L('leistungen', $k), $f['leistungen'])),
    'Zeitraum' => $zeitraum('de'),
    'Einsatzort' => $f['ort'],
    'Budget' => $L('budget', $f['budget']),
    'Bezug' => $f['bezug'] ?: '–',
    'Sprache' => strtoupper($lang),
    'Anhänge' => $anhaenge ? implode(', ', array_map(fn($a) => $a['name'] . ' (' . round($a['groesse'] / 1048576, 1) . ' MB)', $anhaenge)) : '–',
];
$intern = mailer($cfg);
try {
    $intern->addAddress($cfg['empfaenger'], $cfg['empfaenger_name']);
    $intern->addReplyTo($f['email'], $f['name']);
    $intern->Subject = "Neue Anfrage {$ref}: {$zeilen['Leistungen']} – {$f['name']}" . ($f['firma'] ? " ({$f['firma']})" : '');
    $intern->Body = html('Neue Anfrage über die Website', $zeilen, $f['beschreibung'],
        'Antworten Sie direkt auf diese Mail, um ' . e($f['name']) . ' zu erreichen. Die Anfrage wurde nur per Mail zugestellt und nicht auf dem Server gespeichert.');
    $intern->AltBody = text($zeilen, $f['beschreibung']);
    foreach ($anhaenge as $a) $intern->addAttachment($a['pfad'], $a['name']);
    senden($intern, $cfg, $DATEN, "intern-{$ref}");
} catch (\Throwable $ex) {
    error_log('[anfrage] interne Mail fehlgeschlagen: ' . $ex->getMessage());
    antwort(502, ['ok' => false, 'fehler' => 'versand', 'meldung' => $T['versand']]);
}

// 2. Eingangsbestätigung an den Interessenten.
//    Bewusst ohne Freitext und ohne Links aus dem Formular, damit das Formular nicht missbraucht
//    werden kann, um Fremden Inhalte zu schicken.
$S = texte($lang);
$bestaetigung = [
    $S['m_ref'] => $ref,
    $S['m_projektart'] => $L('projektarten', $f['projektart'], $lang),
    $S['m_leistungen'] => implode(', ', array_map(fn($k) => $L('leistungen', $k, $lang), $f['leistungen'])),
    $S['m_zeitraum'] => $zeitraum($lang),
    $S['m_budget'] => $L('budget', $f['budget'], $lang),
    $S['m_anhaenge'] => (string) count($anhaenge),
];
$anrede = preg_replace('~(https?://|www\.)\S*~i', '', mb_substr($f['name'], 0, 60));
$bestaetigt = true;
try {
    $m = mailer($cfg);
    $m->addAddress($f['email'], $anrede);
    $m->addReplyTo($cfg['empfaenger'], $cfg['empfaenger_name']);
    $m->Subject = sprintf($S['m_betreff'], $ref);
    $m->Body = html(sprintf($S['m_titel'], $anrede), $bestaetigung, null, $S['m_text'], $S['m_hinweis']);
    $m->AltBody = sprintf($S['m_titel'], $anrede) . "\n\n" . $S['m_hinweis'] . "\n\n" . text($bestaetigung) . "\n" . strip_tags(str_replace('<br>', "\n", $S['m_text']));
    senden($m, $cfg, $DATEN, "bestaetigung-{$ref}");
} catch (\Throwable $ex) {
    error_log('[anfrage] Bestätigung fehlgeschlagen: ' . $ex->getMessage());
    $bestaetigt = false;
}

antwort(200, ['ok' => true, 'ref' => $ref, 'bestaetigung' => $bestaetigt]);

/* ============================================================== Hilfen */

function antwort(int $code, array $daten): never
{
    http_response_code($code);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

function spam(array $T, string $grund): never
{
    error_log("[anfrage] abgewiesen: {$grund}");
    antwort(400, ['ok' => false, 'fehler' => 'spam', 'meldung' => $T['spam']]);
}

function signatur(string $ts, array $cfg): string
{
    return hash_hmac('sha256', 'anfrage|' . $ts, (string) $cfg['geheimnis']);
}

function referenz(): string
{
    return 'BM-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
}

function datum(string $d): bool
{
    $x = DateTime::createFromFormat('!Y-m-d', $d);
    return $x && $x->format('Y-m-d') === $d;
}

function datumText(string $d, string $sp): string
{
    $x = DateTime::createFromFormat('!Y-m-d', $d);
    return $x ? $x->format($sp === 'de' ? 'd.m.Y' : 'j M Y') : $d;
}

function normalisiereUploads(?array $f): array
{
    if (!$f || !isset($f['name'])) return [];
    if (!is_array($f['name'])) return [$f];
    $out = [];
    foreach ($f['name'] as $i => $n) {
        $out[] = ['name' => (string) $n, 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => (int) $f['size'][$i]];
    }
    return $out;
}

function ratenbegrenzung(string $dir, array $cfg, int $max): bool
{
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    if (!is_file("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Require all denied\n");
    $datei = "$dir/rate.json";
    $fh = @fopen($datei, 'c+');
    if (!$fh) return true; // im Zweifel nicht blockieren
    flock($fh, LOCK_EX);
    $daten = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
    $jetzt = time();
    // Einträge älter als eine Stunde löschen (Datensparsamkeit)
    foreach ($daten as $k => $zeiten) {
        $daten[$k] = array_values(array_filter($zeiten, fn($t) => $t > $jetzt - 3600));
        if (!$daten[$k]) unset($daten[$k]);
    }
    $id = substr(hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', (string) $cfg['geheimnis']), 0, 16);
    $ok = count($daten[$id] ?? []) < $max;
    if ($ok) $daten[$id][] = $jetzt;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($daten));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

function mailer(array $cfg): PHPMailer
{
    $m = new PHPMailer(true);
    $m->CharSet = PHPMailer::CHARSET_UTF8;
    $m->isHTML(true);
    $m->setFrom($cfg['absender'], $cfg['absender_name']);
    if (empty($cfg['testmodus'])) {
        $m->isSMTP();
        $m->Host = $cfg['smtp_host'];
        $m->Port = (int) $cfg['smtp_port'];
        $m->SMTPAuth = $cfg['smtp_user'] !== '';
        $m->Username = $cfg['smtp_user'];
        $m->Password = $cfg['smtp_pass'];
        $m->SMTPSecure = $cfg['smtp_secure'] ?: '';
        $m->SMTPAutoTLS = $cfg['smtp_secure'] !== '';
        $m->Timeout = 15;
    }
    return $m;
}

function senden(PHPMailer $m, array $cfg, string $dir, string $name): void
{
    if (!empty($cfg['testmodus'])) {
        $m->preSend();
        @mkdir("$dir/postausgang", 0750, true);
        file_put_contents("$dir/postausgang/$name.eml", $m->getSentMIMEMessage());
        return;
    }
    $m->send();
}

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function html(string $titel, array $zeilen, ?string $freitext, string $fuss, ?string $hinweis = null): string
{
    $rows = '';
    foreach ($zeilen as $k => $v) {
        $rows .= '<tr><td style="padding:8px 16px 8px 0;color:#6b6f75;vertical-align:top;white-space:nowrap">' . e($k)
            . '</td><td style="padding:8px 0;color:#111">' . e((string) $v) . '</td></tr>';
    }
    $box = $hinweis ? '<p style="margin:0 0 24px;padding:14px 16px;background:#eef5fc;border-left:3px solid #0072bb;color:#111">' . e($hinweis) . '</p>' : '';
    $text = $freitext !== null ? '<h2 style="font-size:15px;margin:28px 0 8px;color:#111">Projektbeschreibung</h2><p style="margin:0;white-space:pre-wrap;color:#111">' . e($freitext) . '</p>' : '';
    return '<!doctype html><html><body style="margin:0;background:#f3f4f5;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">'
        . '<div style="max-width:620px;margin:0 auto;padding:32px 24px"><div style="background:#fff;padding:32px">'
        . '<p style="margin:0 0 24px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0072bb">Bildmechaniker</p>'
        . '<h1 style="font-size:22px;font-weight:600;margin:0 0 20px;color:#111">' . e($titel) . '</h1>'
        . $box . '<table style="border-collapse:collapse;width:100%">' . $rows . '</table>' . $text
        . '<p style="margin:28px 0 0;color:#444">' . $fuss . '</p></div>'
        . '<p style="font-size:12px;color:#8a8e93;margin:16px 0 0">Bildmechaniker GmbH · Hans-Böckler-Str. 62 · 40764 Langenfeld · www.bildmechaniker.de</p>'
        . '</div></body></html>';
}

function text(array $zeilen, ?string $freitext = null): string
{
    $s = '';
    foreach ($zeilen as $k => $v) $s .= str_pad($k . ':', 16) . $v . "\n";
    return $s . ($freitext !== null ? "\nProjektbeschreibung:\n{$freitext}\n" : '');
}

function texte(string $sp): array
{
    $de = [
        'offen' => 'Zeitraum noch offen',
        'zu_gross' => 'Die Dateien sind zu groß. Bitte insgesamt höchstens 20 MB anhängen.',
        'abgelaufen' => 'Das Formular war zu lange geöffnet. Bitte laden Sie die Seite neu und senden Sie die Anfrage erneut.',
        'rate' => 'Es wurden zu viele Anfragen gesendet. Bitte versuchen Sie es später erneut oder schreiben Sie an Roland@bildmechaniker.de.',
        'spam' => 'Die Anfrage konnte nicht verarbeitet werden. Bitte laden Sie die Seite neu oder schreiben Sie an Roland@bildmechaniker.de.',
        'versand' => 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte schreiben Sie direkt an Roland@bildmechaniker.de.',
        'e_name' => 'Bitte geben Sie Ihren Namen an.',
        'e_email' => 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
        'e_telefon' => 'Bitte prüfen Sie die Telefonnummer.',
        'e_projektart' => 'Bitte wählen Sie die Art des Projekts.',
        'e_leistungen' => 'Bitte wählen Sie mindestens eine Leistung.',
        'e_beschreibung' => 'Bitte beschreiben Sie Ihr Projekt in ein paar Sätzen (mindestens 20 Zeichen).',
        'e_links' => 'Bitte verwenden Sie höchstens drei Links in der Beschreibung.',
        'e_von' => 'Bitte geben Sie ein Startdatum an oder wählen Sie „Zeitraum noch offen“.',
        'e_vergangen' => 'Das Startdatum liegt in der Vergangenheit.',
        'e_bis' => 'Das Enddatum muss nach dem Startdatum liegen.',
        'e_ort' => 'Bitte geben Sie den Einsatzort an.',
        'e_budget' => 'Bitte wählen Sie einen Budgetrahmen.',
        'e_datenschutz' => 'Bitte bestätigen Sie die Datenschutzhinweise.',
        'e_anzahl' => 'Bitte höchstens %d Dateien anhängen.',
        'e_upload' => 'Eine Datei konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.',
        'e_typ' => '„%s“ hat ein nicht unterstütztes Format.',
        'e_groesse' => '„%s“ ist größer als %d MB.',
        'e_gesamt' => 'Alle Dateien zusammen dürfen höchstens %d MB groß sein.',
        'm_betreff' => 'Ihre Anfrage bei Bildmechaniker (%s) – noch keine Buchung',
        'm_titel' => 'Danke für Ihre Anfrage, %s',
        'm_hinweis' => 'Bitte beachten Sie: Dies ist eine Eingangsbestätigung, keine Buchung. Der Termin ist erst verbindlich reserviert, wenn wir ihn Ihnen ausdrücklich schriftlich bestätigt haben.',
        'm_text' => 'Wir prüfen Ihre Anfrage und unsere Verfügbarkeit und melden uns persönlich bei Ihnen. Für Rückfragen antworten Sie einfach auf diese Mail.<br><br>Viele Grüße<br>Ihr Team der Bildmechaniker GmbH',
        'm_ref' => 'Referenz', 'm_projektart' => 'Projektart', 'm_leistungen' => 'Leistungen', 'm_zeitraum' => 'Zeitraum',
        'm_budget' => 'Budgetrahmen', 'm_anhaenge' => 'Anhänge',
    ];
    if ($sp === 'de') return $de;
    return array_merge($de, [
        'offen' => 'Dates not fixed yet',
        'zu_gross' => 'The files are too large. Please attach no more than 20 MB in total.',
        'abgelaufen' => 'The form was open for too long. Please reload the page and send your enquiry again.',
        'rate' => 'Too many enquiries were sent. Please try again later or email Roland@bildmechaniker.de.',
        'spam' => 'Your enquiry could not be processed. Please reload the page or email Roland@bildmechaniker.de.',
        'versand' => 'Your enquiry could not be delivered right now. Please email Roland@bildmechaniker.de directly.',
        'e_name' => 'Please enter your name.',
        'e_email' => 'Please enter a valid email address.',
        'e_telefon' => 'Please check the phone number.',
        'e_projektart' => 'Please choose the type of project.',
        'e_leistungen' => 'Please choose at least one service.',
        'e_beschreibung' => 'Please describe your project in a few sentences (at least 20 characters).',
        'e_links' => 'Please use no more than three links in the description.',
        'e_von' => 'Please enter a start date or choose “Dates not fixed yet”.',
        'e_vergangen' => 'The start date is in the past.',
        'e_bis' => 'The end date must be after the start date.',
        'e_ort' => 'Please enter the location.',
        'e_budget' => 'Please choose a budget range.',
        'e_datenschutz' => 'Please confirm the privacy notice.',
        'e_anzahl' => 'Please attach no more than %d files.',
        'e_upload' => 'A file could not be uploaded. Please try again.',
        'e_typ' => '“%s” has an unsupported format.',
        'e_groesse' => '“%s” is larger than %d MB.',
        'e_gesamt' => 'All files together may not exceed %d MB.',
        'm_betreff' => 'Your enquiry with Bildmechaniker (%s) – not yet a booking',
        'm_titel' => 'Thank you for your enquiry, %s',
        'm_hinweis' => 'Please note: this confirms receipt of your enquiry, it is not a booking. Your dates are only reserved once we have explicitly confirmed them to you in writing.',
        'm_text' => 'We will check your enquiry and our availability and get back to you personally. If you have any questions, simply reply to this email.<br><br>Kind regards<br>The Bildmechaniker team',
        'm_ref' => 'Reference', 'm_projektart' => 'Project type', 'm_leistungen' => 'Services', 'm_zeitraum' => 'Dates',
        'm_budget' => 'Budget range', 'm_anhaenge' => 'Attachments',
    ]);
}
