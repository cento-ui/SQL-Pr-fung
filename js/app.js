// Einstieg: Router, Ansichten, Hilfsblatt-/Schema-Panel.
import { el, clear, txt, shuffle, formatDate, DAY } from './util.js';
import { md } from './markdown.js';
import * as P from './progress.js';
import { loadDb, schemaOf, databases, runSql, sqlReady } from './db.js';
import {
  content, loadBasics, loadAllChapters, loadChapter, hilfsblatt, allTasks, isTask, taskId,
  instantiate, figur, lernziel, fehlerart, chapterDb, findTask,
} from './content.js';
import { renderTask, resultTable, schemaLine } from './tasks.js';
import { explainError, stoffHinweise } from './compare.js';
import { sqlEditor, highlightBlocks } from './highlight.js';

const PRUEFUNGSDATUM = new Date('2026-11-05T08:00:00');
const app = document.getElementById('app');
const ui = { currentDb: 'flugbuchung', drawerTab: 'hilfsblatt' };

// ---------------------------------------------------------------------------
// Allgemeine Bausteine

function examMode() { return !!P.setting('pruefungsmodus'); }

function storyNode(story) {
  if (!story) return null;
  const parts = Array.isArray(story) && story.length && typeof story[0] === 'object' ? story : [{ sprecher: 'tabea', text: story }];
  return el('div', { class: 'story' }, parts.map((p) => {
    const f = figur(p.sprecher || 'tabea');
    return el('div', { class: 'bubble-row' },
      el('div', { class: 'avatar', title: f.rolle }, f.name),
      el('div', { class: 'bubble' }, el('div', { class: 'speaker' }, f.name, el('span', { class: 'muted small' }, ' · ' + f.rolle)), el('div', { html: md(p.text) })));
  }));
}

function progressBar(value, label) {
  const pct = Math.round((value || 0) * 100);
  return el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': label || 'Fortschritt' },
    el('div', { class: 'bar-fill', style: `width:${pct}%` }));
}

function pathTasks(ch) {
  return (ch.schritte || []).filter(isTask);
}

function chapterProgress(ch) {
  if (!ch || ch.fehlt) return null;
  const tasks = pathTasks(ch);
  if (!tasks.length) return 0;
  return tasks.filter((t) => P.status(taskId(t)) === 'geloest').length / tasks.length;
}

function updateTopProgress() {
  const chs = content.index.kapitel.map((k) => content.chapters.get(k.id)).filter((c) => c && !c.fehlt);
  const tasks = chs.flatMap(pathTasks);
  const solved = tasks.filter((t) => P.status(taskId(t)) === 'geloest').length;
  const node = document.getElementById('top-progress');
  if (node) {
    clear(node);
    node.appendChild(progressBar(tasks.length ? solved / tasks.length : 0, 'Gesamtfortschritt im Lernpfad'));
    node.appendChild(el('span', { class: 'small muted' }, `${solved}/${tasks.length} Aufgaben im Lernpfad`));
  }
  const due = P.dueTasks(allTasks()).length;
  const badge = document.getElementById('due-badge');
  if (badge) { badge.textContent = due ? String(due) : ''; badge.hidden = !due; }
}

function heading(text, sub) {
  return el('header', { class: 'view-head' }, el('h1', { tabindex: '-1', id: 'view-title' }, text), sub ? el('p', { class: 'lead' }, sub) : null);
}

