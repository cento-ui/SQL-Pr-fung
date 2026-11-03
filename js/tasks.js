// Darstellung und Auswertung der Aufgabentypen:
// sql, ergebnis, choice, text, zuordnen, tabelle.
import { el, clear, txt, normAnswer, shuffle } from './util.js';
import { md } from './markdown.js';
import { runSql, schemaOf } from './db.js';
import { compareResults, checkKeywords, explainError, stoffHinweise, rowKey, canon } from './compare.js';
import { chapterDb, lernLink, lernziel, taskId } from './content.js';
import { sqlEditor, highlightBlocks, highlightSql } from './highlight.js';

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

const TYP_LABEL = {
  sql: 'SQL schreiben',
  ergebnis: 'Ergebnis bestimmen',
  choice: 'Auswahl',
  text: 'Kurzantwort',
  zuordnen: 'Zuordnen',
  tabelle: 'Tabelle ausfüllen',
};

export function resultTable(columns, rows, { max = 200, caption } = {}) {
  const wrap = el('div', { class: 'table-wrap result' });
  const table = el('table', { class: 'data' });
  if (caption) table.appendChild(el('caption', null, caption));
  table.appendChild(el('thead', null, el('tr', null, columns.map((c) => el('th', { scope: 'col' }, c)))));
  const tb = el('tbody');
  rows.slice(0, max).forEach((r) => tb.appendChild(el('tr', null, r.map((v) => el('td', { class: v === null ? 'null' : null }, v === null ? 'NULL' : canon(v))))));
  table.appendChild(tb);
  wrap.appendChild(table);
  const info = rows.length > max ? ` (die ersten ${max} angezeigt)` : '';
  wrap.appendChild(el('p', { class: 'muted small' }, `${rows.length} Zeile${rows.length === 1 ? '' : 'n'}${info}`));
  return wrap;
}

/** Kompakte Schema-Zeile wie bei SQL Island: tabelle(spalte1, spalte2, ...) */
export function schemaLine(schema) {
  return el('div', { class: 'schema-line', 'aria-label': 'Schema der Datenbank' },
    schema.tables.map((t) => el('span', { class: 'schema-table' },
      el('strong', null, t.name), '(',
      t.columns.map((c, i) => [i ? ', ' : '', el('span', { class: c.pk ? 'pk' : c.fk ? 'fk' : null, title: c.pk ? 'Primärschlüssel' : c.fk ? `Fremdschlüssel → ${c.fk.table}.${c.fk.column}` : c.type }, c.name)]),
      ')')));
}

/** Tabellen/Abfragen anzeigen, die zur Aufgabe gehören ("zeigen"). */
async function renderZeigen(task, db) {
  const items = task.zeigen || [];
  if (!items.length) return null;
  const box = el('div', { class: 'zeigen' });
  for (const it of items) {
    const sql = typeof it === 'string' ? `SELECT * FROM ${it}` : it.sql;
    const title = typeof it === 'string' ? `Tabelle ${it}` : it.titel || '';
    const r = await runSql(db, sql);
    if (!r.ok) { box.appendChild(el('p', { class: 'error' }, `Anzeige fehlerhaft: ${r.error}`)); continue; }
    box.appendChild(resultTable(r.columns, r.rows, { caption: title }));
  }
  return box;
}

function tagList(task) {
  const tags = el('div', { class: 'tags' });
  tags.appendChild(el('span', { class: 'tag tag-typ' }, TYP_LABEL[task.typ] || task.typ));
  for (const id of task.lz || []) {
    const l = lernziel(id);
    tags.appendChild(el('span', { class: 'tag', title: l ? l.text : id }, l ? `${id} ${l.kurz}` : id));
  }
  if (task.stufe) tags.appendChild(el('span', { class: 'tag tag-stufe', title: 'Schwierigkeit' }, '●'.repeat(task.stufe) + '○'.repeat(Math.max(0, 3 - task.stufe))));
  return tags;
}

