---
name: cango-gedaechtnis
description: Gedächtnis und Ablage-Regeln für Cango Transporte (Alevs Transportfirma). Liest zu Beginn das Dokument "00 Claude-Gedächtnis" in Google Drive, damit Alev nichts neu erklären muss, hält die Ablage sauber (keine Duplikate, keine Zwischenstände, nichts lose im Hauptordner), lädt Quittungen über den Connector "Lexware Cango" zu Lexware hoch und trägt am Ende den neuen Stand ein. Unbedingt verwenden bei allem, was Cango, Buchhaltung, Belege, Quittungen, Kasse, Kontoauszüge, Lohnabrechnungen, Lexware/Lexoffice, Steuerberater, Mitarbeiter, AU-Scheine, Fahrzeuge, Behördenpost oder Dateien im Drive-Ordner "Cango Transporte" betrifft – auch wenn Alev das Gedächtnis nicht erwähnt oder nur "mach weiter", "wo waren wir" oder "was ist offen" schreibt. Vor den Skills belegstapel-sortieren, stundenzettel-cango und scan-pdf-trennen zuerst diesen hier laden.
---

# Cango-Gedächtnis

Alev hat Claude immer wieder alles neu erklären müssen, und Dateien lagen wild verstreut und doppelt im Drive. Dieser Skill sorgt dafür, dass jede Sitzung auf dem letzten Stand anfängt und die Ablage sauber bleibt. Er gilt für alles rund um Cango Transporte, nicht nur für die Buchhaltung.

## 1. Zu Beginn: Gedächtnis lesen

Bevor du irgendetwas für Cango tust:

1. Suche in Google Drive das Dokument **"00 Claude-Gedächtnis"** im Ordner "Cango Transporte" (Ordner-ID siehe unten), z. B. mit `title = '00 Claude-Gedächtnis' and parentId = '<Cango-ID>'`.
2. Lies es vollständig. Es enthält Ablage-Regeln, den Stand pro Monat, offene Punkte, Lexware-Aufgaben und den Verlauf.
3. Gibt es mehrere Dokumente mit dem Namen, nimm das neueste und lege die älteren in den Papierkorb (sie sind Reste früherer Aktualisierungen).
4. Sag Alev in 1–3 Sätzen, wo es steht, z. B. „Stand: 01–08/2026 in Drive, Lexware-Abgleich noch offen, 1 Quittung wartet auf Upload." Frag nicht nach Dingen, die schon im Gedächtnis stehen.

Findest du das Dokument nicht, frag Alev, bevor du ein neues anlegst – es darf nur eins geben.

## 2. Während der Arbeit: Ablage-Regeln

Die ausführlichen Regeln und die Tabelle „Wohin gehört was" stehen im Gedächtnis-Dokument und haben Vorrang. Der Kern, mit Begründung:

- **Nichts lose in "Cango Transporte".** Außer dem Gedächtnis-Dokument gehört jede Datei in einen Unterordner. Sonst findet später niemand etwas.
- **Vor dem Speichern prüfen, ob es die Datei schon gibt.** Alevs Drive und Laptop waren überschwemmt von Kopien.
- **Eine Korrektur ersetzt die alte Datei.** Speichere nur die Endfassung. Hast du selbst eine Fassung erstellt und korrigierst sie, lege die alte sofort in den Papierkorb. Keine Namen wie „_1", „DRUCK", „VORAB", „Kopie von", „final2".
- **Nur in "Cango Transporte" speichern**, nie in „Aus Chrome gespeichert", „Meine Ablage" o. Ä.
- **Fremde Dateien** (die Alev oder jemand anderes angelegt hat) nur mit Alevs Zustimmung löschen oder verschieben. Eigene Duplikate und Zwischenstände darfst du selbst aufräumen. Gelöscht wird immer nur in den Papierkorb (30 Tage wiederherstellbar).
- **Dateinamen** nach dem Schema im Gedächtnis, z. B. `Kasse_MM-JJJJ_druckfertig.pdf`, `TTMMJJJJ_Absender.pdf`.

## 3. Quittungen → Lexware → Belege

Der Ordner **"01 Buchhaltung / Quittungen"** ist der Eingang. Was dort liegt, ist noch nicht in Lexware. So bleibt jederzeit sichtbar, was hochgeladen werden muss.

1. Neue Scans liegen in "Quittungen". Benenne sie nach `TTMMJJJJ_<Absender>.pdf`, falls nötig.
2. **Hochladen über den Connector "Lexware Cango"** (Werkzeuge `lexware_quittungen_auflisten`, `lexware_beleg_hochladen`). Der Connector lädt hoch, verhindert Duplikate und verschiebt die Datei danach selbst nach "01 Buchhaltung/<Jahr>/Belege".
   - Der Connector läuft nur in der Claude-Desktop-App auf Alevs Laptop. Sind die `lexware_*`-Werkzeuge nicht da (z. B. im Browser oder am Handy), lade nichts auf anderem Weg hoch. Trag die Datei stattdessen im Gedächtnis unter „Aufgaben für Lexoffice" ein und sag Alev, dass der Upload in der Desktop-App passiert.
   - Meldet der Connector „schon hochgeladen", nicht erzwingen. `trotz_duplikat` nur setzen, wenn Alev es ausdrücklich will.
   - Vor dem ersten Upload einer Sitzung einmal `lexware_verbindung_testen` aufrufen.
