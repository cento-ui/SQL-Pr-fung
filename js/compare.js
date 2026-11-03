// Ergebnisvergleich Lernende vs. Referenzlösung und verständliche Fehlermeldungen.

export function canon(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 1e6) / 1e6);
  }
  if (v instanceof Uint8Array) return '[BLOB]';
  return String(v);
}

const SEP = '␟';
export const rowKey = (row) => row.map(canon).join(SEP);

function countMap(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = rowKey(r);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const ma = countMap(a);
  const mb = countMap(b);
  if (ma.size !== mb.size) return false;
  for (const [k, n] of ma) if (mb.get(k) !== n) return false;
  return true;
}

/** SQL für Schlüsselwort-Prüfungen: ohne Kommentare und Text-Literale, gross geschrieben. */
export function normalizeSql(sql) {
  return String(sql || '')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Mehr als eine Tabelle im FROM (Komma-Schreibweise oder JOIN)? */
export function fromHasMultipleTables(sql) {
  const n = normalizeSql(sql);
  const m = n.match(/\bFROM\b(.*?)(\bWHERE\b|\bORDER\b|\bGROUP\b|\bLIMIT\b|;|$)/);
  if (!m) return false;
  return /,/.test(m[1]) || /\bJOIN\b/.test(m[1]);
}

function fmtRow(row) {
  return row.map((v) => (v === null ? 'NULL' : canon(v))).join(' | ');
}

/** Versucht eine Spaltenvertauschung zu finden, unter der die Ergebnisse gleich sind. */
function findPermutation(exp, act) {
  const n = exp.columns.length;
  const sig = (rows, j) => rows.map((r) => canon(r[j])).sort().join(SEP);
  const expSig = [...Array(n).keys()].map((j) => sig(exp.rows, j));
  const actSig = [...Array(n).keys()].map((j) => sig(act.rows, j));
  const used = new Set();
  const perm = [];
  for (let j = 0; j < n; j++) {
    let found = -1;
    for (let k = 0; k < n; k++) {
      if (!used.has(k) && actSig[k] === expSig[j]) { found = k; break; }
    }
    if (found < 0) return null;
    used.add(found);
    perm.push(found);
  }
  return perm;
}

/**
 * Vergleicht das Ergebnis der Lernenden (act) mit dem der Referenz (exp).
 * exp/act: {columns: [...], rows: [[...]]}
 * opts: {ordered, spaltennamen, sql}
 * Rückgabe: {ok, code, message, notes: []}
 */
export function compareResults(exp, act, opts = {}) {
  const notes = [];
  if (!act.columns) {
    return { ok: false, code: 'keine-tabelle', message: 'Deine Anweisung liefert keine Ergebnistabelle. Eine Abfrage beginnt mit SELECT.', notes };
  }
  const ec = exp.columns.length;
  const acn = act.columns.length;
  if (ec !== acn) {
    let msg = `Deine Abfrage liefert ${acn} Spalte${acn === 1 ? '' : 'n'}, verlangt ${ec === 1 ? 'ist' : 'sind'} ${ec}.`;
    if (/SELECT\s+(DISTINCT\s+)?\*/.test(normalizeSql(opts.sql)) && acn > ec) msg += ' Mit * werden alle Spalten ausgegeben – wähle nur die verlangten Spalten aus.';
    else msg += ' Lies genau, welche Spalten (Attribute) in der Aufgabe verlangt sind.';
    return { ok: false, code: 'spaltenzahl', message: msg, notes };
  }

  let rows = act.rows;
  let cols = act.columns;
  if (!sameMultiset(exp.rows, rows) && ec > 1) {
    const perm = findPermutation(exp, act);
    if (perm && perm.some((p, j) => p !== j)) {
      const permuted = rows.map((r) => perm.map((k) => r[k]));
      if (sameMultiset(exp.rows, permuted)) {
        rows = permuted;
        cols = perm.map((k) => act.columns[k]);
        notes.push('Die Spalten stehen in einer anderen Reihenfolge als verlangt. Das Ergebnis zählt, in der Prüfung hältst du dich aber besser an die Reihenfolge der Aufgabe.');
      }
    }
  }

  const en = exp.rows.length;
  const an = rows.length;
  if (!sameMultiset(exp.rows, rows)) {
    const expMap = countMap(exp.rows);
    const actMap = countMap(rows);
    const extra = rows.find((r) => !expMap.has(rowKey(r)));
    if (an > en) {
      const sameSet = [...actMap.keys()].every((k) => expMap.has(k)) && [...expMap.keys()].every((k) => actMap.has(k));
      if (sameSet) {
        return { ok: false, code: 'duplikate', message: `Deine Abfrage liefert ${an} Zeilen, verlangt sind ${en}. Einige Zeilen kommen mehrfach vor. Sollen doppelte Zeilen entfernt werden (DISTINCT)?`, notes };
      }
      if (fromHasMultipleTables(opts.sql) && an >= 2 * Math.max(en, 1)) {
        return { ok: false, code: 'kreuzprodukt', message: `Deine Abfrage liefert ${an} Zeilen, verlangt sind ${en}. Das sieht nach einem Kreuzprodukt aus: Fehlt eine Verknüpfungsbedingung im WHERE (z. B. tabelle1.schluessel = tabelle2.schluessel)?`, notes };
      }
      let msg = `Deine Abfrage liefert ${an} Zeilen, verlangt sind ${en}. Wahrscheinlich fehlt eine Bedingung im WHERE oder sie ist zu locker.`;
      if (extra) msg += ` Diese Zeile gehört zum Beispiel nicht dazu: «${fmtRow(extra)}».`;
      return { ok: false, code: 'zu-viele-zeilen', message: msg, notes };
    }
    if (an < en) {
      let msg = an === 0
        ? `Deine Abfrage liefert keine einzige Zeile, verlangt sind ${en}. Prüfe die Bedingung: Schreibweise der Werte (Gross-/Kleinschreibung), Anführungszeichen bei Texten, AND statt OR?`
        : `Deine Abfrage liefert ${an} Zeile${an === 1 ? '' : 'n'}, verlangt sind ${en}. Die Bedingung ist wohl zu streng (z. B. AND statt OR, > statt >=, fehlendes %).`;
      const expHasDup = [...expMap.values()].some((v) => v > 1);
      if (expHasDup && /\bDISTINCT\b/.test(normalizeSql(opts.sql))) msg += ' Hier sind doppelte Zeilen erwünscht – lass DISTINCT weg.';
      return { ok: false, code: 'zu-wenige-zeilen', message: msg, notes };
    }
    let msg = `Die Anzahl Zeilen (${an}) stimmt, aber nicht alle Werte.`;
    if (extra) msg += ` Diese Zeile gehört nicht ins Ergebnis: «${fmtRow(extra)}».`;
    msg += ' Prüfe die Bedingung und die ausgewählten Spalten.';
    return { ok: false, code: 'falsche-werte', message: msg, notes };
  }

  if (opts.ordered) {
    for (let i = 0; i < en; i++) {
      if (rowKey(exp.rows[i]) !== rowKey(rows[i])) {
        return { ok: false, code: 'reihenfolge', message: 'Die Zeilen stimmen, aber die Reihenfolge nicht. Prüfe ORDER BY: richtige Spalte(n), ASC oder DESC, Reihenfolge der Sortierkriterien.', notes };
      }
    }
  }

  if (opts.spaltennamen) {
    const want = exp.columns.map((c) => c.toLowerCase());
    const got = cols.map((c) => c.toLowerCase());
    if (want.join('|') !== got.join('|')) {
      return { ok: false, code: 'spaltennamen', message: `Die Werte stimmen, aber die Spaltenüberschriften nicht. Verlangt: ${exp.columns.join(', ')}. Verwende AS für einen Alias.`, notes };
    }
  }
  return { ok: true, code: null, message: 'Richtig!', notes };
}

/** Pflicht-/Verbots-Muster der Aufgabe prüfen. muss/verboten: [{muster, meldung}] */
export function checkKeywords(sql, task) {
  const n = normalizeSql(sql);
  for (const r of task.muss || []) {
    if (!new RegExp(r.muster, 'i').test(n)) return { ok: false, code: 'pflicht-fehlt', message: r.meldung || `Verwende ${r.muster}.` };
  }
  for (const r of task.verboten || []) {
    if (new RegExp(r.muster, 'i').test(n)) return { ok: false, code: 'verboten', message: r.meldung || `${r.muster} ist hier nicht erlaubt.` };
  }
  return { ok: true };
}

/** Hinweise auf Sprachelemente, die nicht Prüfungsstoff sind (nur Hinweis, kein Fehler). */
export function stoffHinweise(sql) {
  const n = normalizeSql(sql);
  const out = [];
  if (/\bLIMIT\b/.test(n)) out.push('LIMIT steht nicht auf dem Hilfsblatt und ist kein Prüfungsstoff. Löse die Aufgabe ohne LIMIT (z. B. mit ORDER BY oder MIN/MAX).');
  if (/\bJOIN\b/.test(n)) out.push('JOIN funktioniert, im Unterricht und in der Prüfung verknüpfst du Tabellen aber mit Komma im FROM und der Bedingung im WHERE.');
  if (/\bGROUP\s+BY\b|\bHAVING\b/.test(n)) out.push('GROUP BY / HAVING sind nicht Prüfungsstoff (nicht auf dem Hilfsblatt).');
  if (/^(UPDATE|DELETE|INSERT|CREATE|DROP|ALTER)\b/.test(n) || /;\s*(UPDATE|DELETE|INSERT|CREATE|DROP)\b/.test(n)) out.push('Datenänderungen (UPDATE, DELETE, INSERT …) sind nicht Prüfungsstoff. Sie werden hier auf einer Kopie ausgeführt und nicht gespeichert.');
  if (/\(\s*SELECT\b/.test(n)) out.push('Unterabfragen sind nicht Prüfungsstoff. Es geht auch ohne.');
  return out;
}

/**
 * SQLite-Fehlermeldung in eine verständliche deutsche Rückmeldung übersetzen.
 * schema: {tables: [{name, columns: [{name}]}]}
 */
export function explainError(error, sql, schema) {
  const e = String(error || '');
  const tables = schema ? schema.tables : [];
  const allCols = new Set(tables.flatMap((t) => t.columns.map((c) => c.name.toLowerCase())));
  const tableList = tables.map((t) => t.name).join(', ');
  let m;
  if (/near "alter": syntax error/i.test(e) || (/syntax error/i.test(e) && /[^"\w]alter\b/i.test(sql) && !/\bALTER\s+TABLE\b/i.test(sql))) {
    return { code: 'alter-quote', message: '«alter» ist in SQLite ein reserviertes Wort (ALTER TABLE). Schreibe die Spalte in doppelten Anführungszeichen: "alter", z. B. SELECT name, "alter" FROM kunde.' };
  }
  if ((m = e.match(/no such table: (\S+)/i))) {
    return { code: 'tabelle-unbekannt', message: `Die Tabelle «${m[1]}» gibt es in dieser Datenbank nicht. Vorhanden: ${tableList}. Schau ins Schema.` };
  }
  if ((m = e.match(/no such column: (\S+)/i))) {
    const name = m[1];
    const bare = name.includes('.') ? name.split('.').pop() : name;
    let msg = `Die Spalte «${name}» gibt es nicht.`;
    if (name.includes('.') && allCols.has(bare.toLowerCase())) {
      msg += ` Die Spalte ${bare} gibt es zwar, aber nicht in dieser Tabelle – oder die Tabelle steht nicht im FROM.`;
    } else if (!allCols.has(bare.toLowerCase())) {
      msg += ` Ist «${bare}» vielleicht ein Wert und kein Spaltenname? Texte stehen in einfachen Anführungszeichen, z. B. '${bare}'. Sonst: Schreibweise im Schema prüfen.`;
    }
    return { code: 'spalte-unbekannt', message: msg };
  }
  if ((m = e.match(/ambiguous column name: (\S+)/i))) {
    const owners = tables.filter((t) => t.columns.some((c) => c.name.toLowerCase() === m[1].toLowerCase())).map((t) => t.name);
    return { code: 'mehrdeutig', message: `Die Spalte «${m[1]}» gibt es in mehreren Tabellen (${owners.join(', ')}). Schreibe tabelle.spalte, z. B. ${owners[0] || 'tabelle'}.${m[1]}.` };
  }
  if (/incomplete input/i.test(e)) {
    return { code: 'syntax', message: 'Die Abfrage ist unvollständig. Fehlt eine schliessende Klammer, ein Anführungszeichen oder ein Teil nach WHERE / AND?' };
  }
  if ((m = e.match(/near "([^"]*)": syntax error/i))) {
    const tok = m[1];
    let msg = `Syntaxfehler in der Nähe von «${tok}».`;
    if (/^(FROM|WHERE|ORDER|AND|OR)$/i.test(tok)) msg += ' Steht davor ein überflüssiges Komma oder fehlt etwas (z. B. eine Spalte oder ein Wert)?';
    else if (/^(SELCT|SELEC|FORM|WHER|ODER)$/i.test(tok)) msg += ' Ist das Schlüsselwort richtig geschrieben?';
    else if (/^BY$/i.test(tok)) msg += ' ORDER BY wird zusammen geschrieben: ORDER BY spalte.';
    else msg += ' Prüfe Kommas zwischen den Spalten, Schreibweise der Schlüsselwörter und die Reihenfolge SELECT → FROM → WHERE → ORDER BY.';
    return { code: 'syntax', message: msg };
  }
  if (/misuse of aggregate/i.test(e)) {
    return { code: 'syntax', message: 'Aggregatfunktionen (COUNT, SUM, MIN, MAX, AVG) dürfen nicht im WHERE stehen. Sie gehören in die SELECT-Liste.' };
  }
  if ((m = e.match(/no such function: (\w+)/i))) {
    return { code: 'syntax', message: `Die Funktion «${m[1]}» gibt es in SQLite nicht. Erlaubt sind COUNT, MIN, MAX, SUM, AVG.` };
  }
  if (/unrecognized token/i.test(e)) {
    return { code: 'syntax', message: 'Unbekanntes Zeichen. Oft fehlt ein schliessendes Anführungszeichen \' oder es wurde ein typografisches Anführungszeichen (‘ ’ « ») verwendet.' };
  }
  return { code: 'syntax', message: 'Fehlermeldung der Datenbank: ' + e };
}