/**
 * Rendert eine Aufgabe.
 * ctx: {
 *   deferred: true = keine Sofort-Auswertung (Probeprüfung), evaluate() wird extern aufgerufen
 *   hints: Hinweise/Lösung erlaubt
 *   exam: Prüfungsmodus (kein freies Ausführen, keine Ergebnistabellen vor dem Prüfen)
 *   onResult(res, {first}) wird nach jeder Auswertung aufgerufen (nicht im deferred-Modus)
 *   onNext: optional, Knopf "Weiter" nach dem Lösen
 * }
 */
export function renderTask(task, ctx = {}) {
  const db = chapterDb(task);
  const st = { hints: 0, shown: false, attempts: 0, done: false };
  const fb = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const hintBox = el('div', { class: 'hints' });
  const explain = el('div', { class: 'erklaerung', hidden: true });
  const solutionBox = el('div', { class: 'loesung', hidden: true });
  const extra = el('div', { class: 'extra' });
  const actions = el('div', { class: 'actions' });

  const root = el('section', { class: `task task-${task.typ}`, 'aria-label': task.titel || 'Aufgabe' });
  root.appendChild(tagList(task));
  if (task.titel) root.appendChild(el('h3', { class: 'task-title', tabindex: '-1' }, task.titel));
  root.appendChild(el('div', { class: 'frage', html: md(task.frage) }));
  const zeigenSlot = el('div');
  root.appendChild(zeigenSlot);
  renderZeigen(task, db).then((n) => n && zeigenSlot.appendChild(n)).catch((e) => zeigenSlot.appendChild(el('p', { class: 'error' }, String(e))));

  const impl = IMPL[task.typ];
  if (!impl) {
    root.appendChild(el('p', { class: 'error' }, `Unbekannter Aufgabentyp «${task.typ}»`));
    return { node: root, evaluate: async () => ({ ok: false, code: null, message: 'Unbekannter Typ' }) };
  }
  const body = impl.render(task, { db, ctx, extra });
  root.appendChild(body.node);
  root.appendChild(actions);
  root.appendChild(fb);
  root.appendChild(hintBox);
  root.appendChild(solutionBox);
  root.appendChild(explain);
  root.appendChild(extra);
  highlightBlocks(root);

  function showFeedback(res) {
    clear(fb);
    fb.className = 'feedback ' + (res.ok ? 'ok' : 'bad');
    fb.appendChild(el('p', { class: 'fb-title' }, res.ok ? (res.shown ? 'Lösung angezeigt.' : 'Richtig') : 'Noch nicht ganz'));
    if (res.message && !(res.ok && res.message === 'Richtig!')) fb.appendChild(el('div', { html: md(res.message) }));
    for (const n of res.notes || []) fb.appendChild(el('p', { class: 'note' }, n));
    if (!res.ok && !ctx.exam) {
      const link = lernLink(res.code, task);
      if (link) fb.appendChild(el('p', { class: 'small' }, 'Fehlt ein Konzept? ', el('a', { href: link.href }, `Zum Lernabschnitt: ${link.label}`)));
    }
  }

  function showExplanation() {
    if (task.erklaerung) {
      clear(explain);
      explain.appendChild(el('h4', null, 'Erklärung'));
      explain.appendChild(el('div', { html: md(task.erklaerung) }));
      explain.hidden = false;
    }
    if (ctx.onNext) {
      const old = actions.querySelector('.btn-next');
      if (!old) actions.appendChild(el('button', { class: 'btn btn-next', type: 'button', onclick: ctx.onNext }, 'Weiter →'));
    }
  }

  async function evaluate() {
    const res = await body.evaluate();
    if (res === null) return null;
    res.hints = st.hints;
    res.shown = st.shown;
    return res;
  }

  async function check() {
    const res = await evaluate();
    if (res === null) return;
    if (res.pending) { clear(fb); fb.className = 'feedback'; fb.appendChild(el('p', null, res.message)); return; }
    st.attempts++;
    showFeedback(res);
    const first = st.attempts === 1 && !st.shown;
    if (!st.done && ctx.onResult) ctx.onResult(res, { first });
    if (res.ok) { st.done = true; showExplanation(); if (body.afterSolved) body.afterSolved(); }
    else if (st.attempts >= 2 && hintBtn && !hintBtn.hidden) hintBtn.classList.add('suggest');
  }

  function showSolution() {
    st.shown = true;
    clear(solutionBox);
    solutionBox.appendChild(el('h4', null, 'Lösung'));
    solutionBox.appendChild(body.solutionNode());
    solutionBox.hidden = false;
    if (!st.done && ctx.onResult) {
      ctx.onResult({ ok: false, code: null, hints: st.hints, shown: true }, { first: st.attempts === 0 });
    }
    st.done = true;
    showExplanation();
    if (body.afterSolved) body.afterSolved();
  }

  let hintBtn = null;
  if (!ctx.deferred) {
    actions.appendChild(el('button', { class: 'btn btn-primary', type: 'button', onclick: check }, ctx.exam ? 'Abgeben' : 'Prüfen'));
    if (body.extraButtons) body.extraButtons(actions);
    const hints = (task.hinweise || []).map(txt);
    if (ctx.hints !== false && !ctx.exam) {
      const solBtn = el('button', { class: 'btn btn-ghost', type: 'button', hidden: hints.length > 0, onclick: showSolution }, 'Lösung zeigen');
      hintBtn = el('button', { class: 'btn btn-ghost', type: 'button', hidden: hints.length === 0, onclick: () => {
        if (st.hints < hints.length) {
          hintBox.appendChild(el('div', { class: 'hint', html: `<strong>Hinweis ${st.hints + 1}:</strong> ` + md(hints[st.hints]).replace(/^<p>|<\/p>$/g, '') }));
          st.hints++;
        }
        hintBtn.classList.remove('suggest');
        if (st.hints >= hints.length) { hintBtn.hidden = true; solBtn.hidden = false; }
        else hintBtn.textContent = `Hinweis (${st.hints + 1}/${hints.length})`;
      } }, `Hinweis (1/${hints.length})`);
      actions.appendChild(hintBtn);
      actions.appendChild(solBtn);
    }
    if (body.bindSubmit) body.bindSubmit(check);
  }

  return {
    node: root,
    evaluate,
    /** Nach der Probeprüfung: Rückmeldung, Lösung und Erklärung zeigen. */
    reveal(res) {
      showFeedback(res);
      clear(solutionBox);
      solutionBox.appendChild(el('h4', null, 'Lösung'));
      solutionBox.appendChild(body.solutionNode());
      solutionBox.hidden = false;
      showExplanation();
      if (body.afterSolved) body.afterSolved();
      if (body.lock) body.lock();
    },
    focus() {
      const t = root.querySelector('.task-title') || root;
      if (t.focus) t.focus();
    },
    id: taskId(task),
  };
}

