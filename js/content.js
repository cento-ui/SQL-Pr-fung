// Inhalte laden: Kapitelverzeichnis, Kapitel, Lernziele, Figuren, Fehlerarten.
// Baut den Aufgabenpool (alle Aufgaben aller Kapitel, mit globaler Id "kapitel.aufgabe").
import { fetchJson, fetchText, pickRandom } from './util.js';

export const TASK_TYPES = ['sql', 'ergebnis', 'choice', 'text', 'zuordnen', 'tabelle'];

const state = {
  index: null,
  chapters: new Map(), // id -> chapter | {fehlt: true}
  lernziele: null,
  figuren: null,
  fehlerarten: null,
  hilfsblatt: null,
};

export async function loadBasics() {
  const [index, lernziele, figuren, fehlerarten] = await Promise.all([
    fetchJson('chapters/index.json'),
    fetchJson('data/lernziele.json'),
    fetchJson('data/figuren.json'),
    fetchJson('data/fehlerarten.json'),
  ]);
  Object.assign(state, { index, lernziele, figuren, fehlerarten });
  return state;
}

export const content = state;

export async function loadChapter(id) {
  if (state.chapters.has(id)) return state.chapters.get(id);
  const meta = state.index.kapitel.find((k) => k.id === id);
  if (!meta) return null;
  let ch;
  try {
    ch = await fetchJson(meta.datei);
    ch.meta = meta;
    for (const s of ch.schritte || []) s.kapitel = ch.id;
    for (const s of ch.pool || []) { s.kapitel = ch.id; s.nurPool = true; }
  } catch (e) {
    ch = { id, fehlt: true, meta, titel: meta.titel, fehler: String(e) };
  }
  state.chapters.set(id, ch);
  return ch;
}

export async function loadAllChapters() {
  await Promise.all(state.index.kapitel.map((k) => loadChapter(k.id)));
  return state.index.kapitel.map((k) => state.chapters.get(k.id));
}

export async function hilfsblatt() {
  if (!state.hilfsblatt) state.hilfsblatt = await fetchText('data/hilfsblatt.md');
  return state.hilfsblatt;
}

export const isTask = (s) => s && TASK_TYPES.includes(s.typ);
export const taskId = (t) => `${t.kapitel}.${t.id}`;

/** Alle Aufgaben (Lernpfad + Pool) aller geladenen Kapitel. */
export function allTasks() {
  const out = [];
  for (const k of state.index.kapitel) {
    const ch = state.chapters.get(k.id);
    if (!ch || ch.fehlt) continue;
    for (const s of ch.schritte || []) if (isTask(s)) out.push(s);
    for (const s of ch.pool || []) if (isTask(s)) out.push(s);
  }
  return out;
}

export function findTask(gid) {
  const [kid, tid] = gid.split('.');
  const ch = state.chapters.get(kid);
  if (!ch || ch.fehlt) return null;
  return (ch.schritte || []).concat(ch.pool || []).find((s) => s.id === tid && isTask(s)) || null;
}

export function chapterDb(task) {
  const ch = state.chapters.get(task.kapitel);
  return task.db || (ch && ch.db) || 'flugbuchung';
}

function substitute(value, params) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in params ? String(params[k]) : m));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, params));
  if (value && typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = k === 'parameter' ? v : substitute(v, params);
    return o;
  }
  return value;
}

/**
 * Konkrete Variante einer Aufgabe. Mit "parameter": [{...}, ...] werden {{name}}-Platzhalter
 * ersetzt. variante: Index oder undefined (zufällig).
 */
export function instantiate(task, variante) {
  const params = task.parameter;
  if (!Array.isArray(params) || params.length === 0) return { ...task, variante: null };
  const idx = Number.isInteger(variante) && variante >= 0 && variante < params.length
    ? variante
    : params.indexOf(pickRandom(params));
  const inst = substitute(task, params[idx]);
  inst.kapitel = task.kapitel;
  inst.variante = idx;
  return inst;
}

export function figur(id) {
  return (state.figuren || []).find((f) => f.id === id) || state.figuren[0];
}

export function lernziel(id) {
  return (state.lernziele || []).find((l) => l.id === id);
}

export function fehlerart(code) {
  return (state.fehlerarten || {})[code] || null;
}

/** Link zum Lernabschnitt: zuerst zur Fehlerart, sonst zum ersten Lernziel der Aufgabe. */
export function lernLink(code, task) {
  const f = code ? fehlerart(code) : null;
  if (f && f.kapitel) return { href: `#/kapitel/${f.kapitel}/${f.schritt}`, label: f.konzept };
  const lz = task && task.lz && task.lz.length ? lernziel(task.lz[0]) : null;
  if (lz) return { href: `#/kapitel/${lz.kapitel}/${lz.schritt}`, label: `${lz.id}: ${lz.kurz}` };
  return null;
}
