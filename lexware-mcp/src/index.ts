#!/usr/bin/env node
// Lexware-Cango: privater, lokaler MCP-Connector (stdio).
// Läuft nur auf dem eigenen Laptop, öffnet keinen Netzwerk-Port und ist nicht aus dem Internet erreichbar.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Ablage, hash } from "./ablage.js";
import { LexwareClient } from "./lexware.js";

let client: LexwareClient | undefined;
let ablage: Ablage | undefined;
const lexware = () => (client ??= new LexwareClient(process.env.LEXWARE_API_KEY ?? ""));
const ordner = () => (ablage ??= new Ablage(process.env.BUCHHALTUNG_ORDNER ?? ""));

const server = new McpServer({ name: "lexware-mcp-server", version: "1.0.0" });

type Ergebnis = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };

async function ausfuehren(fn: () => Promise<Record<string, unknown>>): Promise<Ergebnis> {
  try {
    const daten = await fn();
    return { content: [{ type: "text", text: JSON.stringify(daten, null, 2) }], structuredContent: daten };
  } catch (e) {
    return { content: [{ type: "text", text: `Fehler: ${(e as Error).message}` }], isError: true };
  }
}

server.registerTool(
  "lexware_verbindung_testen",
  {
    title: "Lexware-Verbindung testen",
    description: "Prüft, ob der API-Schlüssel funktioniert, und zeigt den Firmennamen des verbundenen Lexware-Kontos.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  () =>
    ausfuehren(async () => {
      const p = await lexware().get<{ companyName?: string; organizationId?: string }>("/v1/profile");
      return { verbunden: true, firma: p.companyName ?? "(unbekannt)" };
    })
);

server.registerTool(
  "lexware_quittungen_auflisten",
  {
    title: "Quittungen auflisten",
    description:
      "Listet alle Dateien (PDF/JPG/PNG) im Ordner \"01 Buchhaltung/Quittungen\" auf. Dieser Ordner ist der Eingang für alles, was noch NICHT in Lexware ist. " +
      "bereitsHochgeladen=true heißt: genau diese Datei wurde schon einmal hochgeladen (Duplikat).",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  () =>
    ausfuehren(async () => {
      const liste = await ordner().quittungenAuflisten();
      return {
        anzahl: liste.length,
        offen: liste.filter((q) => !q.bereitsHochgeladen).length,
        quittungen: liste.map(({ sha256: _s, ...rest }) => rest),
      };
    })
);

server.registerTool(
  "lexware_beleg_hochladen",
  {
    title: "Beleg zu Lexware hochladen",
    description:
      "Lädt eine Datei aus dem Ordner \"Quittungen\" als Beleg in Lexware Office hoch (erscheint dort bei den Belegen zur Prüfung). " +
      "Danach wird die Datei standardmäßig nach \"01 Buchhaltung/<Jahr>/Belege\" verschoben (Jahr aus dem Namen TTMMJJJJ_...). " +
      "Schon hochgeladene Dateien werden automatisch abgelehnt, damit nichts doppelt in Lexware landet.",
    inputSchema: {
      dateiname: z.string().min(1).describe("Nur der Dateiname im Ordner Quittungen, z. B. \"22092026_Ludger Droste GmbH.pdf\""),
      danach_verschieben: z.boolean().default(true).describe("Nach erfolgreichem Upload nach <Jahr>/Belege verschieben"),
      trotz_duplikat: z
        .boolean()
        .default(false)
        .describe("Nur auf ausdrücklichen Wunsch von Alev true setzen: lädt auch eine schon hochgeladene Datei erneut hoch"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  ({ dateiname, danach_verschieben, trotz_duplikat }) =>
    ausfuehren(async () => {
      const a = ordner();
      const { inhalt, mimeType } = await a.quittungLesen(dateiname);
      const sha256 = hash(inhalt);
      const frueher = (await a.protokollLesen()).find((p) => p.sha256 === sha256);
      if (frueher && !trotz_duplikat) {
        return {
          hochgeladen: false,
          grund: `Diese Datei wurde am ${frueher.zeitpunkt} schon als "${frueher.dateiname}" hochgeladen. Nicht erneut hochgeladen.`,
        };
      }

      const upload = await lexware().belegHochladen(inhalt, dateiname, mimeType);
      const eintrag = { zeitpunkt: new Date().toISOString(), dateiname, sha256, lexwareFileId: upload.id } as {
        zeitpunkt: string;
        dateiname: string;
        sha256: string;
        lexwareFileId: string;
        verschobenNach?: string;
      };

      let verschoben: string | undefined;
      let hinweis: string | undefined;
      if (danach_verschieben) {
        try {
          verschoben = await a.nachBelegeVerschieben(dateiname);
          eintrag.verschobenNach = verschoben;
        } catch (e) {
          hinweis = `Hochgeladen, aber nicht verschoben: ${(e as Error).message}`;
        }
      }
      await a.protokollErgaenzen(eintrag);
      return { hochgeladen: true, lexwareFileId: upload.id, verschobenNach: verschoben ?? null, hinweis: hinweis ?? null };
    })
);

server.registerTool(
  "lexware_belege_suchen",
  {
    title: "Belege in Lexware suchen",
    description:
      "Durchsucht die Belegliste in Lexware Office (nur lesen). Nützlich, um zu prüfen, ob ein Beleg schon in Lexware ist. " +
      "belegtyp z. B. purchaseinvoice, purchasecreditnote, salesinvoice, invoice, creditnote oder any. " +
      "status z. B. unchecked, open, paid, paidoff, voided oder any (mehrere mit Komma).",
    inputSchema: {
      belegtyp: z.string().default("any"),
      status: z.string().default("any"),
      datum_von: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("JJJJ-MM-TT"),
      datum_bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("JJJJ-MM-TT"),
      kontakt: z.string().optional().describe("Name des Lieferanten/Kunden (Teiltreffer)"),
      seite: z.number().int().min(0).default(0),
      anzahl: z.number().int().min(1).max(250).default(50),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  ({ belegtyp, status, datum_von, datum_bis, kontakt, seite, anzahl }) =>
    ausfuehren(async () => {
      type Zeile = {
        id: string;
        voucherType: string;
        voucherStatus: string;
        voucherNumber?: string;
        voucherDate?: string;
        contactName?: string;
        totalAmount?: number;
        openAmount?: number;
        currency?: string;
      };
      const r = await lexware().get<{ content: Zeile[]; totalElements?: number; totalPages?: number; last?: boolean }>(
        "/v1/voucherlist",
        {
          voucherType: belegtyp,
          voucherStatus: status,
          voucherDateFrom: datum_von,
          voucherDateTo: datum_bis,
          contactName: kontakt,
          page: seite,
          size: anzahl,
        }
      );
      return {
        gesamt: r.totalElements ?? r.content.length,
        seite,
        letzteSeite: r.last ?? true,
        belege: r.content.map((z) => ({
          id: z.id,
          typ: z.voucherType,
          status: z.voucherStatus,
          nummer: z.voucherNumber ?? null,
          datum: z.voucherDate ?? null,
          kontakt: z.contactName ?? null,
          betrag: z.totalAmount ?? null,
          offen: z.openAmount ?? null,
          waehrung: z.currency ?? null,
        })),
      };
    })
);

server.registerTool(
  "lexware_upload_protokoll",
  {
    title: "Upload-Protokoll anzeigen",
    description: "Zeigt, welche Dateien dieser Connector bisher zu Lexware hochgeladen hat (neueste zuerst).",
    inputSchema: { letzte: z.number().int().min(1).max(500).default(20) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  ({ letzte }) =>
    ausfuehren(async () => {
      const alle = await ordner().protokollLesen();
      return {
        gesamt: alle.length,
        eintraege: alle
          .slice(-letzte)
          .reverse()
          .map(({ sha256: _s, ...rest }) => rest),
      };
    })
);

await server.connect(new StdioServerTransport());