// ---------------------------------------------------------------------------
// Typ-Implementierungen: render(task, env) -> {node, evaluate, solutionNode, ...}

const IMPL = {};

IMPL.sql = {
  render(task, { db, ctx, extra }) {
    const id = nextId('sql');
    const area = el('textarea', {
      id, class: 'sql-input', rows: 5, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', enterkeyhint: 'enter',
      placeholder: 'SELECT ... FROM ... WHERE ...',
    });
    area.value = txt(task.vorlage);
    const out = el('div', { class: 'sql-output', 'aria-live': 'polite' });
    const schemaSlot = el('div');
    schemaOf(db).then((s) => schemaSlot.appendChild(schemaLine(s))).catch(() => {});
    const node = el('div', { class: 'sql-box' },
      el('label', { for: id, class: 'label' }, 'Deine SQL-Abfrage ', el('span', { class: 'muted small kbd-hint' }, '(Ctrl/Cmd + Enter = ' + (ctx.exam || ctx.deferred ? 'Abgeben' : 'Prüfen') + ')')),
      sqlEditor(area), schemaSlot, out);

    let submit = null;
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (submit) submit(); }
    });

    async function showRun(sql) {
      clear(out);
      const r = await runSql(db, sql);
      if (!r.ok) {
        const x = explainError(r.error, sql, await schemaOf(db));
        out.appendChild(el('div', { class: 'error' }, x.message));
        return r;
      }
      if (r.columns) out.appendChild(resultTable(r.columns, r.rows));
      else out.appendChild(el('p', { class: 'muted' }, 'Ausgeführt, aber ohne Ergebnistabelle.'));
      for (const n of stoffHinweise(sql)) out.appendChild(el('p', { class: 'note' }, n));
      return r;
    }

    return {
      node,
      bindSubmit(fn) { submit = fn; },
      extraButtons(actions) {
        if (ctx.exam) return;
        actions.appendChild(el('button', { class: 'btn', type: 'button', onclick: () => {
          const sql = area.value.trim();
          if (!sql) { clear(out); out.appendChild(el('p', { class: 'muted' }, 'Schreibe zuerst eine Abfrage.')); return; }
          showRun(sql);
        } }, 'Nur ausführen'));
      },
      async evaluate() {
        const sql = area.value.trim();
        if (!sql) {
          if (ctx.deferred) return { ok: false, code: 'syntax', message: 'Keine Abfrage abgegeben.', answer: '' };
          clear(out);
          out.appendChild(el('p', { class: 'muted' }, 'Schreibe zuerst eine Abfrage.'));
          return null;
        }
        const exp = await runSql(db, txt(task.loesung));
        if (!exp.ok) return { ok: false, code: null, message: 'Interner Fehler in der Referenzlösung: ' + exp.error };
        let act;
        if (ctx.exam || ctx.deferred) act = await runSql(db, sql);
        else act = await showRun(sql);
        if (!act.ok) {
          const x = explainError(act.error, sql, await schemaOf(db));
          return { ok: false, code: x.code, message: x.message, answer: sql };
        }
        const res = compareResults(exp, act, { ordered: !!task.reihenfolge, spaltennamen: !!task.spaltennamen, sql });
        if (res.ok) {
          const kw = checkKeywords(sql, task);
          if (!kw.ok) return { ok: false, code: kw.code, message: 'Das Ergebnis stimmt, aber: ' + kw.message, notes: res.notes, answer: sql };
        }
        if (act.resultSets > 1) res.notes.push('Es wurden mehrere Abfragen ausgeführt; gewertet wird die letzte.');
        res.answer = sql;
        return res;
      },
      solutionNode() {
        const sol = txt(task.loesung);
        return el('div', null,
          el('pre', { class: 'code sql' }, el('code', { html: highlightSql(sol) })),
          ctx.deferred ? null : el('button', { class: 'btn btn-small', type: 'button', onclick: () => { area.value = sol; area.focus(); } }, 'In den Editor übernehmen'));
      },
      lock() { area.readOnly = true; },
    };
  },
};

