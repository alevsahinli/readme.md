import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Ablage } from "../dist/ablage.js";

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lx-"));
  const bh = path.join(root, "01 Buchhaltung");
  await fs.mkdir(path.join(bh, "Quittungen"), { recursive: true });
  await fs.writeFile(path.join(bh, "Quittungen", "22092026_Ludger Droste GmbH.pdf"), "%PDF-1 test");
  await fs.writeFile(path.join(bh, "Quittungen", "notiz.txt"), "x");
  await fs.writeFile(path.join(root, "geheim.pdf"), "geheim");
  return { root, bh, ablage: new Ablage(bh, path.join(root, "protokoll.json")) };
}

test("listet nur erlaubte Dateitypen", async () => {
  const { ablage } = await setup();
  const l = await ablage.quittungenAuflisten();
  assert.deepEqual(l.map((q) => q.dateiname), ["22092026_Ludger Droste GmbH.pdf"]);
  assert.equal(l[0].bereitsHochgeladen, false);
});

test("verweigert Pfade außerhalb von Quittungen", async () => {
  const { ablage } = await setup();
  for (const n of ["../../geheim.pdf", "/etc/passwd", "..\\geheim.pdf", ".versteckt.pdf", ""]) {
    await assert.rejects(ablage.quittungLesen(n), /Ungültiger Dateiname|nicht im Ordner/);
  }
});

test("verweigert Symlinks, die herauszeigen", async () => {
  const { root, bh, ablage } = await setup();
  await fs.symlink(path.join(root, "geheim.pdf"), path.join(bh, "Quittungen", "link.pdf"));
  await assert.rejects(ablage.quittungLesen("link.pdf"), /heraus/);
});

test("verschiebt nach Jahr/Belege und überschreibt nie", async () => {
  const { bh, ablage } = await setup();
  const ziel = await ablage.nachBelegeVerschieben("22092026_Ludger Droste GmbH.pdf");
  assert.equal(ziel, path.join("2026", "Belege", "22092026_Ludger Droste GmbH.pdf"));
  await fs.access(path.join(bh, "2026", "Belege", "22092026_Ludger Droste GmbH.pdf"));
  await fs.writeFile(path.join(bh, "Quittungen", "22092026_Ludger Droste GmbH.pdf"), "neu");
  await assert.rejects(ablage.nachBelegeVerschieben("22092026_Ludger Droste GmbH.pdf"), /schon eine Datei/);
  assert.equal(await fs.readFile(path.join(bh, "2026", "Belege", "22092026_Ludger Droste GmbH.pdf"), "utf8"), "%PDF-1 test");
});

test("erkennt Duplikate über das Protokoll", async () => {
  const { ablage } = await setup();
  const [q] = await ablage.quittungenAuflisten();
  await ablage.protokollErgaenzen({ zeitpunkt: "x", dateiname: q.dateiname, sha256: q.sha256, lexwareFileId: "id" });
  const [q2] = await ablage.quittungenAuflisten();
  assert.equal(q2.bereitsHochgeladen, true);
});
