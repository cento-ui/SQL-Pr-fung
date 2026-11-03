// Fortschritt, Statistik und Wiederholung (Leitner-Boxen) in localStorage.
// Jeder Zugriff auf localStorage ist in try/catch: ohne Speicher läuft alles im Arbeitsspeicher.
import { DAY } from './util.js';

const KEY = 'sql-pruefung.fortschritt.v1';
const LOG_MAX = 1500;
// Wartezeit pro Box (Box 1 = bald wieder, Box 5 = gefestigt)
export const BOX_INTERVAL = [0, 10 * 60 * 1000, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];

function empty() {
  return { v: 1, tasks: {}, lz: {}, log: [], pfad: {}, settings: { pruefungsmodus: false }, pruefungen: [], einstufung: null };
}

let data = empty();
let storageOk = true;
const listeners = new Set();

export function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) data = Object.assign(empty(), JSON.parse(raw));
  } catch {
    storageOk = false;
  }
  return data;
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    storageOk = true;
  } catch {
    storageOk = false;
  }
  for (const fn of listeners) {
    try { fn(data); } catch { /* ignorieren */ }
  }
}

export const onChange = (fn) => listeners.add(fn);
export const storageAvailable = () => storageOk;
export const get = () => data;
export const taskStat = (gid) => data.tasks[gid] || null;

export function setting(name, value) {
  if (value === undefined) return data.settings[name];
  data.settings[name] = value;
  save();
  return value;
}

/**
 * Einen Versuch speichern.
 * gid: "k01.a-erste-abfrage", lz: ["L12"], res: {ok, code, hints, shown}
 * first: erster Versuch dieser Begegnung (nur dieser verändert Box und Beherrschung)
 * quelle: 'pfad' | 'training' | 'einstufung' | 'pruefung'
 */
export function record(gid, lz, res, { first = true, quelle = 'pfad', variante = null } = {}) {
  const now = Date.now();
  const t = data.tasks[gid] || { n: 0, ok: 0, fail: 0, hints: 0, shown: 0, box: 0, due: null, ema: null, errs: {}, solved: false };
  t.n++;
  if (res.ok) t.ok++; else t.fail++;
  if (res.code) t.errs[res.code] = (t.errs[res.code] || 0) + 1;
  t.hints = Math.max(t.hints || 0, res.hints || 0);
  if (res.shown) t.shown++;
  if (res.ok && !res.shown) t.solved = true;
  t.last = { t: now, ok: !!res.ok, code: res.code || null, hints: res.hints || 0, shown: !!res.shown };
  if (first || res.shown) {
    // Wert dieser Begegnung: ohne Hilfe 1, mit Hinweisen 0.6, Lösung angesehen 0.2, falsch 0
    const v = res.shown ? 0.2 : res.ok ? (res.hints ? 0.6 : 1) : 0;
    t.ema = t.ema === null || t.ema === undefined ? v : 0.5 * v + 0.5 * t.ema;
    if (res.ok && !res.shown && !res.hints) t.box = Math.min(5, (t.box || 0) + 1);
    else if (res.ok && !res.shown) t.box = Math.max(1, t.box || 1);
    else t.box = 1;
    t.due = now + BOX_INTERVAL[t.box];
  }
  data.tasks[gid] = t;
  for (const id of lz || []) {
    const s = data.lz[id] || { n: 0, ok: 0, fail: 0, errs: {} };
    s.n++;
    if (res.ok) s.ok++; else s.fail++;
    if (res.code) s.errs[res.code] = (s.errs[res.code] || 0) + 1;
    s.last = now;
    data.lz[id] = s;
  }
  data.log.push({ t: now, id: gid, lz, ok: !!res.ok, code: res.code || null, h: res.hints || 0, s: !!res.shown, q: quelle, var: variante });
  if (data.log.length > LOG_MAX) data.log.splice(0, data.log.length - LOG_MAX);
  save();
  return t;
}

export function visitStep(kid, stepId, index) {
  const p = data.pfad[kid] || { schritt: 0, besucht: [] };
  p.schritt = index;
  if (!p.besucht.includes(stepId)) p.besucht.push(stepId);
  p.zuletzt = Date.now();
  data.pfad[kid] = p;
  save();
}

export const pfad = (kid) => data.pfad[kid] || null;

/** Status einer Aufgabe für die Anzeige: neu | geloest | gezeigt | falsch */
export function status(gid) {
  const t = data.tasks[gid];
  if (!t) return 'neu';
  if (t.solved) return 'geloest';
  if (t.shown) return 'gezeigt';
  return 'falsch';
}

/** Beherrschung eines Lernziels über alle zugehörigen Aufgaben. */
export function mastery(lzId, tasks) {
  const list = tasks.filter((t) => (t.lz || []).includes(lzId));
  const ids = list.map((t) => `${t.kapitel}.${t.id}`);
  const seen = ids.map((id) => data.tasks[id]).filter((s) => s && s.ema !== null && s.ema !== undefined);
  if (!seen.length) return { wert: null, geuebt: 0, total: ids.length, ampel: 'grau' };
  const wert = seen.reduce((a, s) => a + s.ema, 0) / seen.length;
  let ampel = wert >= 0.8 ? 'gruen' : wert >= 0.5 ? 'gelb' : 'rot';
  if (ampel === 'gruen' && seen.length < Math.min(3, ids.length)) ampel = 'gelb';
  return { wert, geuebt: seen.length, total: ids.length, ampel };
}

export function dueTasks(tasks, now = Date.now()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return tasks
    .map((t) => ({ t, s: data.tasks[`${t.kapitel}.${t.id}`] }))
    .filter(({ s }) => s && s.due !== null && s.due <= end.getTime())
    .sort((a, b) => a.s.due - b.s.due)
    .map(({ t }) => t);
}

/** Häufigste Fehlerarten (aus dem Log der letzten Versuche). */
export function typicalErrors(limit = 5) {
  const m = new Map();
  for (const e of data.log.slice(-400)) if (!e.ok && e.code) m.set(e.code, (m.get(e.code) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function savePruefung(result) {
  data.pruefungen.push(result);
  save();
}

export function saveEinstufung(result) {
  data.einstufung = result;
  save();
}

export function exportJson() {
  return JSON.stringify({ app: 'sql-pruefung', exportiert: new Date().toISOString(), daten: data }, null, 2);
}

export function importJson(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Das ist keine gültige JSON-Datei.'); }
  const d = obj && obj.daten ? obj.daten : obj;
  if (!d || typeof d !== 'object' || !d.tasks || !d.log) throw new Error('Datei enthält keinen gültigen Fortschritt.');
  data = Object.assign(empty(), d);
  save();
}

export function reset() {
  const keepSettings = data.settings;
  data = empty();
  data.settings = keepSettings;
  save();
}