function focusTitle() {
  const h = document.getElementById('view-title');
  if (h) h.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function recordFor(task, quelle) {
  return (res, { first }) => {
    P.record(taskId(task), task.lz || [], res, { first, quelle, variante: task.variante });
    updateTopProgress();
  };
}

function daysUntilExam() {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(PRUEFUNGSDATUM.getFullYear(), PRUEFUNGSDATUM.getMonth(), PRUEFUNGSDATUM.getDate());
  return Math.round((b - a) / DAY);
}

// ---------------------------------------------------------------------------
// Startseite

function nextStep() {
  for (const k of content.index.kapitel) {
    const ch = content.chapters.get(k.id);
    if (!ch || ch.fehlt || k.nurPool) continue;
    const open = pathTasks(ch).find((t) => P.status(taskId(t)) !== 'geloest');
    if (open) return { ch, step: open };
  }
  return null;
}

function viewHome() {
  const days = daysUntilExam();
  const due = P.dueTasks(allTasks()).length;
  const nx = nextStep();
  const frag = el('div', { class: 'home' });
  frag.appendChild(heading('Die SQL-Detektei', 'Relationale Datenbanken und SQL – Schritt für Schritt zur Prüfung.'));
  frag.appendChild(el('p', { class: 'countdown' },
    days > 0 ? `Noch ${days} Tag${days === 1 ? '' : 'e'} bis zur Prüfung (Do, 5. November 2026). Hilfsmittel: nur das Hilfsblatt SQL.`
      : days === 0 ? 'Heute ist die Prüfung. Viel Erfolg!' : 'Die Prüfung vom 5. November 2026 ist vorbei. Üben geht trotzdem.'));
  frag.appendChild(storyNode([{ sprecher: 'tabea', text: 'Willkommen in der Datendetektei! Mein Kater **NULL** ist verschwunden – und alle Spuren stecken in Datenbanken. Du brauchst **kein Vorwissen**: Wir fangen bei «Was ist eine Tabelle?» an.' }]));

  const cards = el('div', { class: 'cards' });
  cards.appendChild(actionCard(nx ? 'Weiterlernen' : 'Lernpfad', nx ? `${nx.ch.meta.titel}: ${nx.step.titel || 'nächste Aufgabe'}` : 'Alle Aufgaben im Lernpfad gelöst – wiederhole oder mach eine Probeprüfung.', nx ? `#/kapitel/${nx.ch.id}/${nx.step.id}` : '#/kapitel/k01', true));
  cards.appendChild(actionCard(`Heute fällig (${due})`, due ? 'Aufgaben, die du wiederholen solltest (Spaced Repetition).' : 'Nichts fällig. Gelöste Aufgaben kommen in wachsenden Abständen wieder.', '#/training/faellig'));
  cards.appendChild(actionCard('Schwächen trainieren', 'Aufgaben aus deinen schwächsten Lernzielen.', '#/training/schwaechen'));
  cards.appendChild(actionCard('Einstufungstest', P.get().einstufung ? `Zuletzt am ${formatDate(P.get().einstufung.t)}.` : 'Kurzer Test: Was kannst du schon?', '#/einstufung'));
  cards.appendChild(actionCard('Probeprüfung', 'Wie in der Prüfung: nur Hilfsblatt, Zeitlimit, Auswertung nach Lernzielen.', '#/pruefung'));
  frag.appendChild(cards);

  frag.appendChild(el('h2', null, 'Kapitel'));
  const list = el('ol', { class: 'chapter-list' });
  content.index.kapitel.filter((k) => !k.nurPool).forEach((k, i) => {
    const ch = content.chapters.get(k.id);
    const prog = chapterProgress(ch);
    list.appendChild(el('li', { class: 'chapter-card' + (ch && ch.fehlt ? ' missing' : '') },
      el('a', { href: `#/kapitel/${k.id}` },
        el('span', { class: 'ch-num' }, String(i + 1)),
        el('span', { class: 'ch-body' },
          el('span', { class: 'ch-title' }, k.titel),
          el('span', { class: 'ch-lz small muted' }, (k.lernziele || []).join(' · ')),
          ch && !ch.fehlt ? progressBar(prog, `Fortschritt ${k.titel}`) : el('span', { class: 'small muted' }, 'Kapitel folgt')))));
  });
  frag.appendChild(list);
  if (!P.storageAvailable()) frag.appendChild(el('p', { class: 'note' }, 'Hinweis: Der Browser erlaubt keinen lokalen Speicher (z. B. im privaten Modus). Dein Fortschritt geht beim Schliessen verloren – exportiere ihn unter «Fortschritt».'));
  return frag;
}

function actionCard(title, text, href, primary) {
  return el('a', { class: 'card' + (primary ? ' card-primary' : ''), href }, el('strong', null, title), el('span', null, text));
}

// ---------------------------------------------------------------------------
// Kapitel (Lernpfad)

async function viewChapter(kid, stepId) {
  const ch = await loadChapter(kid);
  if (!ch) return el('div', null, heading('Kapitel nicht gefunden'), el('a', { href: '#/' }, 'Zur Startseite'));
  if (ch.fehlt) {
    return el('div', null, heading(ch.titel, 'Dieses Kapitel ist noch in Arbeit.'),
      el('p', null, 'Du kannst inzwischen mit den vorhandenen Kapiteln, dem Training oder der Spielwiese üben.'),
      el('a', { class: 'btn', href: '#/' }, 'Zur Startseite'));
  }
  if (ch.meta.nurPool) {
    return el('div', null, heading(ch.titel, 'Dieser Teil ist ein Aufgabenpool für Training und Probeprüfung.'),
      el('a', { class: 'btn', href: `#/training/kapitel/${kid}` }, 'Aufgaben üben'));
  }
  ui.currentDb = ch.db || ui.currentDb;
  const steps = ch.schritte || [];
  let idx = Math.max(0, steps.findIndex((s) => s.id === stepId));
  if (!stepId) {
    const p = P.pfad(kid);
    idx = p ? Math.min(p.schritt, steps.length - 1) : 0;
  }
  const step = steps[idx];
  P.visitStep(kid, step.id, idx);

  const root = el('div', { class: 'chapter' });
  root.appendChild(el('nav', { class: 'crumbs', 'aria-label': 'Brotkrumen' }, el('a', { href: '#/' }, 'Start'), ' / ', ch.titel));
  root.appendChild(heading(ch.titel, ch.untertitel));

  const nav = el('ol', { class: 'stepnav', 'aria-label': 'Schritte im Kapitel' });
  steps.forEach((s, i) => {
    const stt = isTask(s) ? P.status(taskId(s)) : (P.pfad(kid)?.besucht || []).includes(s.id) ? 'gelesen' : 'neu';
    nav.appendChild(el('li', null, el('a', {
      href: `#/kapitel/${kid}/${s.id}`, class: `step st-${stt}${isTask(s) ? ' is-task' : ''}`,
      'aria-current': i === idx ? 'step' : null,
      title: `${i + 1}. ${s.titel || (isTask(s) ? 'Aufgabe' : 'Info')} (${stt})`,
    }, String(i + 1))));
  });
  root.appendChild(nav);

  const card = el('article', { class: 'step-card' });
  if (step.titel && !isTask(step)) card.appendChild(el('h2', null, step.titel));
  const inst = isTask(step) ? instantiate(step, 0) : step;
  const s = storyNode(inst.story);
  if (s) card.appendChild(s);
  const goNext = () => { location.hash = idx < steps.length - 1 ? `#/kapitel/${kid}/${steps[idx + 1].id}` : `#/kapitel/${kid}/${step.id}#ende`; };
  if (isTask(step)) {
    const t = renderTask(inst, { hints: true, exam: examMode(), onResult: recordFor(step, 'pfad'), onNext: idx < steps.length - 1 ? goNext : null });
    card.appendChild(t.node);
  } else if (step.text) {
    const th = el('div', { class: 'theory', html: md(step.text) });
    highlightBlocks(th);
    card.appendChild(th);
  }
  root.appendChild(card);

  const pager = el('div', { class: 'pager' });
  pager.appendChild(idx > 0 ? el('a', { class: 'btn', href: `#/kapitel/${kid}/${steps[idx - 1].id}` }, '← Zurück') : el('span'));
  if (idx < steps.length - 1) pager.appendChild(el('a', { class: 'btn btn-primary', href: `#/kapitel/${kid}/${steps[idx + 1].id}` }, 'Weiter →'));
  root.appendChild(pager);

  if (idx === steps.length - 1) {
    const poolN = (ch.pool || []).filter(isTask).length + pathTasks(ch).length;
    const kIdx = content.index.kapitel.findIndex((k) => k.id === kid);
    const next = content.index.kapitel[kIdx + 1];
    root.appendChild(el('section', { class: 'chapter-end', id: 'ende' },
      el('h2', null, 'Kapitel-Ende'),
      el('p', null, `Fortschritt im Kapitel: ${Math.round((chapterProgress(ch) || 0) * 100)} %. Zum Festigen gibt es ${poolN} Übungsaufgaben mit wechselnden Varianten.`),
      el('div', { class: 'actions' },
        el('a', { class: 'btn btn-primary', href: `#/training/kapitel/${kid}` }, 'Kapitel üben'),
        next && !next.nurPool ? el('a', { class: 'btn', href: `#/kapitel/${next.id}` }, `Nächstes Kapitel: ${next.titel}`) : null)));
  }
  return root;
}

// ---------------------------------------------------------------------------
// Training-Sitzungen (fällig, Schwächen, Lernziel, Kapitel, Einstufung)

function weakestLz(tasks, n = 3) {
  const startedKapitel = new Set(Object.keys(P.get().pfad));
  return content.lernziele
    .map((l) => ({ l, m: P.mastery(l.id, tasks) }))
    .filter(({ l, m }) => m.total > 0 && (m.wert !== null || startedKapitel.has(l.kapitel)))
    .sort((a, b) => (a.m.wert ?? 0.4) - (b.m.wert ?? 0.4))
    .slice(0, n);
}

function prioritize(tasks) {
  const now = Date.now();
  const score = (t) => {
    const s = P.taskStat(taskId(t));
    if (!s) return 2;               // neu
    if (s.last && !s.last.ok) return 0; // zuletzt falsch
    if (s.due && s.due <= now) return 1; // fällig
    return 3 + (s.box || 0);
  };
  return shuffle(tasks).sort((a, b) => score(a) - score(b));
}

function buildSession(art, arg) {
  const pool = allTasks();
  switch (art) {
    case 'faellig':
      return { titel: 'Heute fällig', text: 'Wiederholung nach dem Leitner-Prinzip: Falsches kommt bald wieder, Richtiges in wachsenden Abständen.', tasks: P.dueTasks(pool).slice(0, 15) };
    case 'schwaechen': {
      const weak = weakestLz(pool);
      const ids = weak.map((w) => w.l.id);
      const tasks = prioritize(pool.filter((t) => (t.lz || []).some((l) => ids.includes(l)))).slice(0, 10);
      return { titel: 'Schwächen trainieren', text: weak.length ? `Schwerpunkt: ${weak.map((w) => `${w.l.id} ${w.l.kurz}`).join(', ')}.` : 'Noch keine Daten: Bearbeite zuerst ein Kapitel oder den Einstufungstest.', tasks };
    }
    case 'lz': {
      const l = lernziel(arg);
      return { titel: `Lernziel ${arg}`, text: l ? l.text : '', tasks: prioritize(pool.filter((t) => (t.lz || []).includes(arg))).slice(0, 10) };
    }
    case 'kapitel': {
      const ch = content.chapters.get(arg);
      return { titel: `Üben: ${ch ? ch.titel : arg}`, text: 'Aufgaben aus Lernpfad und Zusatzpool, gemischt und mit wechselnden Varianten.', tasks: prioritize(pool.filter((t) => t.kapitel === arg)).slice(0, 12) };
    }
    case 'einstufung': {
      const tasks = [];
      for (const l of content.lernziele) {
        const cands = pool.filter((t) => (t.lz || [])[0] === l.id && (t.stufe || 1) === 1);
        const any = cands.length ? cands : pool.filter((t) => (t.lz || []).includes(l.id));
        if (any.length) {
          const pick = shuffle(any)[0];
          if (!tasks.includes(pick)) tasks.push(pick);
        }
      }
      return { titel: 'Einstufungstest', text: 'Pro Lernziel eine kurze Aufgabe, ohne Hinweise. Danach siehst du, wo du starten solltest.', tasks: spread(tasks, 16), einstufung: true };
    }
    default:
      return { titel: 'Gemischtes Training', text: '', tasks: prioritize(pool).slice(0, 10) };
  }
}

/** Höchstens n Elemente, gleichmässig über die ganze Liste verteilt (Reihenfolge bleibt). */
function spread(list, n) {
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
}

let session = null;

function viewSession(art, arg) {
  const key = `${art}/${arg || ''}`;
  if (!session || session.key !== key || session.fertig) {
    const s = buildSession(art, arg);
    session = { key, ...s, items: s.tasks.map((t) => instantiate(t)), pos: 0, results: [], fertig: false };
  }
  const S = session;
  const root = el('div', { class: 'session' });
  root.appendChild(heading(S.titel, S.text));
  if (!S.items.length) {
    root.appendChild(el('p', null, art === 'faellig' ? 'Heute ist nichts fällig. Super!' : 'Für diese Auswahl gibt es (noch) keine Aufgaben.'));
    root.appendChild(el('div', { class: 'actions' }, el('a', { class: 'btn', href: '#/training/schwaechen' }, 'Schwächen trainieren'), el('a', { class: 'btn', href: '#/' }, 'Startseite')));
    return root;
  }
  if (S.pos >= S.items.length) return sessionSummary(S, root);

  const task = S.items[S.pos];
  ui.currentDb = chapterDb(task);
  root.appendChild(el('p', { class: 'muted' }, `Aufgabe ${S.pos + 1} von ${S.items.length}`));
  root.appendChild(progressBar(S.pos / S.items.length, 'Fortschritt der Sitzung'));
  const quelle = S.einstufung ? 'einstufung' : 'training';
  const rec = recordFor(task, quelle);
  const t = renderTask(task, {
    hints: !S.einstufung, exam: examMode() || S.einstufung,
    onResult: (res, info) => { if (info.first) S.results[S.pos] = { task, res }; rec(res, info); },
    onNext: () => { S.pos++; render(); },
  });
  root.appendChild(el('article', { class: 'step-card' }, t.node));
  root.appendChild(el('div', { class: 'pager' },
    el('a', { class: 'btn', href: `#/kapitel/${task.kapitel}` }, 'Zum Kapitel'),
    el('button', { class: 'btn', type: 'button', onclick: () => { S.pos++; render(); } }, 'Überspringen →')));
  return root;
}

function sessionSummary(S, root) {
  S.fertig = true;
  // Einstufung: übersprungene Aufgaben zählen als «noch nicht gekonnt»
  const done = S.einstufung
    ? S.items.map((t, i) => S.results[i] || { task: t, res: { ok: false } })
    : S.results.filter(Boolean);
  const ok = done.filter((r) => r.res.ok).length;
  root.appendChild(el('h2', null, 'Auswertung'));
  root.appendChild(el('p', null, `${ok} von ${done.length} bearbeiteten Aufgaben beim ersten Versuch richtig.`));
  const byLz = new Map();
  for (const r of done) for (const l of r.task.lz || []) {
    const v = byLz.get(l) || { ok: 0, n: 0 };
    v.n++; if (r.res.ok) v.ok++;
    byLz.set(l, v);
  }
  root.appendChild(lzTable([...byLz.entries()].map(([id, v]) => ({ id, ok: v.ok, n: v.n }))));
  if (S.einstufung) {
    const weak = [...byLz.entries()].filter(([, v]) => v.ok < v.n).map(([id]) => lernziel(id)).filter(Boolean);
    const firstWeak = content.index.kapitel.find((k) => weak.some((l) => l.kapitel === k.id));
    P.saveEinstufung({ t: Date.now(), proLz: Object.fromEntries(byLz) });
    root.appendChild(el('p', null, firstWeak ? `Empfehlung: Starte mit Kapitel «${firstWeak.titel}».` : 'Stark! Starte mit dem Training oder einer Probeprüfung.'));
    if (firstWeak) root.appendChild(el('a', { class: 'btn btn-primary', href: `#/kapitel/${firstWeak.id}` }, 'Zum empfohlenen Kapitel'));
  }
  root.appendChild(el('div', { class: 'actions' },
    el('button', { class: 'btn btn-primary', type: 'button', onclick: () => { session = null; render(); } }, 'Neue Runde'),
    el('a', { class: 'btn', href: '#/fortschritt' }, 'Fortschritt ansehen')));
  return root;
}

function lzTable(rows) {
  const t = el('table', { class: 'data lz-table' });
  t.appendChild(el('thead', null, el('tr', null, el('th', { scope: 'col' }, 'Lernziel'), el('th', { scope: 'col' }, 'Richtig'), el('th', { scope: 'col' }, 'Lernen'))));
  const tb = el('tbody');
  rows.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))).forEach((r) => {
    const l = lernziel(r.id);
    tb.appendChild(el('tr', null,
      el('td', null, `${r.id} ${l ? l.kurz : ''}`),
      el('td', null, `${r.ok}/${r.n}`),
      el('td', null, l ? el('a', { href: `#/kapitel/${l.kapitel}/${l.schritt}` }, 'Abschnitt') : '')));
  });
  t.appendChild(tb);
  return el('div', { class: 'table-wrap' }, t);
}

