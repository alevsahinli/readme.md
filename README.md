# readme.md

Setup-Notizen für Claude Code und MCP-Server.

## Claude Code installieren

```bash
./install.sh
```

Das Skript prüft Node.js (mindestens Version 18) und installiert
`@anthropic-ai/claude-code` global. Danach startet `claude` die CLI.

## Playwright-MCP

Playwright-MCP gibt Claude einen steuerbaren Browser: Seiten aufrufen,
klicken, Formulare ausfüllen, Screenshots machen, Daten auslesen.

Es gibt zwei verbreitete Server. Beide funktionieren, sie setzen nur
unterschiedliche Schwerpunkte:

| | `@playwright/mcp` | `@executeautomation/playwright-mcp-server` |
|---|---|---|
| Herausgeber | Playwright-Team (Microsoft) | Community (ExecuteAutomation) |
| Ansatz | liest den Accessibility-Tree, also die Seitenstruktur statt Pixel | klassisch: Screenshots, JS-Ausführung, Scraping |
| Extras | – | Testcode-Generierung, Geräte-Presets, Touch-Events, Viewport-Resizing |

Für reine Browser-Steuerung ist der offizielle Server meist der robustere
Default. Der ExecuteAutomation-Server lohnt sich, wenn Testskripte generiert
oder Mobilgeräte emuliert werden sollen.

In diesem Repo ist in der `.mcp.json` der ExecuteAutomation-Server als
`playwright` eingetragen.

### Browser-Binaries

Unabhängig vom gewählten Server müssen die Browser einmalig lokal
heruntergeladen werden:

```bash
npx playwright install chromium
```

In der Regel reicht Chromium. Alle drei Engines braucht nur, wer wirklich
Cross-Browser testet — das sind dann rund ein Gigabyte:

```bash
npx playwright install            # alle
npx playwright install firefox
npx playwright install webkit
```

Unter Linux fehlen häufig Systembibliotheken. Dann stattdessen:

```bash
npx playwright install --with-deps chromium
```

## Server registrieren

Wichtig vorweg: Claude Code und VS Code führen **getrennte** MCP-Registries.
Die Claude-Code-Extension in VS Code liest die VS-Code-Konfiguration *nicht* —
sie läuft über die Claude-Code-CLI. Wer den Server in beiden Umgebungen nutzen
will, führt beide Befehle aus.

### Claude Code

```bash
claude mcp add playwright -s user -- npx -y @executeautomation/playwright-mcp-server
```

Für den offiziellen Server entsprechend:

```bash
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest
```

Die Teile des Befehls:

- `playwright` — Name, unter dem der Server in Claude Code auftaucht
- `-s user` — Scope, siehe Tabelle unten
- `--` — trennt die Claude-Code-Flags vom eigentlichen Startkommando
- `npx -y …` — startet den Server über stdio; `-y` überspringt die
  Installationsrückfrage beim ersten Start

Scopes:

| Scope | Gilt für |
|---|---|
| `local` | nur dieses Projekt, nur dich (Default) |
| `project` | wird in `.mcp.json` im Repo abgelegt und mit dem Team geteilt |
| `user` | dich auf diesem Rechner, in allen Projekten |

Prüfen und wieder entfernen:

```bash
claude mcp list
claude mcp remove playwright -s user
```

In der laufenden CLI zeigt `/mcp` den Status und die verfügbaren Tools.

Zwei Server können nicht denselben Namen belegen. Wer beide parallel testen
will, vergibt einen zweiten Namen, etwa `playwright-ea`.

### Projekt-Scope über `.mcp.json`

Die `.mcp.json` in diesem Repo ist der `project`-Scope: Wer das Repo klont und
Claude Code darin startet, bekommt die Server angeboten.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

Der ebenfalls eingetragene `apify`-Server braucht ein API-Token. Der
Platzhalter `<YOUR_API_TOKEN>` muss lokal ersetzt werden — **keine echten
Tokens committen**.

### VS Code

```bash
code --add-mcp '{"name":"playwright","command":"npx","args":["-y","@executeautomation/playwright-mcp-server"]}'
```

Das schreibt den Server in die User-`mcp.json` von VS Code, die der
Copilot-Agent-Mode nutzt. Die Quotes gelten so für bash und zsh; unter
PowerShell ist der Weg über die Command Palette einfacher.

Kontrolle über die Command Palette: `MCP: List Servers`. Kennt VS Code das
Flag `--add-mcp` nicht, ist die Installation zu alt — dann updaten oder den
Server über `MCP: Add Server` von Hand eintragen.

## Fehlersuche

| Symptom | Ursache |
|---|---|
| Server startet nicht | Node.js älter als 18 |
| erster Start hängt | `npx` wartet auf Bestätigung; `-y` ergänzen |
| „browser not found" | `npx playwright install chromium` fehlt |
| Fehler zu fehlenden `.so`-Dateien | `npx playwright install --with-deps chromium` |
| Server fehlt in Claude Code, obwohl in VS Code registriert | getrennte Registries, siehe oben |