3. Erst nach erfolgreichem Upload gehört die Datei nach "Belege". Nie andersherum, sonst geht die Übersicht verloren.
4. Ob etwas schon in Lexware ist, prüfst du mit `lexware_belege_suchen` (z. B. nach Datum oder Kontakt).

## 4. Am Ende: Gedächtnis aktualisieren

Nach jeder Aufgabe, die etwas verändert hat:

- Abschnitt 2 (Stand), 3 (Offene Punkte), 4 (Jahresabschluss) anpassen.
- In Abschnitt 5 (Verlauf) oben eine Zeile ergänzen: Datum, was gemacht wurde, was offen bleibt.
- „Zuletzt aktualisiert" auf das heutige Datum setzen.

**So aktualisierst du das Dokument:** Die Google-Drive-Werkzeuge können den Inhalt eines Google Docs nicht direkt bearbeiten. Lies deshalb das aktuelle Dokument, schreib den vollständigen neuen Inhalt als Markdown und lege ihn mit demselben Titel **"00 Claude-Gedächtnis"** im Ordner "Cango Transporte" neu an (`contentMimeType: text/markdown`). Prüfe kurz, dass das neue Dokument Inhalt hat, und lege erst dann das alte in den Papierkorb. Übernimm alles Bestehende; streiche nur, was erledigt oder überholt ist. Gib Alev den neuen Link, denn er ändert sich dabei.

Kann Claude Desktop Google Docs direkt bearbeiten (z. B. über einen anderen Connector), bearbeite das Dokument direkt statt es neu anzulegen.

## 5. Lexware und Steuerberater

- Belege liegen in Google Drive **und** in Lexware (app.lexware.de). Beide Seiten sollen übereinstimmen.
- Der Steuerberater bekommt alles **einmal am Jahresende als Sammeldatei** im Ordner "01 Buchhaltung/Steuerberater". Halte in Abschnitt 4 des Gedächtnisses fest, was für die Sammeldatei schon beisammen ist.

## Ordner-IDs (Google Drive)

Damit du nicht jedes Mal suchen musst. Wenn eine ID nicht mehr funktioniert, per Titel suchen und die neue ID im Gedächtnis vermerken.

| Ordner | ID |
|---|---|
| Cango Transporte | `1dys_Z6hQAYtA5NPEss3FjUjd-t-hU5wu` |
| 01 Buchhaltung | `15_wetrDSNKg5-Ii6C3l_YsNjgNl1Y7Kl` |
| 01 Buchhaltung / Quittungen | `1Mb7qpZ9lcsBXjoWna4zpe0umrNxcQNKR` |
| 01 Buchhaltung / 2026 | `12DjllYuZRALNH34z1rM4qfhpt8zoW_1X` |
| 2026 / Belege | `17RJGzaARjFij3LyJrO2_oN7knuJpkhci` |
| 2026 / Kasse | `1c7H9QF_BBud1iwM7AZJbbjO8HaT7ay4t` |
| 2026 / Bankauszüge | `1sgPe9EQtvtMlXAiXJKr8Cs7DmM0HXzIO` |
| 2026 / Einnahmen | `1bGwCfrbw4PGG8lwWpXJLw5gBIbO_QX_E` |
| 2026 / Ausgaben | `1EvVgr_CISTiMFdZbL9_tZLKgQJ8sXbL-` |
| 2026 / Lohnabrechnungen | `1L_mL1-H8ZPbbO_ILVa4uucX8iU3Ak44g` |
| 01 Buchhaltung / 2025 | `1sZvCOPMulgTZnj7ZmVnnrmjhxTti52Ia` |
| 2025 / Kasse | `1pIzl63Wc_5VtMCyFRQkAUCCJnl1l41GD` |
| 2025 / Bankauszüge | `1LGhbDhKVIGIWZABQ-Mb7FAO5YE_QG0Gf` |
| 01 Buchhaltung / Steuerberater | `1GqqW8ZTDUrKOqa-nN42ZHloutRQo97rx` |
| 01 Buchhaltung / Belegstapel (Claude) | `1zGvxENdKlYNV2Zb3V_3arQisufdBsmhT` |
| 02 Personal | `1fvjef9ZMMZv6EoYH8J7WZoz98zrUY3ib` |
| 02 Personal / AU-Scheine | `1OvAwP08s6cZ9SaT-bctml10dYxp8eyQ1` |
| 03 Behörden | `1VceHXollqEwqP7TZIl08Dn6jrWXLxqJ6` |
| 04 Briefe | `1EWzWNquDx7raiUyzVhurytWfNRVsN0SB` |
| 05 Verträge | `1RKWodqU7V-9N7ge5LwZ2DMWaWPvGJR4M` |
| 06 Fahrzeuge | `1Jsitm83fvNZTluis6fJGsNfA1ZoCAfqm` |
| 07 Sonstiges | `16Oh6O1pnxgymNfoucVj4WaGV3-Zd0GPG` |
