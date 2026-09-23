import { test } from "node:test";
import assert from "node:assert/strict";
import { LexwareClient } from "../dist/lexware.js";

const KEY = "test-key-1234567890";

test("sendet Upload als multipart an api.lexware.io mit Bearer-Schlüssel", async () => {
  let req;
  globalThis.fetch = async (url, init) => { req = { url: String(url), init }; return new Response(JSON.stringify({ id: "abc" }), { status: 200 }); };
  const r = await new LexwareClient(KEY).belegHochladen(Buffer.from("%PDF"), "a.pdf", "application/pdf");
  assert.equal(r.id, "abc");
  assert.equal(req.url, "https://api.lexware.io/v1/files");
  assert.equal(req.init.method, "POST");
  assert.equal(new Headers(req.init.headers).get("authorization"), `Bearer ${KEY}`);
  assert.equal(req.init.body.get("type"), "voucher");
  assert.equal(req.init.body.get("file").name, "a.pdf");
});

test("blockiert nicht freigegebene Pfade", async () => {
  globalThis.fetch = async () => { throw new Error("darf nicht aufgerufen werden"); };
  const c = new LexwareClient(KEY);
  for (const p of ["/v1/contacts", "/v1/vouchers/../event-subscriptions", "https://evil.example/v1/profile"]) {
    await assert.rejects(c.get(p), /nicht freigegeben/);
  }
});

test("Fehlermeldungen verraten den Schlüssel nicht", async () => {
  globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
  await assert.rejects(new LexwareClient(KEY).get("/v1/profile"), (e) => !e.message.includes(KEY) && /401/.test(e.message));
});

test("ohne Schlüssel klare Meldung", () => {
  assert.throws(() => new LexwareClient(""), /API-Schlüssel/);
});
