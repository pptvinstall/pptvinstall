import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../scripts/migrate-owner-documents.sql", import.meta.url), "utf8");

test("owner document migration is additive, preserves existing records and can be rerun", async () => {
  const db = new PGlite();
  try {
    // Minimal old tables: migration must preserve their existing values and add only document fields.
    await db.exec(`
      CREATE TABLE jobs (id integer PRIMARY KEY, title varchar(120), notes text);
      CREATE TABLE quotes (id integer PRIMARY KEY, status varchar(20), customer_total_cents integer);
      CREATE TABLE invoices (id integer PRIMARY KEY, total_cents integer, paid_cents integer);
      CREATE TABLE bookings (id integer PRIMARY KEY, customer_name text);
      CREATE TABLE pricing_configs (id integer PRIMARY KEY, config jsonb);
      INSERT INTO jobs VALUES (1, 'Existing job', 'Private existing note');
      INSERT INTO quotes VALUES (1, 'accepted', 12500);
      INSERT INTO invoices VALUES (1, 12500, 5000);
      INSERT INTO bookings VALUES (1, 'Existing customer');
      INSERT INTO pricing_configs VALUES (1, '{"pricingMode":"shadow","catalog":{"tv":12500}}');
    `);
    const before = {
      jobs: (await db.query("SELECT id, title, notes FROM jobs")).rows,
      quotes: (await db.query("SELECT id, status, customer_total_cents FROM quotes")).rows,
      invoices: (await db.query("SELECT id, total_cents, paid_cents FROM invoices")).rows,
      bookings: (await db.query("SELECT * FROM bookings")).rows,
      config: (await db.query("SELECT * FROM pricing_configs")).rows,
    };
    await db.exec(migration);
    const columns = (await db.query<{ table_name: string; column_name: string; data_type: string; character_maximum_length: number | null }>(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns WHERE table_schema = 'public'
    `)).rows;
    for (const [table, field, type] of [["jobs", "contact", "jsonb"], ["quotes", "quote_number", "integer"], ["invoices", "due_date", "character varying"], ["invoices", "notes", "text"], ["document_counters", "name", "character varying"], ["document_counters", "last_seq", "integer"]]) {
      assert.equal(columns.find((c) => c.table_name === table && c.column_name === field)?.data_type, type);
    }
    assert.equal(columns.find((c) => c.table_name === "invoices" && c.column_name === "due_date")?.character_maximum_length, 10);
    assert.deepEqual((await db.query("SELECT * FROM document_counters")).rows, [{ name: "estimate", last_seq: 0 }]);
    // Simulate new document values written after the first deployment, then apply the same file again.
    await db.exec(`
      UPDATE jobs SET contact = '{"name":"Customer Example"}' WHERE id = 1;
      UPDATE quotes SET quote_number = 17 WHERE id = 1;
      UPDATE invoices SET due_date = '2026-10-09', notes = 'Customer-visible note' WHERE id = 1;
      UPDATE document_counters SET last_seq = 40 WHERE name = 'estimate';
    `);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT id, title, notes FROM jobs")).rows, before.jobs);
    assert.deepEqual((await db.query("SELECT id, status, customer_total_cents FROM quotes")).rows, before.quotes);
    assert.deepEqual((await db.query("SELECT id, total_cents, paid_cents FROM invoices")).rows, before.invoices);
    assert.deepEqual((await db.query("SELECT * FROM bookings")).rows, before.bookings);
    assert.deepEqual((await db.query("SELECT * FROM pricing_configs")).rows, before.config);
    assert.deepEqual((await db.query("SELECT contact FROM jobs")).rows, [{ contact: { name: "Customer Example" } }]);
    assert.deepEqual((await db.query("SELECT quote_number FROM quotes")).rows, [{ quote_number: 17 }]);
    assert.deepEqual((await db.query("SELECT due_date, notes FROM invoices")).rows, [{ due_date: "2026-10-09", notes: "Customer-visible note" }]);
    assert.deepEqual((await db.query("SELECT * FROM document_counters")).rows, [{ name: "estimate", last_seq: 40 }], "rerun never reduces the sequence");
    await db.exec("UPDATE quotes SET quote_number = 51 WHERE id = 1");
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM document_counters")).rows, [{ name: "estimate", last_seq: 51 }], "partial rollout numbers are respected");
  } finally {
    await db.close();
  }
});

test("owner document migration rolls back additions when the base schema is missing", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TABLE jobs (id integer PRIMARY KEY, title text); INSERT INTO jobs VALUES (1, 'Preserve me')");
    await assert.rejects(() => db.exec(migration), /quotes.*does not exist/);
    await db.exec("ROLLBACK");
    assert.deepEqual((await db.query("SELECT * FROM jobs")).rows, [{ id: 1, title: "Preserve me" }]);
    assert.equal((await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'contact'")).rows.length, 0, "no partially committed column");
    assert.deepEqual((await db.query("SELECT to_regclass('public.document_counters') AS table_name")).rows, [{ table_name: null }]);
  } finally {
    await db.close();
  }
});
