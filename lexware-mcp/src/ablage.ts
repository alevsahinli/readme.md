// Zugriff auf die lokalen (per Google Drive synchronisierten) Ordner.
// Der Connector darf NUR Dateien im Ordner "Quittungen" lesen und sie
// nach "<Jahr>/Belege" verschieben. Alles andere auf dem Laptop bleibt unerreichbar.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export const ERLAUBTE_ENDUNGEN: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};
const MAX_BYTES = 20 * 1024 * 1024;

export class AblageFehler extends Error {}

export interface QuittungInfo {
  dateiname: string;
  bytes: number;
  sha256: string;
  bereitsHochgeladen: boolean;
}

export interface ProtokollEintrag {
  zeitpunkt: string;
  dateiname: string;
  sha256: string;
  lexwareFileId: string;
  verschobenNach?: string;
}

export class Ablage {
  readonly quittungenOrdner: string;
  private readonly protokollDatei: string;

  constructor(readonly buchhaltungOrdner: string, protokollDatei?: string) {
    if (!buchhaltungOrdner) {
      throw new AblageFehler(
        "Kein Buchhaltungs-Ordner eingerichtet. Bitte in den Erweiterungs-Einstellungen den Ordner \"01 Buchhaltung\" auswählen."
      );
    }
    this.quittungenOrdner = path.join(buchhaltungOrdner, "Quittungen");
    this.protokollDatei = protokollDatei ?? path.join(os.homedir(), ".lexware-cango", "upload-protokoll.json");
  }

  async quittungenAuflisten(): Promise<QuittungInfo[]> {
    const eintraege = await fs.readdir(await this.echterOrdner(this.quittungenOrdner), { withFileTypes: true });
    const protokoll = await this.protokollLesen();
    const bekannte = new Set(protokoll.map((p) => p.sha256));
    const ergebnis: QuittungInfo[] = [];
    for (const e of eintraege) {
      if (!e.isFile() || !(path.extname(e.name).toLowerCase() in ERLAUBTE_ENDUNGEN)) continue;
      const { inhalt } = await this.quittungLesen(e.name);
      const sha256 = hash(inhalt);
      ergebnis.push({ dateiname: e.name, bytes: inhalt.length, sha256, bereitsHochgeladen: bekannte.has(sha256) });
    }
    return ergebnis.sort((a, b) => a.dateiname.localeCompare(b.dateiname));
  }

  async quittungLesen(dateiname: string): Promise<{ inhalt: Buffer; mimeType: string; pfad: string }> {
    const pfad = await this.sichererPfad(dateiname);
    const mimeType = ERLAUBTE_ENDUNGEN[path.extname(dateiname).toLowerCase()];
    if (!mimeType) throw new AblageFehler(`Dateityp nicht erlaubt: ${dateiname}. Erlaubt: PDF, JPG, PNG.`);
    const stat = await fs.stat(pfad);
    if (stat.size > MAX_BYTES) throw new AblageFehler(`${dateiname} ist größer als 20 MB.`);
    return { inhalt: await fs.readFile(pfad), mimeType, pfad };
  }

  /** Verschiebt eine hochgeladene Quittung nach "<Jahr>/Belege". Überschreibt nie. */
  async nachBelegeVerschieben(dateiname: string): Promise<string> {
    const quelle = await this.sichererPfad(dateiname);
    const jahr = await jahrFuer(dateiname, quelle);
    const zielOrdner = path.join(this.buchhaltungOrdner, jahr, "Belege");
    await fs.mkdir(zielOrdner, { recursive: true });
    const ziel = path.join(zielOrdner, dateiname);
    if (await existiert(ziel)) {
      throw new AblageFehler(`In ${jahr}/Belege gibt es schon eine Datei "${dateiname}". Nicht verschoben, bitte prüfen.`);
    }
    try {
      await fs.rename(quelle, ziel);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EXDEV") throw e;
      await fs.copyFile(quelle, ziel);
      await fs.unlink(quelle);
    }
    return path.join(jahr, "Belege", dateiname);
  }

  async protokollLesen(): Promise<ProtokollEintrag[]> {
    try {
      return JSON.parse(await fs.readFile(this.protokollDatei, "utf8")) as ProtokollEintrag[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  async protokollErgaenzen(eintrag: ProtokollEintrag): Promise<void> {
    const alle = await this.protokollLesen();
    alle.push(eintrag);
    await fs.mkdir(path.dirname(this.protokollDatei), { recursive: true, mode: 0o700 });
    await fs.writeFile(this.protokollDatei, JSON.stringify(alle, null, 2), { mode: 0o600 });
  }

  /** Nur ein reiner Dateiname im Quittungen-Ordner ist erlaubt – keine Pfade, keine Links nach draußen. */
  private async sichererPfad(dateiname: string): Promise<string> {
    if (!dateiname || dateiname !== path.basename(dateiname) || dateiname.startsWith(".") || /[\\/]/.test(dateiname)) {
      throw new AblageFehler(`Ungültiger Dateiname: "${dateiname}". Nur Dateinamen aus dem Ordner Quittungen sind erlaubt.`);
    }
    const ordner = await this.echterOrdner(this.quittungenOrdner);
    const kandidat = path.join(ordner, dateiname);
    let echt: string;
    try {
      echt = await fs.realpath(kandidat);
    } catch {
      throw new AblageFehler(`"${dateiname}" liegt nicht im Ordner Quittungen.`);
    }
    if (path.dirname(echt) !== ordner) {
      throw new AblageFehler(`"${dateiname}" zeigt aus dem Ordner Quittungen heraus. Abgelehnt.`);
    }
    return echt;
  }

  private async echterOrdner(ordner: string): Promise<string> {
    try {
      return await fs.realpath(ordner);
    } catch {
      throw new AblageFehler(
        `Ordner nicht gefunden: ${ordner}. Läuft Google Drive für Desktop, und ist in den Einstellungen der richtige Ordner "01 Buchhaltung" gewählt?`
      );
    }
  }
}

export function hash(inhalt: Buffer): string {
  return createHash("sha256").update(inhalt).digest("hex");
}

async function jahrFuer(dateiname: string, pfad: string): Promise<string> {
  // Namensschema TTMMJJJJ_Absender.pdf
  const m = /^\d{2}\d{2}(\d{4})_/.exec(dateiname);
  if (m) return m[1];
  return String((await fs.stat(pfad)).mtime.getFullYear());
}

async function existiert(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
