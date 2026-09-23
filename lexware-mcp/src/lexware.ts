// Minimaler Client für die Lexware-Office-API.
// Bewusst eingeschränkt: nur GET-Abfragen und der Beleg-Upload (POST /v1/files).
// Kein Löschen, kein Ändern – solche Endpunkte sind hier gar nicht erreichbar.

const BASE_URL = "https://api.lexware.io";
// Lexware erlaubt 2 Anfragen pro Sekunde; mit etwas Puffer.
const MIN_ABSTAND_MS = 600;

const ERLAUBTE_GET_PFADE = [/^\/v1\/profile$/, /^\/v1\/voucherlist$/, /^\/v1\/vouchers\/[0-9a-f-]{36}$/];

export class LexwareFehler extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface UploadErgebnis {
  id: string;
  resourceUri?: string;
  createdDate?: string;
}

export class LexwareClient {
  private letzteAnfrage = 0;

  constructor(private readonly apiKey: string) {
    if (!apiKey || apiKey.trim().length < 10) {
      throw new LexwareFehler(
        "Kein gültiger Lexware-API-Schlüssel eingerichtet. Bitte in Claude Desktop unter Einstellungen → Erweiterungen → Lexware Cango den Schlüssel eintragen."
      );
    }
  }

  async get<T>(pfad: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    if (!ERLAUBTE_GET_PFADE.some((re) => re.test(pfad))) {
      throw new LexwareFehler(`Pfad nicht freigegeben: ${pfad}`);
    }
    const url = new URL(pfad, BASE_URL);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const res = await this.senden(url, { method: "GET", headers: { Accept: "application/json" } });
    return (await res.json()) as T;
  }

  async belegHochladen(inhalt: Buffer, dateiname: string, mimeType: string): Promise<UploadErgebnis> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(inhalt)], { type: mimeType }), dateiname);
    form.append("type", "voucher");
    const res = await this.senden(new URL("/v1/files", BASE_URL), {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });
    return (await res.json()) as UploadErgebnis;
  }

  private async senden(url: URL, init: RequestInit): Promise<Response> {
    const warten = this.letzteAnfrage + MIN_ABSTAND_MS - Date.now();
    if (warten > 0) await new Promise((r) => setTimeout(r, warten));
    this.letzteAnfrage = Date.now();

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);

    let res: Response;
    try {
      res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(60_000) });
    } catch (e) {
      throw new LexwareFehler(`Lexware nicht erreichbar (${(e as Error).message}). Internetverbindung prüfen.`);
    }
    if (res.ok) return res;

    const text = (await res.text().catch(() => "")).slice(0, 500);
    throw new LexwareFehler(fehlerText(res.status, text), res.status);
  }
}

function fehlerText(status: number, body: string): string {
  switch (status) {
    case 401:
      return "Lexware lehnt den API-Schlüssel ab (401). Schlüssel in app.lexware.de/addons/public-api prüfen und in den Erweiterungs-Einstellungen neu eintragen.";
    case 403:
      return "Keine Berechtigung (403). Evtl. enthält der Lexware-Tarif die Public API nicht.";
    case 406:
    case 415:
      return `Datei abgelehnt (${status}): falscher Dateityp oder Datei zu groß. Erlaubt sind PDF, JPG und PNG. ${body}`;
    case 429:
      return "Zu viele Anfragen an Lexware (429). Kurz warten und erneut versuchen.";
    default:
      return `Lexware-Fehler ${status}: ${body || "keine Details"}`;
  }
}
