<?php
/**
 * Konfiguration des Anfrageformulars.
 *
 * 1. Diese Datei als  config.php  speichern (gleicher Ordner).
 * 2. Werte eintragen. Zugangsdaten stehen im Host-Europe-KIS unter „E-Mail“.
 * 3. config.php per SFTP hochladen. Sie wird NICHT ins Git-Repository übernommen.
 */
return [
    // Wohin gehen neue Anfragen?
    'empfaenger'      => 'Roland@bildmechaniker.de',
    'empfaenger_name' => 'Bildmechaniker GmbH',

    // Absender der Mails – ein Postfach auf der eigenen Domain (z. B. anfrage@bildmechaniker.de)
    'absender'        => 'anfrage@bildmechaniker.de',
    'absender_name'   => 'Bildmechaniker',

    // SMTP-Zugang dieses Postfachs (Host Europe)
    'smtp_host'       => 'SMTP-SERVER-AUS-DEM-KIS',
    'smtp_port'       => 587,
    'smtp_secure'     => 'tls',          // 'tls' (Port 587) oder 'ssl' (Port 465)
    'smtp_user'       => 'anfrage@bildmechaniker.de',
    'smtp_pass'       => 'PASSWORT',

    // Langer Zufallswert zum Signieren der Formular-Tokens. Einmal erzeugen, z. B.:
    //   php -r "echo bin2hex(random_bytes(32));"
    'geheimnis'       => 'BITTE-ERSETZEN',

    // Nur zum Testen: Mails nicht versenden, sondern in api/daten/postausgang/ ablegen
    'testmodus'       => false,
];
