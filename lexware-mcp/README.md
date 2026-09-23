# Lexware Cango – privater Lexware-Connector für Claude

Lädt Quittungen aus Google Drive (`Cango Transporte / 01 Buchhaltung / Quittungen`) als Belege
in **Lexware Office** hoch und sucht Belege. Läuft als Erweiterung in der **Claude-Desktop-App**.

## Sicherheit
- **Nur lokal:** läuft auf dem eigenen Laptop über stdio, öffnet keinen Port, hat keine Internet-Adresse.
- **API-Schlüssel** wird bei der Installation eingegeben und im Schlüsselbund des Betriebssystems gespeichert – nie im Chat, nie im Code.
- **Nur freigegebene Aktionen:** Profil lesen, Belegliste lesen, Beleg hochladen (`POST /v1/files`). Kein Löschen, kein Ändern.
- **Dateizugriff nur auf `Quittungen`:** keine Pfade, keine Links nach draußen. Verschieben nur nach `<Jahr>/Belege`, niemals überschreiben.
- **Keine Duplikate:** jede hochgeladene Datei wird per SHA-256 protokolliert (`~/.lexware-cango/upload-protokoll.json`) und nicht erneut hochgeladen.

## Werkzeuge
| Werkzeug | Zweck |
|---|---|
| `lexware_verbindung_testen` | Schlüssel prüfen, Firmenname anzeigen |
| `lexware_quittungen_auflisten` | Dateien in `Quittungen` + ob schon hochgeladen |
| `lexware_beleg_hochladen` | Upload zu Lexware, danach nach `<Jahr>/Belege` verschieben |
| `lexware_belege_suchen` | Belegliste in Lexware durchsuchen (nur lesen) |
| `lexware_upload_protokoll` | Bisherige Uploads anzeigen |

## Installation
1. `lexware-cango.mcpb` in der Claude-Desktop-App öffnen (Doppelklick oder in Einstellungen → Erweiterungen ziehen).
2. API-Schlüssel eintragen (aus app.lexware.de → Public API).
3. Ordner `01 Buchhaltung` auswählen (über Google Drive für Desktop synchronisiert).

## Entwicklung
```
npm install
npm run build
npm test
npm run pack   # erzeugt lexware-cango.mcpb
```
