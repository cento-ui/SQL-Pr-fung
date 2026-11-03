// SQL im Browser mit sql.js (SQLite als WebAssembly).
// sql.js wird in index.html von cdnjs geladen (exakt gepinnte Version).
// Fallback: liegen sql-wasm.js und sql-wasm.wasm in vendor/, werden diese genutzt.
import { fetchText, fetchJson } from './util.js';

export const SQLJS_VERSION = '1.10.3';
const MAX_ROWS = 20000; // Schutz vor riesigen Ergebnissen (Speicher auf dem Handy)
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQLJS_VERSION}/`;

let sqlPromise = null;
let dbList = null;
const cache = new Map(); // id -> Promise<{bytes, schema, meta}>

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Konnte ' + src + ' nicht laden'));
    document.head.appendChild(s);
  });
}

export function sqlReady() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      let base = CDN;
      if (typeof window.initSqlJs !== 'function') {
        // CDN nicht erreichbar: lokale Kopie versuchen
        await loadScript('vendor/sql-wasm.js');
        base = 'vendor/';
      }
      return window.initSqlJs({ locateFile: (f) => base + f });
    })();
    sqlPromise.catch(() => { sqlPromise = null; });
  }
  return sqlPromise;
}

export async function databases() {
  if (!dbList) dbList = await fetchJson('data/databases.json');
  return dbList;
}

function readSchema(db) {
  const tables = [];
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
  const names = res.length ? res[0].values.map((r) => r[0]) : [];
  for (const name of names) {
    const q = (sql) => {
      const r = db.exec(sql);
      return r.length ? r[0].values : [];
    };
    const qn = name.replace(/"/g, '""');
    const cols = q(`PRAGMA table_info("${qn}")`).map(([, cname, type, , , pk]) => ({ name: cname, type: type || '', pk: pk > 0 }));
    const fks = q(`PRAGMA foreign_key_list("${qn}")`).map((r) => ({ from: r[3], table: r[2], to: r[4] }));
    for (const c of cols) {
      const fk = fks.find((f) => f.from === c.name);
      if (fk) c.fk = { table: fk.table, column: fk.to };
    }
    const count = q(`SELECT COUNT(*) FROM "${qn}"`)[0][0];
    tables.push({ name, columns: cols, rows: count });
  }
  return { tables };
}

/** Lädt eine Datenbank (aus data/<id>.sql) einmalig und merkt sich ein unverändertes Abbild. */
export function loadDb(id) {
  if (!cache.has(id)) {
    const p = (async () => {
      const SQL = await sqlReady();
      const list = await databases();
      const meta = list.find((d) => d.id === id);
      if (!meta) throw new Error(`Unbekannte Datenbank «${id}»`);
      const script = await fetchText(meta.datei);
      const db = new SQL.Database();
      try {
        db.exec(script);
        return { bytes: db.export(), schema: readSchema(db), meta };
      } finally {
        db.close();
      }
    })();
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}

/**
 * Führt SQL auf einer frischen Kopie der Datenbank aus (Änderungen bleiben folgenlos).
 * Liefert {ok, columns, rows, statements, error}. Ergebnis = letzte Anweisung mit Spalten.
 */
export async function runSql(id, sql) {
  const SQL = await sqlReady();
  const { bytes } = await loadDb(id);
  const db = new SQL.Database(bytes);
  const out = { ok: true, columns: null, rows: [], statements: 0, resultSets: 0, changed: false };
  try {
    for (const stmt of db.iterateStatements(sql)) {
      out.statements++;
      const cols = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.get());
        if (rows.length > MAX_ROWS) throw new Error(`Das Ergebnis hat mehr als ${MAX_ROWS} Zeilen. Schränke die Abfrage ein (WHERE) oder prüfe die Verknüpfung der Tabellen.`);
      }
      if (cols.length) {
        out.resultSets++;
        out.columns = cols;
        out.rows = rows;
      } else if (/^\s*(update|delete|insert|create|drop|alter)/i.test(stmt.getSQL())) {
        out.changed = true;
      }
      stmt.free();
    }
  } catch (e) {
    out.ok = false;
    out.error = String(e && e.message ? e.message : e);
  } finally {
    db.close();
  }
  return out;
}

export async function schemaOf(id) {
  return (await loadDb(id)).schema;
}