IMPL.ergebnis = {
  render(task, { db, ctx, extra }) {
    const node = el('div', { class: 'ergebnis-box' });
    node.appendChild(el('pre', { class: 'code sql' }, el('code', { html: highlightSql(txt(task.abfrage)) })));
    const modus = task.modus || 'anzahl';
    let input;
    const checks = [];
    let kandidaten = null;
    if (modus === 'anzahl') {
      const id = nextId('anz');
      input = el('input', { id, type: 'number', inputmode: 'numeric', min: '0', class: 'num-input' });
      node.appendChild(el('label', { for: id, class: 'label' }, task.eingabeLabel || 'Anzahl Zeilen (Datensätze) im Ergebnis:'));
      node.appendChild(input);
    } else {
      const slot = el('div');
      node.appendChild(el('p', { class: 'label' }, task.eingabeLabel || 'Kreuze alle Zeilen an, die im Ergebnis vorkommen:'));
      node.appendChild(slot);
      kandidaten = runSql(db, txt(task.kandidaten)).then((r) => {
        if (!r.ok) { slot.appendChild(el('p', { class: 'error' }, r.error)); return r; }
        const table = el('table', { class: 'data selectable' });
        table.appendChild(el('thead', null, el('tr', null, el('th', { scope: 'col' }, el('span', { class: 'sr-only' }, 'Auswahl')), r.columns.map((c) => el('th', { scope: 'col' }, c)))));
        const tb = el('tbody');
        r.rows.forEach((row, i) => {
          const cid = nextId('row');
          const cb = el('input', { type: 'checkbox', id: cid, 'aria-label': `Zeile ${i + 1}: ${row.map(canon).join(', ')}` });
          checks.push({ cb, row });
          const tr = el('tr', null, el('td', null, cb), row.map((v) => el('td', { class: v === null ? 'null' : null }, v === null ? 'NULL' : canon(v))));
          tr.addEventListener('click', (e) => { if (e.target !== cb) cb.checked = !cb.checked; });
          tb.appendChild(tr);
        });
        table.appendChild(tb);
        slot.appendChild(el('div', { class: 'table-wrap' }, table));
        return r;
      });
    }
    const resultSlot = el('div');
    node.appendChild(resultSlot);

    async function truth() {
      const r = await runSql(db, txt(task.abfrage));
      if (!r.ok) throw new Error('Abfrage der Aufgabe fehlerhaft: ' + r.error);
      return r;
    }

    return {
      node,
      bindSubmit(fn) { if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fn(); } }); },
      async evaluate() {
        const r = await truth();
        if (modus === 'anzahl') {
          if (input.value.trim() === '') {
            if (ctx.deferred) return { ok: false, code: 'anzahl-falsch', message: 'Keine Antwort.', answer: '' };
            return null;
          }
          const want = task.antwort !== undefined ? Number(task.antwort) : r.rows.length;
          const got = Number(input.value);
          if (got === want) return { ok: true, message: `Richtig, das Ergebnis hat ${want} Zeile${want === 1 ? '' : 'n'}.`, answer: got };
          let msg = `${got} stimmt nicht.`;
          if (task.fehlerTipp) msg += ' ' + txt(task.fehlerTipp);
          else if (/,/.test((txt(task.abfrage).match(/FROM([\s\S]*?)(WHERE|ORDER|$)/i) || [])[1] || '')) msg += ' Tipp: Mehrere Tabellen im FROM bilden zuerst das Kreuzprodukt (Zeilen multiplizieren), danach filtert WHERE.';
          else msg += ' Gehe die Datensätze einzeln durch und prüfe für jeden die WHERE-Bedingung.';
          return { ok: false, code: 'anzahl-falsch', message: msg, answer: got };
        }
        await kandidaten;
        const want = new Set(r.rows.map(rowKey));
        let richtig = 0, zuviel = 0, fehlt = 0;
        for (const { cb, row } of checks) {
          const k = rowKey(row);
          if (cb.checked && want.has(k)) richtig++;
          else if (cb.checked) zuviel++;
          else if (want.has(k)) fehlt++;
        }
        const ok = zuviel === 0 && fehlt === 0;
        const answer = checks.filter((c) => c.cb.checked).length;
        if (ok) return { ok: true, message: `Richtig, genau diese ${richtig} Zeile${richtig === 1 ? '' : 'n'}.`, answer };
        const parts = [];
        if (zuviel) parts.push(`${zuviel} angekreuzte Zeile${zuviel === 1 ? ' gehört' : 'n gehören'} nicht dazu`);
        if (fehlt) parts.push(`${fehlt} Zeile${fehlt === 1 ? ' fehlt' : 'n fehlen'}`);
        return { ok: false, code: 'zeilen-falsch', message: parts.join(', ') + '. Prüfe jede Zeile einzeln gegen die WHERE-Bedingung.', answer };
      },
      solutionNode() {
        const box = el('div');
        truth().then((r) => {
          const n = task.antwort !== undefined ? Number(task.antwort) : r.rows.length;
          box.appendChild(el('p', null, `Das Ergebnis hat ${n} Zeile${n === 1 ? '' : 'n'}:`));
          box.appendChild(resultTable(r.columns, r.rows));
        });
        return box;
      },
      afterSolved() {
        if (ctx.exam && !ctx.deferred) return;
        if (resultSlot.childNodes.length) return;
        resultSlot.appendChild(el('button', { class: 'btn btn-small', type: 'button', onclick: async (e) => {
          e.target.remove();
          const r = await truth();
          resultSlot.appendChild(el('p', { class: 'label' }, 'So sieht das Ergebnis aus:'));
          resultSlot.appendChild(resultTable(r.columns, r.rows));
        } }, 'Abfrage ausführen und Ergebnis ansehen'));
      },
      lock() { if (input) input.readOnly = true; checks.forEach((c) => (c.cb.disabled = true)); },
    };
  },
};

