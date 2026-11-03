// Sehr kleine SQL-Syntaxhervorhebung ohne Abhängigkeiten.
// highlightSql(text) -> HTML; sqlEditor(textarea) legt eine farbige Ebene hinter das Textfeld.
import { escapeHtml } from './util.js';

const KEYWORDS = new Set(('SELECT FROM WHERE AND OR NOT ORDER BY ASC DESC DISTINCT AS LIKE BETWEEN IN IS NULL ' +
  'COUNT MIN MAX SUM AVG JOIN ON INNER LEFT GROUP HAVING LIMIT UPDATE DELETE INSERT INTO VALUES SET CREATE TABLE').split(' '));

export function highlightSql(src) {
  const re = /(--[^\n]*)|('(?:[^']|'')*'?)|("(?:[^"]|"")*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([^A-Za-z0-9_'"-]+|-)/g;
  let out = '';
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[1]) out += `<span class="tok-com">${escapeHtml(m[1])}</span>`;
    else if (m[2]) out += `<span class="tok-str">${escapeHtml(m[2])}</span>`;
    else if (m[3]) out += `<span class="tok-id">${escapeHtml(m[3])}</span>`;
    else if (m[4]) out += `<span class="tok-num">${escapeHtml(m[4])}</span>`;
    else if (m[5]) out += KEYWORDS.has(m[5].toUpperCase()) ? `<span class="tok-kw">${escapeHtml(m[5])}</span>` : escapeHtml(m[5]);
    else out += escapeHtml(m[0]);
  }
  return out;
}

/** Textfeld mit Hervorhebung: gibt einen Wrapper zurück, der das Textfeld enthält. */
export function sqlEditor(textarea) {
  const wrap = document.createElement('div');
  wrap.className = 'editor';
  const layer = document.createElement('pre');
  layer.className = 'editor-layer';
  layer.setAttribute('aria-hidden', 'true');
  const code = document.createElement('code');
  layer.appendChild(code);
  const sync = () => {
    // abschliessender Zeilenumbruch, damit die Ebene gleich hoch ist wie das Textfeld
    code.innerHTML = highlightSql(textarea.value) + '\n';
    layer.scrollTop = textarea.scrollTop;
    layer.scrollLeft = textarea.scrollLeft;
  };
  textarea.classList.add('editor-input');
  // iOS/Safari und Einfügen aus Notizen können typografische Zeichen liefern: durch SQL-taugliche ersetzen
  const SMART = /[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u2013\u2014\u00A0]/g;
  const plain = { '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'", '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u2013': '-', '\u2014': '-', '\u00A0': ' ' };
  const fixSmart = () => {
    const v = textarea.value;
    if (!SMART.test(v)) return;
    SMART.lastIndex = 0;
    const a = textarea.selectionStart, b = textarea.selectionEnd;
    textarea.value = v.replace(SMART, (c) => plain[c]);
    try { textarea.setSelectionRange(a, b); } catch { /* ignorieren */ }
  };
  textarea.addEventListener('input', () => { fixSmart(); sync(); });
  textarea.addEventListener('scroll', sync);
  wrap.appendChild(layer);
  wrap.appendChild(textarea);
  wrap.refresh = sync;
  // Werte, die per Code gesetzt werden (Vorlage, Lösung übernehmen), ebenfalls darstellen
  const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  Object.defineProperty(textarea, 'value', {
    get() { return desc.get.call(this); },
    set(v) { desc.set.call(this, v); sync(); },
  });
  sync();
  return wrap;
}

/** Alle SQL-Codeblöcke innerhalb eines Elements einfärben. */
export function highlightBlocks(root) {
  root.querySelectorAll('pre.code.lang-sql code, pre.code.sql code').forEach((c) => {
    c.innerHTML = highlightSql(c.textContent);
  });
}