// ---------------------------------------------------------------------------
// Probeprüfung

let exam = null;

function pickExamTasks(n) {
  const pool = allTasks().filter((t) => t.pruefung !== false);
  const pref = shuffle(pool.filter((t) => t.kapitel === 'k13')).concat(shuffle(pool.filter((t) => t.kapitel !== 'k13')));
  const chosen = [];
  const covered = new Set();
  for (const l of shuffle(content.lernziele.map((x) => x.id))) {
    if (chosen.length >= n) break;
    if (covered.has(l)) continue;
    const t = pref.find((x) => !chosen.includes(x) && (x.lz || []).includes(l));
    if (t) { chosen.push(t); (t.lz || []).forEach((x) => covered.add(x)); }
  }
  for (const t of pref) { if (chosen.length >= n) break; if (!chosen.includes(t)) chosen.push(t); }
  return chosen;
}

function viewPruefung() {
  const root = el('div', { class: 'exam' });
  if (!exam || exam.status === 'fertig' && exam.shown) {
    root.appendChild(heading('Probeprüfung', 'Wie am 5. November: nur das Hilfsblatt, keine Hinweise, keine Rückmeldung bis zur Abgabe.'));
    const nSel = el('select', { id: 'ex-n' }, [8, 12, 16].map((n) => el('option', { value: String(n), selected: n === 12 }, `${n} Aufgaben`)));
    const tSel = el('select', { id: 'ex-t' }, [20, 30, 45, 60].map((m) => el('option', { value: String(m), selected: m === 45 }, `${m} Minuten`)));
    root.appendChild(el('div', { class: 'form-row' }, el('label', { for: 'ex-n' }, 'Umfang '), nSel, el('label', { for: 'ex-t' }, ' Zeit '), tSel));
    root.appendChild(el('ul', null,
      el('li', null, 'SQL-Abfragen kannst du nicht ausführen – wie auf Papier. Ausgewertet wird bei der Abgabe.'),
      el('li', null, 'Das Hilfsblatt öffnest du oben rechts (oder mit der Taste H ausserhalb von Eingabefeldern; auf dem Handy mit dem Knopf «Hilfsblatt»).'),
      el('li', null, 'Nach Ablauf der Zeit wird automatisch abgegeben.')));
    const prev = P.get().pruefungen.slice(-3).reverse();
    if (prev.length) root.appendChild(el('p', { class: 'muted' }, 'Letzte Ergebnisse: ' + prev.map((p) => `${formatDate(p.t)}: ${p.punkte}/${p.max}`).join(' · ')));
    root.appendChild(el('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
      const tasks = pickExamTasks(Number(nSel.value)).map((t) => instantiate(t));
      exam = { status: 'laeuft', tasks, start: Date.now(), ende: Date.now() + Number(tSel.value) * 60000, views: [], shown: false };
      render();
    } }, 'Prüfung starten'));
    return root;
  }
  if (exam.status === 'laeuft') {
    if (exam.root) return exam.root;
    exam.root = root;
    root.appendChild(heading('Probeprüfung läuft'));
    const timer = el('div', { class: 'timer', role: 'timer', 'aria-live': 'off' });
    root.appendChild(timer);
    const tick = () => {
      if (!exam || exam.status !== 'laeuft') return;
      const left = Math.max(0, exam.ende - Date.now());
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      timer.textContent = `Restzeit ${m}:${String(s).padStart(2, '0')}`;
      timer.classList.toggle('urgent', left < 5 * 60000);
      if (left <= 0) { submitExam(); return; }
      exam.timer = setTimeout(tick, 1000);
    };
    tick();
    exam.views = exam.tasks.map((t, i) => {
      const v = renderTask(t, { deferred: true, exam: true, hints: false });
      root.appendChild(el('article', { class: 'step-card' }, el('p', { class: 'exam-num' }, `Aufgabe ${i + 1}`), v.node));
      return v;
    });
    root.appendChild(confirmButton('Prüfung abgeben', 'Wirklich abgeben? Nochmals tippen', submitExam, 'btn btn-primary'));
    return root;
  }
  // Auswertung
  exam.shown = true;
  root.appendChild(heading('Auswertung der Probeprüfung', `${exam.punkte} von ${exam.tasks.length} Aufgaben richtig · Zeit: ${Math.round(exam.dauer / 60000)} min`));
  root.appendChild(lzTable(Object.entries(exam.proLz).map(([id, v]) => ({ id, ...v }))));
  root.appendChild(el('p', null, el('a', { class: 'btn', href: '#/training/schwaechen' }, 'Schwächen trainieren'), ' ', el('button', { class: 'btn', type: 'button', onclick: () => { exam = null; render(); } }, 'Neue Probeprüfung')));
  exam.tasks.forEach((t, i) => {
    const art = el('article', { class: 'step-card' }, el('p', { class: 'exam-num' }, `Aufgabe ${i + 1}: ${exam.results[i].ok ? 'richtig' : 'falsch'}`), exam.views[i].node);
    root.appendChild(art);
    exam.views[i].reveal(exam.results[i]);
  });
  return root;
}