IMPL.choice = {
  render(task, { ctx }) {
    const name = nextId('choice');
    const multi = !!task.mehrfach;
    const opts = (task.mischen ? shuffle(task.optionen) : task.optionen).map((o) => ({ ...o }));
    const fs = el('fieldset', { class: 'choices' });
    fs.appendChild(el('legend', { class: 'label' }, multi ? 'Mehrere Antworten können richtig sein:' : 'Wähle eine Antwort:'));
    for (const o of opts) {
      const id = nextId('opt');
      o.input = el('input', { type: multi ? 'checkbox' : 'radio', name, id });
      o.whyNode = el('div', { class: 'why', hidden: true });
      fs.appendChild(el('div', { class: 'choice' }, o.input, el('label', { for: id, html: md(o.text).replace(/^<p>|<\/p>$/g, '') }), o.whyNode));
    }
    return {
      node: fs,
      async evaluate() {
        const chosen = opts.filter((o) => o.input.checked);
        if (!chosen.length) return ctx.deferred ? { ok: false, code: 'auswahl-falsch', message: 'Keine Antwort gewählt.', answer: [] } : null;
        opts.forEach((o) => { o.whyNode.hidden = true; o.input.parentElement.classList.remove('wrong', 'right'); });
        const wrong = chosen.filter((o) => !o.richtig);
        const missed = opts.filter((o) => o.richtig && !o.input.checked);
        const ok = wrong.length === 0 && missed.length === 0;
        if (!ctx.deferred) {
          for (const o of wrong) {
            o.input.parentElement.classList.add('wrong');
            if (o.warum) { o.whyNode.innerHTML = md(o.warum); o.whyNode.hidden = false; }
          }
        }
        let message = ok ? 'Richtig!' : wrong.length ? 'Mindestens eine gewählte Antwort ist falsch.' : 'Es fehlt noch mindestens eine richtige Antwort.';
        return { ok, code: ok ? null : 'auswahl-falsch', message, answer: chosen.map((o) => o.text) };
      },
      solutionNode() {
        opts.forEach((o) => {
          o.input.parentElement.classList.toggle('right', !!o.richtig);
          if (o.warum) { o.whyNode.innerHTML = md(o.warum); o.whyNode.hidden = false; }
        });
        return el('ul', null, opts.filter((o) => o.richtig).map((o) => el('li', { html: md(o.text).replace(/^<p>|<\/p>$/g, '') })));
      },
      afterSolved() {
        opts.forEach((o) => { if (o.richtig) o.input.parentElement.classList.add('right'); if (o.warum) { o.whyNode.innerHTML = md(o.warum); o.whyNode.hidden = false; } });
      },
      lock() { opts.forEach((o) => (o.input.disabled = true)); },
    };
  },
};

