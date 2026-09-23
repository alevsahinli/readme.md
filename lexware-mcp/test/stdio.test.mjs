import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("Server startet über stdio und bietet nur die erwarteten Werkzeuge", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lx-"));
  await fs.mkdir(path.join(root, "Quittungen"));
  await fs.writeFile(path.join(root, "Quittungen", "01012026_Test.pdf"), "%PDF");
  const client = new Client({ name: "test", version: "1" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/index.js")],
    env: { BUCHHALTUNG_ORDNER: root, LEXWARE_API_KEY: "", HOME: root },
  }));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "lexware_beleg_hochladen", "lexware_belege_suchen", "lexware_quittungen_auflisten",
    "lexware_upload_protokoll", "lexware_verbindung_testen",
  ]);
  assert.ok(tools.every((t) => t.annotations?.destructiveHint === false));
  const r = await client.callTool({ name: "lexware_quittungen_auflisten", arguments: {} });
  assert.equal(r.structuredContent.anzahl, 1);
  const v = await client.callTool({ name: "lexware_verbindung_testen", arguments: {} });
  assert.equal(v.isError, true);
  assert.match(v.content[0].text, /API-Schlüssel/);
  await client.close();
});