async function submitExam() {
  if (!exam || exam.status !== 'laeuft') return;
  clearTimeout(exam.timer);
  exam.status = 'auswertung';
  const results = [];
  for (const v of exam.views) {
    try { results.push(await v.evaluate()); } catch (e) { results.push({ ok: false, code: null, message: String(e) }); }
  }
  const proLz = {};
  results.forEach((r, i) => {
    const t = exam.tasks[i];
    P.record(taskId(t), t.lz || [], r, { first: true, quelle: 'pruefung', variante: t.variante });
    for (const l of t.lz || []) { proLz[l] = proLz[l] || { ok: 0, n: 0 }; proLz[l].n++; if (r.ok) proLz[l].ok++; }
  });
  exam.results = results;
  exam.punkte = results.filter((r) => r.ok).length;
  exam.dauer = Date.now() - exam.start;
  exam.proLz = proLz;
  exam.status = 'fertig';
  P.savePruefung({ t: Date.now(), punkte: exam.punkte, max: exam.tasks.length, dauerMs: exam.dauer, proLz });
  updateTopProgress();
  render();
}

// ---------------------------------------------------------------------------
// Fortschritt / Schwächen-Dashboard

function viewFortschritt() {
  const pool = allTasks();
  const d = P.get();
  const root = el('div', { class: 'dashboard' });
  root.appendChild(heading('Fortschritt und Schwächen', 'Beherrschung pro Lernziel, typische Fehler und Wiederholung.'));
  const attempted = Object.keys(d.tasks).length;
  const due = P.dueTasks(pool).length;
  root.appendChild(el('div', { class: 'stats' },
    stat('Aufgaben im Pool', pool.length), stat('Schon geübt', attempted), stat('Heute fällig', due), stat('Probeprüfungen', d.pruefungen.length)));

  const weak = weakestLz(pool);
  if (weak.length) {
    root.appendChild(el('h2', null, 'Deine schwächsten Lernziele'));
    root.appendChild(el('ul', { class: 'weak' }, weak.map(({ l, m }) => el('li', null,
      el('span', { class: `dot ${m.ampel}`, 'aria-hidden': 'true' }), ` ${l.id} ${l.kurz}: ${m.wert === null ? 'noch nicht geübt' : Math.round(m.wert * 100) + ' %'} `,
      el('a', { href: `#/training/lz/${l.id}` }, 'üben'), ' · ', el('a', { href: `#/kapitel/${l.kapitel}/${l.schritt}` }, 'nachlesen')))));
    root.appendChild(el('a', { class: 'btn btn-primary', href: '#/training/schwaechen' }, 'Schwächen trainieren'));
  }

  root.appendChild(el('h2', null, 'Beherrschung pro Lernziel'));
  const t = el('table', { class: 'data lz-table' });
  t.appendChild(el('thead', null, el('tr', null, ['Ampel', 'Lernziel', 'Beherrschung', 'Geübt', 'Versuche', ''].map((h) => el('th', { scope: 'col' }, h)))));
  const tb = el('tbody');
  for (const l of content.lernziele) {
    const m = P.mastery(l.id, pool);
    const s = d.lz[l.id];
    tb.appendChild(el('tr', null,
      el('td', null, el('span', { class: `dot ${m.ampel}`, title: m.ampel }), el('span', { class: 'sr-only' }, m.ampel)),
      el('td', null, el('strong', null, l.id), ' ', l.kurz),
      el('td', null, m.wert === null ? '–' : `${Math.round(m.wert * 100)} %`),
      el('td', null, `${m.geuebt}/${m.total}`),
      el('td', null, s ? `${s.ok}/${s.n}` : '0'),
      el('td', null, m.total ? el('a', { href: `#/training/lz/${l.id}` }, 'üben') : el('span', { class: 'muted small' }, 'keine Aufgaben'))));
  }
  t.appendChild(tb);
  root.appendChild(el('div', { class: 'table-wrap' }, t));
  root.appendChild(el('p', { class: 'small muted' }, 'Ampel: grün ≥ 80 % (mind. 3 Aufgaben geübt), gelb ≥ 50 %, rot darunter, grau = noch nicht geübt. Neuere Versuche zählen stärker; Hinweise und angezeigte Lösungen geben weniger Punkte.'));

  const errs = P.typicalErrors();
  root.appendChild(el('h2', null, 'Typische Fehler'));
  if (!errs.length) root.appendChild(el('p', { class: 'muted' }, 'Noch keine Fehler gespeichert.'));
  else root.appendChild(el('ul', null, errs.map(([code, n]) => {
    const f = fehlerart(code);
    return el('li', null, `${f ? f.text : code} (${n}×)`, f && f.kapitel ? [' – ', el('a', { href: `#/kapitel/${f.kapitel}/${f.schritt}` }, f.konzept)] : null);
  })));

  if (d.pruefungen.length) {
    root.appendChild(el('h2', null, 'Probeprüfungen'));
    root.appendChild(el('ul', null, d.pruefungen.slice().reverse().map((p) => el('li', null, `${formatDate(p.t)}: ${p.punkte}/${p.max} richtig, ${Math.round(p.dauerMs / 60000)} min`))));
  }

  root.appendChild(el('h2', null, 'Daten sichern'));
  root.appendChild(storageHint());
  root.appendChild(el('p', { class: 'small muted' }, 'Der Fortschritt liegt nur in diesem Browser. Exportiere ihn, um das Gerät zu wechseln oder ihn zu sichern.'));
  const importMsg = el('p', { class: 'small', role: 'status' });
  const file = el('input', { type: 'file', accept: 'application/json,.json,text/plain', id: 'import-file', class: 'sr-only' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try { P.importJson(await f.text()); render(); }
    catch (e) { importMsg.textContent = 'Import fehlgeschlagen: ' + e.message; }
  });
  root.appendChild(el('div', { class: 'actions' },
    el('button', { class: 'btn', type: 'button', onclick: () => exportFile(importMsg) }, 'Exportieren (Datei)'),
    el('label', { class: 'btn', for: 'import-file' }, 'Importieren (Datei)'), file,
    confirmButton('Zurücksetzen', 'Wirklich alles löschen? Nochmals tippen', () => { P.reset(); render(); }, 'btn btn-danger')));

  // Alternative ohne Datei (iPhone/iPad): Text kopieren und wieder einfügen
  const box = el('textarea', { id: 'export-text', class: 'export-text', rows: 5, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', 'aria-label': 'Fortschritt als Text', placeholder: 'Hier erscheint der Fortschritt als Text, oder füge einen gesicherten Text ein.' });
  const copyBtn = el('button', { class: 'btn', type: 'button', onclick: async () => {
    box.value = P.exportJson();
    const ok = await copyText(box.value, box);
    importMsg.textContent = ok ? 'Fortschritt in die Zwischenablage kopiert. Bewahre den Text z. B. in Notizen auf.' : 'Kopieren nicht möglich: Markiere den Text im Feld und kopiere ihn von Hand.';
  } }, 'In Zwischenablage kopieren');
  const pasteBtn = el('button', { class: 'btn', type: 'button', onclick: () => {
    if (!box.value.trim()) { importMsg.textContent = 'Füge zuerst den gesicherten Text in das Feld ein.'; return; }
    try { P.importJson(box.value); render(); } catch (e) { importMsg.textContent = 'Import fehlgeschlagen: ' + e.message; }
  } }, 'Aus Text importieren');
  root.appendChild(el('details', { class: 'text-backup' },
    el('summary', null, 'Als Text sichern oder einfügen (für iPhone und iPad)'),
    el('p', { class: 'small muted' }, 'Kopieren, in Notizen oder eine Nachricht einfügen. Zum Wiederherstellen den Text hier einfügen und «Aus Text importieren» tippen. Das ersetzt den aktuellen Fortschritt.'),
    box, el('div', { class: 'actions' }, copyBtn, pasteBtn)));
  root.appendChild(importMsg);
  return root;
}

function isStandalone() {
  return !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
}

/** Ruhiger, einmaliger Hinweis zum Browser-Speicher (schliessbar, gemerkt in den Einstellungen). */
function storageHint() {
  if (P.setting('hinweisSpeicher') || isStandalone()) return document.createDocumentFragment();
  const box = el('aside', { class: 'storage-hint', 'aria-label': 'Hinweis zum Speicher' },
    el('p', null, el('strong', null, 'Gut zu wissen: '), 'Safari auf iPhone und iPad löscht die Daten einer Webseite, wenn du sie 7 Tage lang nicht besuchst; im privaten Modus bleibt nichts gespeichert. Sichere deinen Fortschritt darum ab und zu mit «Exportieren» oder als Text. Mit «Teilen → Zum Home-Bildschirm» wird die Seite zur App, die dieses Problem nicht hat.'),
    el('button', { class: 'btn btn-small', type: 'button', onclick: () => { P.setting('hinweisSpeicher', true); box.remove(); } }, 'Verstanden'));
  return box;
}

async function copyText(text, fallbackField) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* weiter mit Ersatz */ }
  try {
    fallbackField.focus();
    fallbackField.select();
    fallbackField.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch { return false; }
}

/** Export als Datei: auf Touch-Geräten zuerst das Teilen-Menü (zuverlässiger als download), sonst Download-Link. */
async function exportFile(msg) {
  const name = `sql-fortschritt-${new Date().toISOString().slice(0, 10)}.json`;
  const text = P.exportJson();
  try {
    const f = new File([text], name, { type: 'application/json' });
    if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: 'SQL-Fortschritt' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  msg.textContent = 'Falls kein Download startet (iPhone/iPad), nutze «Als Text sichern».';
}

/** Zweistufiger Knopf statt Bestätigungsdialog: erstes Tippen fragt nach, zweites führt aus (6 s Zeit). */
function confirmButton(label, askLabel, action, cls) {
  let armed = false;
  let timer = null;
  const b = el('button', { class: cls, type: 'button', onclick: () => {
    if (!armed) {
      armed = true;
      b.textContent = askLabel;
      b.classList.add('armed');
      timer = setTimeout(() => { armed = false; b.textContent = label; b.classList.remove('armed'); }, 6000);
      return;
    }
    clearTimeout(timer);
    action();
  } }, label);
  return b;
}

function stat(label, value) {
  return el('div', { class: 'stat' }, el('span', { class: 'stat-val' }, String(value)), el('span', { class: 'stat-label' }, label));
}

// ---------------------------------------------------------------------------
// Spielwiese (freies Üben)

async function viewSpielwiese() {
  const dbs = await databases();
  const root = el('div', { class: 'playground' });
  root.appendChild(heading('Spielwiese', 'Freies Üben auf allen Datenbanken. Nichts wird bewertet, nichts geht kaputt.'));
  const sel = el('select', { id: 'pg-db' }, dbs.map((d) => el('option', { value: d.id, selected: d.id === ui.currentDb }, d.titel)));
  const info = el('p', { class: 'small muted' });
  const schemaSlot = el('div');
  const area = el('textarea', { id: 'pg-sql', class: 'sql-input', rows: 6, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', enterkeyhint: 'enter' });
  const out = el('div', { class: 'sql-output', 'aria-live': 'polite' });
  const run = async () => {
    clear(out);
    const sql = area.value.trim();
    if (!sql) return;
    const r = await runSql(sel.value, sql);
    if (!r.ok) { out.appendChild(el('div', { class: 'error' }, explainError(r.error, sql, await schemaOf(sel.value)).message)); return; }
    if (r.columns) out.appendChild(resultTable(r.columns, r.rows, { max: 500 }));
    else out.appendChild(el('p', { class: 'muted' }, 'Ausgeführt, ohne Ergebnistabelle.'));
    for (const n of stoffHinweise(sql)) out.appendChild(el('p', { class: 'note' }, n));
  };
  const showSchema = async () => {
    ui.currentDb = sel.value;
    const meta = dbs.find((d) => d.id === sel.value);
    info.textContent = meta.beschreibung;
    clear(schemaSlot).appendChild(schemaLine(await schemaOf(sel.value)));
    const first = (await schemaOf(sel.value)).tables[0];
    if (!area.value.trim() && first) area.value = `SELECT * FROM ${first.name}`;
  };
  sel.addEventListener('change', () => { area.value = ''; clear(out); showSchema(); });
  area.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
  root.appendChild(el('div', { class: 'form-row' }, el('label', { for: 'pg-db' }, 'Datenbank '), sel));
  root.appendChild(info);
  root.appendChild(schemaSlot);
  root.appendChild(el('label', { for: 'pg-sql', class: 'label' }, 'SQL ', el('span', { class: 'muted small kbd-hint' }, '(Ctrl/Cmd + Enter = Ausführen)')));
  root.appendChild(sqlEditor(area));
  root.appendChild(el('div', { class: 'actions' }, el('button', { class: 'btn btn-primary', type: 'button', onclick: run }, 'Ausführen')));
  root.appendChild(out);
  await showSchema();
  return root;
}

// ---------------------------------------------------------------------------
// Panel: Hilfsblatt und Schema

const drawer = document.getElementById('drawer');
const drawerBody = document.getElementById('drawer-body');

async function openDrawer(tab) {
  if (examMode()) tab = 'hilfsblatt';
  ui.drawerTab = tab;
  drawer.hidden = false;
  document.body.classList.add('drawer-open');
  document.querySelectorAll('[data-drawer-tab]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.drawerTab === tab && !drawer.hidden));
  });
  document.getElementById('tab-schema').hidden = examMode();
  document.querySelectorAll('.drawer-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  clear(drawerBody);
  if (tab === 'hilfsblatt') {
    const hb = el('div', { class: 'hilfsblatt', html: md(await hilfsblatt()) });
    highlightBlocks(hb);
    drawerBody.appendChild(hb);
  } else {
    const dbs = await databases();
    const sel = el('select', { 'aria-label': 'Datenbank für das Schema' }, dbs.map((d) => el('option', { value: d.id, selected: d.id === ui.currentDb }, d.titel)));
    sel.addEventListener('change', () => { ui.currentDb = sel.value; openDrawer('schema'); });
    drawerBody.appendChild(el('div', { class: 'form-row' }, sel));
    const schema = await schemaOf(ui.currentDb);
    for (const t of schema.tables) {
      const dataSlot = el('div');
      drawerBody.appendChild(el('section', { class: 'schema-card' },
        el('h3', null, t.name, el('span', { class: 'muted small' }, ` (${t.rows} Zeilen)`)),
        el('ul', null, t.columns.map((c) => el('li', null,
          c.pk ? el('span', { class: 'badge pk', title: 'Primärschlüssel' }, 'PK') : null,
          c.fk ? el('span', { class: 'badge fk', title: 'Fremdschlüssel' }, 'FK') : null,
          el('code', null, c.name), ' ', el('span', { class: 'muted small' }, c.type),
          c.fk ? el('span', { class: 'small' }, ` → ${c.fk.table}.${c.fk.column}`) : null))),
        el('button', { class: 'btn btn-small', type: 'button', onclick: async (e) => {
          if (dataSlot.childNodes.length) { clear(dataSlot); e.target.textContent = 'Daten zeigen'; return; }
          const r = await runSql(ui.currentDb, `SELECT * FROM "${t.name}"`);
          dataSlot.appendChild(resultTable(r.columns, r.rows, { max: 100 }));
          e.target.textContent = 'Daten verbergen';
        } }, 'Daten zeigen'), dataSlot));
    }
  }
  drawer.scrollTop = 0;
  drawerBody.focus({ preventScroll: true });
}

function closeDrawer() {
  drawer.hidden = true;
  document.body.classList.remove('drawer-open');
  document.querySelectorAll('[data-drawer-tab]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
}

function toggleDrawer(tab) {
  if (!drawer.hidden && ui.drawerTab === tab) closeDrawer();
  else openDrawer(tab);
}

// ---------------------------------------------------------------------------
// Router

let rendering = 0;
async function render() {
  const my = ++rendering;
  const parts = location.hash.replace(/^#\/?/, '').split('#')[0].split('/').filter(Boolean);
  let view;
  try {
    switch (parts[0]) {
      case undefined: view = viewHome(); break;
      case 'kapitel': view = await viewChapter(parts[1], parts[2]); break;
      case 'training': view = viewSession(parts[1] || 'mix', parts[2]); break;
      case 'einstufung': view = viewSession('einstufung'); break;
      case 'pruefung': view = viewPruefung(); break;
      case 'fortschritt': view = viewFortschritt(); break;
      case 'spielwiese': view = await viewSpielwiese(); break;
      default: view = el('div', null, heading('Seite nicht gefunden'), el('a', { href: '#/' }, 'Zur Startseite'));
    }
  } catch (e) {
    console.error(e);
    view = el('div', null, heading('Fehler'), el('p', { class: 'error' }, String(e && e.message ? e.message : e)));
  }
  if (my !== rendering) return;
  if (exam && exam.status === 'laeuft' && parts[0] !== 'pruefung') {
    // Laufende Prüfung nicht verlassen
    location.hash = '#/pruefung';
    return;
  }
  clear(app).appendChild(view);
  document.querySelectorAll('.mainnav a').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#\/?/, '').split('/')[0];
    if (target === (parts[0] || '')) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  updateTopProgress();
  if (!drawer.hidden && ui.drawerTab === 'schema') openDrawer('schema');
  focusTitle();
}

async function boot() {
  P.load();
  const toggle = document.getElementById('exam-toggle');
  toggle.checked = examMode();
  document.body.classList.toggle('exam-mode', toggle.checked);
  toggle.addEventListener('change', () => {
    P.setting('pruefungsmodus', toggle.checked);
    document.body.classList.toggle('exam-mode', toggle.checked);
    if (!drawer.hidden) openDrawer(ui.drawerTab);
    render();
  });
  document.querySelectorAll('[data-drawer-tab]').forEach((b) => b.addEventListener('click', () => toggleDrawer(b.dataset.drawerTab)));
  document.querySelectorAll('.drawer-tabs [role=tab]').forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.tab)));
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) { closeDrawer(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'h' || e.key === 'H')) toggleDrawer('hilfsblatt');
  });
  window.addEventListener('hashchange', render);
  const topbar = document.querySelector('.topbar');
  if (topbar && 'ResizeObserver' in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px')).observe(topbar);
  }
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  try {
    await loadBasics();
    await loadAllChapters();
  } catch (e) {
    clear(app).appendChild(el('div', null, heading('Inhalte konnten nicht geladen werden'),
      el('p', { class: 'error' }, String(e.message || e)),
      el('p', null, 'Die Seite muss über einen Webserver geöffnet werden (nicht per Doppelklick als Datei). Siehe README.')));
    return;
  }
  sqlReady().then(() => loadDb('flugbuchung')).catch((e) => {
    const n = document.getElementById('sql-status');
    if (n) { n.hidden = false; n.textContent = 'SQL-Engine konnte nicht geladen werden (Internetverbindung?): ' + e.message; }
  });
  render();
}

boot();