IMPL.text = {
  render(task, { ctx }) {
    const id = nextId('txt');
    const input = el('input', { id, type: 'text', class: 'text-input', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done' });
    const node = el('div', null, el('label', { for: id, class: 'label' }, task.eingabeLabel || 'Deine Antwort:'), input);
    const answers = (task.antworten || []).map((a) => normAnswer(a));
    return {
      node,
      bindSubmit(fn) { input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fn(); } }); },
      async evaluate() {
        const v = input.value;
        if (!v.trim()) return ctx.deferred ? { ok: false, code: 'text-falsch', message: 'Keine Antwort.', answer: '' } : null;
        const n = normAnswer(v);
        let ok = answers.includes(n);
        if (!ok && task.muster) { try { ok = new RegExp(task.muster, 'i').test(v.trim()); } catch { /* ungültiges Muster */ } }
        return { ok, code: ok ? null : 'text-falsch', message: ok ? 'Richtig!' : (txt(task.fehlerTipp) || 'Das ist nicht die gesuchte Antwort.'), answer: v };
      },
      solutionNode() { return el('p', null, (task.antworten || [])[0] || ''); },
      lock() { input.readOnly = true; },
    };
  },
};

IMPL.zuordnen = {
  render(task, { ctx }) {
    const kats = task.kategorien || [];
    const elems = (task.mischen === false ? task.elemente : shuffle(task.elemente)).map((e) => ({ ...e }));
    const list = el('div', { class: 'zuordnen' });
    for (const e of elems) {
      const id = nextId('zu');
      e.select = el('select', { id }, el('option', { value: '' }, '– wählen –'), kats.map((k) => el('option', { value: k }, k)));
      e.row = el('div', { class: 'zu-row' }, el('label', { for: id, html: md(e.text).replace(/^<p>|<\/p>$/g, '') }), e.select);
      list.appendChild(e.row);
    }
    return {
      node: list,
      async evaluate() {
        if (!ctx.deferred && elems.some((e) => !e.select.value)) {
          return { pending: true, message: 'Ordne zuerst alle Elemente zu.' };
        }
        let wrong = 0;
        for (const e of elems) {
          const ok = e.select.value === e.antwort;
          if (!ok) wrong++;
          if (!ctx.deferred) e.row.classList.toggle('wrong', !ok);
          if (!ctx.deferred) e.row.classList.toggle('right', ok);
        }
        return { ok: wrong === 0, code: wrong ? 'zuordnung-falsch' : null, message: wrong ? `${wrong} von ${elems.length} Zuordnungen stimmen nicht (rot markiert).` : 'Richtig!', answer: elems.map((e) => e.select.value) };
      },
      solutionNode() {
        return el('ul', null, elems.map((e) => el('li', null, el('span', { html: md(e.text).replace(/^<p>|<\/p>$/g, '') }), ' → ', el('strong', null, e.antwort), e.warum ? el('span', { class: 'muted' }, ' – ' + e.warum) : null)));
      },
      lock() { elems.forEach((e) => (e.select.disabled = true)); },
    };
  },
};

IMPL.tabelle = {
  render(task, { ctx }) {
    const cells = [];
    const table = el('table', { class: 'data fill' });
    if (task.tabellenname) table.appendChild(el('caption', null, task.tabellenname));
    table.appendChild(el('thead', null, el('tr', null, (task.spalten || []).map((s) => el('th', { scope: 'col' }, s)))));
    const tb = el('tbody');
    (task.zeilen || []).forEach((row, ri) => {
      tb.appendChild(el('tr', null, row.map((c, ci) => {
        if (c && typeof c === 'object' && 'loesung' in c) {
          const inp = el('input', { type: 'text', class: 'cell-input', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': `Zeile ${ri + 1}, Spalte ${task.spalten[ci]}`, placeholder: c.platzhalter || '' });
          const sol = Array.isArray(c.loesung) ? c.loesung : [c.loesung];
          cells.push({ inp, sol: sol.map((s) => normAnswer(s)), raw: sol[0] });
          return el('td', null, inp);
        }
        return el('td', { class: c === null ? 'null' : null }, c === null ? 'NULL' : String(c));
      })));
    });
    table.appendChild(tb);
    return {
      node: el('div', { class: 'table-wrap' }, table),
      async evaluate() {
        if (!ctx.deferred && cells.every((c) => !c.inp.value.trim())) return null;
        let wrong = 0;
        for (const c of cells) {
          const ok = c.sol.includes(normAnswer(c.inp.value));
          if (!ok) wrong++;
          if (!ctx.deferred) c.inp.classList.toggle('wrong', !ok);
          if (!ctx.deferred) c.inp.classList.toggle('right', ok);
        }
        return { ok: wrong === 0, code: wrong ? 'tabelle-falsch' : null, message: wrong ? `${wrong} von ${cells.length} Feldern stimmen nicht (rot markiert).` : 'Richtig!', answer: cells.map((c) => c.inp.value) };
      },
      solutionNode() {
        cells.forEach((c) => { c.inp.placeholder = c.raw; });
        return el('p', null, 'Die richtigen Werte: ' + cells.map((c) => c.raw).join(', '));
      },
      lock() { cells.forEach((c) => (c.inp.readOnly = true)); },
    };
  },
};
