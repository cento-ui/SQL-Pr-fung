#!/usr/bin/env python3
"""Qualitätsprüfung für die SQL-Lernumgebung.

Prüft ohne Browser:
  * alle Datenbank-Skripte in data/ (lassen sie sich in SQLite laden?)
  * alle Kapitel aus chapters/index.json (Format, Ids, Tags, Rechtschreibung ohne ß)
  * alle Referenzlösungen und Abfragen, jede Parameter-Variante einzeln:
      - sql:      Lösung läuft, liefert Zeilen, erfüllt eigene muss/verboten-Regeln,
                  bei "reihenfolge" eindeutige Sortierung (Gegenprobe mit umgekehrt gespeicherten Zeilen)
      - ergebnis: Abfrage läuft, "antwort" stimmt, bei modus "zeilen" sind alle
                  Ergebniszeilen unter den Kandidaten
      - zeigen:   alle angezeigten Tabellen/Abfragen laufen
  * Lernziel- und Fehlerarten-Links zeigen auf existierende Schritte
  * Abdeckung: Anzahl Aufgaben pro Lernziel (Ziel: mindestens 4)

Aufruf:  python3 tools/check.py            (Fehler -> Exit-Code 1)
         python3 tools/check.py --strict   (auch fehlende Kapitel / zu kleine Pools sind Fehler)
         python3 tools/check.py --verbose  (jede geprüfte Aufgabe ausgeben)
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TASK_TYPES = {"sql", "ergebnis", "choice", "text", "zuordnen", "tabelle"}
STEP_TYPES = TASK_TYPES | {"info"}
LZ_IDS = {f"L{i}" for i in range(1, 25)}
MIN_PRO_LZ = 4
NICHT_STOFF = [
    (r"\bLIMIT\b", "LIMIT"),
    (r"\bJOIN\b", "JOIN"),
    (r"\bGROUP\s+BY\b", "GROUP BY"),
    (r"\bHAVING\b", "HAVING"),
    (r"\(\s*SELECT\b", "Unterabfrage"),
    (r"^\s*(UPDATE|DELETE|INSERT)\b", "Datenänderung"),
]

args = set(sys.argv[1:])
STRICT = "--strict" in args
VERBOSE = "--verbose" in args

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def txt(v) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return "\n".join(str(x) for x in v)
    return str(v)


def normalize_sql(sql: str) -> str:
    s = re.sub(r"--[^\n]*", " ", sql)
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.S)
    s = re.sub(r"'(?:[^']|'')*'", "''", s)
    return re.sub(r"\s+", " ", s).strip().upper()


def substitute(value, params: dict):
    if isinstance(value, str):
        return re.sub(r"\{\{\s*(\w+)\s*\}\}", lambda m: str(params[m.group(1)]) if m.group(1) in params else m.group(0), value)
    if isinstance(value, list):
        return [substitute(v, params) for v in value]
    if isinstance(value, dict):
        return {k: (v if k == "parameter" else substitute(v, params)) for k, v in value.items()}
    return value


def variants(task: dict) -> list[tuple[str, dict]]:
    params = task.get("parameter")
    if not params:
        return [("", task)]
    if not isinstance(params, list) or not all(isinstance(p, dict) for p in params):
        err(f"{task.get('_where')}: 'parameter' muss eine Liste von Objekten sein")
        return [("", task)]
    out = []
    for i, p in enumerate(params):
        inst = substitute(task, p)
        out.append((f" [Variante {i + 1}]", inst))
    return out


def leftover_placeholders(obj, path="") -> list[str]:
    found = []
    if isinstance(obj, str):
        if re.search(r"\{\{\s*\w+\s*\}\}", obj):
            found.append(path)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            found += leftover_placeholders(v, f"{path}[{i}]")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k == "parameter":
                continue
            found += leftover_placeholders(v, f"{path}.{k}")
    return found


# ---------------------------------------------------------------------------
# Datenbanken

def load_databases() -> dict[str, str]:
    scripts: dict[str, str] = {}
    meta = json.loads((ROOT / "data" / "databases.json").read_text(encoding="utf-8"))
    for d in meta:
        path = ROOT / d["datei"]
        if not path.exists():
            err(f"Datenbank {d['id']}: Datei {d['datei']} fehlt")
            continue
        script = path.read_text(encoding="utf-8")
        try:
            con = sqlite3.connect(":memory:")
            con.executescript(script)
            con.execute("PRAGMA foreign_keys = ON")
            bad = con.execute("PRAGMA foreign_key_check").fetchall()
            if bad:
                err(f"Datenbank {d['id']}: Fremdschlüssel verweisen ins Leere: {bad[:5]}")
            tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")]
            counts = {t: con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] for t in tables}
            if VERBOSE:
                print(f"  DB {d['id']}: {counts}")
            con.close()
            scripts[d["id"]] = script
        except sqlite3.Error as e:
            err(f"Datenbank {d['id']}: Skript lässt sich nicht laden: {e}")
    return scripts


class Dbs:
    def __init__(self, scripts: dict[str, str]):
        self.scripts = scripts
        self.cons: dict[str, sqlite3.Connection] = {}
        self.rev: dict[str, sqlite3.Connection] = {}

    def reversed_con(self, db: str) -> sqlite3.Connection:
        """Kopie der DB, in der jede Tabelle ihre Zeilen in umgekehrter Reihenfolge speichert.
        So fallen Sortierungen auf, die bei gleichen Sortierwerten zufällig stimmen."""
        if db not in self.rev:
            c = sqlite3.connect(":memory:")
            c.executescript(self.scripts[db])
            tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")]
            c.execute("PRAGMA legacy_alter_table = ON")
            for t in tables:
                c.execute(f'ALTER TABLE "{t}" RENAME TO "_alt_{t}"')
                c.execute(f'CREATE TABLE "{t}" AS SELECT * FROM "_alt_{t}" ORDER BY rowid DESC')
                c.execute(f'DROP TABLE "_alt_{t}"')
            c.commit()
            self.rev[db] = c
        return self.rev[db]

    def con(self, db: str) -> sqlite3.Connection | None:
        if db not in self.scripts:
            return None
        if db not in self.cons:
            c = sqlite3.connect(":memory:")
            c.executescript(self.scripts[db])
            self.cons[db] = c
        return self.cons[db]

    def run(self, db: str, sql: str, reverse: bool = False):
        c = self.con(db)
        if c is None:
            raise sqlite3.Error(f"unbekannte Datenbank '{db}'")
        if reverse:
            c = self.reversed_con(db)
        try:
            cur = c.execute(sql)
            cols = [d[0] for d in cur.description] if cur.description else None
            rows = cur.fetchall()
            return cols, rows
        finally:
            c.rollback()


def canon(v) -> str:
    if v is None:
        return "∅"
    if isinstance(v, float):
        if v.is_integer():
            return str(int(v))
        return repr(round(v, 6))
    return str(v)


def row_key(r) -> str:
    return "␟".join(canon(v) for v in r)


# ---------------------------------------------------------------------------
# Kapitel

def check_common(task: dict, where: str) -> None:
    lz = task.get("lz")
    if not isinstance(lz, list) or not lz:
        err(f"{where}: 'lz' (Liste der Lernziele) fehlt")
    else:
        for l in lz:
            if l not in LZ_IDS:
                err(f"{where}: unbekanntes Lernziel '{l}'")
    if task.get("stufe") not in (1, 2, 3):
        err(f"{where}: 'stufe' muss 1, 2 oder 3 sein")
    if not task.get("thema"):
        err(f"{where}: 'thema' fehlt")
    if not txt(task.get("frage")).strip():
        err(f"{where}: 'frage' fehlt")
    if not task.get("hinweise"):
        warn(f"{where}: keine 'hinweise'")
    if not txt(task.get("erklaerung")).strip():
        warn(f"{where}: keine 'erklaerung'")


def check_zeigen(task: dict, db: str, where: str, dbs: Dbs) -> None:
    for z in task.get("zeigen") or []:
        sql = f'SELECT * FROM "{z}"' if isinstance(z, str) else z.get("sql", "")
        try:
            dbs.run(db, sql)
        except sqlite3.Error as e:
            err(f"{where}: 'zeigen' {z!r} fehlerhaft: {e}")


def check_sql(task: dict, db: str, where: str, dbs: Dbs) -> None:
    sol = txt(task.get("loesung"))
    if not sol.strip():
        err(f"{where}: 'loesung' fehlt")
        return
    try:
        cols, rows = dbs.run(db, sol)
    except sqlite3.Error as e:
        err(f"{where}: Lösung fehlerhaft: {e}\n      SQL: {sol}")
        return
    if cols is None:
        err(f"{where}: Lösung liefert keine Ergebnistabelle")
        return
    if not rows and not task.get("erlaubtLeer"):
        err(f"{where}: Lösung liefert ein leeres Ergebnis (setze 'erlaubtLeer': true, falls gewollt)")
    n = normalize_sql(sol)
    if task.get("reihenfolge"):
        if "ORDER BY" not in n:
            err(f"{where}: 'reihenfolge' gesetzt, aber Lösung ohne ORDER BY")
        _, rows_rev = dbs.run(db, sol, reverse=True)
        if [row_key(r) for r in rows] != [row_key(r) for r in rows_rev]:
            err(f"{where}: Sortierung nicht eindeutig (gleiche Sortierwerte) – weiteres Sortierkriterium ergänzen")
    elif "ORDER BY" in n:
        warn(f"{where}: Lösung hat ORDER BY, aber 'reihenfolge' ist nicht gesetzt (Reihenfolge wird nicht geprüft)")
    for rule in task.get("muss") or []:
        if not re.search(rule["muster"], n, re.I):
            err(f"{where}: Lösung erfüllt eigene Regel 'muss' {rule['muster']!r} nicht")
    for rule in task.get("verboten") or []:
        if re.search(rule["muster"], n, re.I):
            err(f"{where}: Lösung verletzt eigene Regel 'verboten' {rule['muster']!r}")
    for pat, name in NICHT_STOFF:
        if re.search(pat, n):
            err(f"{where}: Lösung verwendet {name} (nicht Prüfungsstoff)")
    vor = txt(task.get("vorlage"))
    if vor.strip():
        try:
            dbs.run(db, vor)
        except sqlite3.Error:
            pass  # Vorlagen dürfen unvollständig sein


def check_ergebnis(task: dict, db: str, where: str, dbs: Dbs) -> None:
    q = txt(task.get("abfrage"))
    if not q.strip():
        err(f"{where}: 'abfrage' fehlt")
        return
    try:
        cols, rows = dbs.run(db, q)
    except sqlite3.Error as e:
        err(f"{where}: Abfrage fehlerhaft: {e}")
        return
    modus = task.get("modus", "anzahl")
    if modus not in ("anzahl", "zeilen"):
        err(f"{where}: unbekannter modus '{modus}'")
    if "antwort" in task and int(task["antwort"]) != len(rows):
        err(f"{where}: 'antwort' {task['antwort']} passt nicht zum Ergebnis ({len(rows)} Zeilen)")
    if modus == "zeilen":
        k = txt(task.get("kandidaten"))
        if not k.strip():
            err(f"{where}: modus 'zeilen' braucht 'kandidaten'")
            return
        try:
            kcols, krows = dbs.run(db, k)
        except sqlite3.Error as e:
            err(f"{where}: Kandidaten-Abfrage fehlerhaft: {e}")
            return
        if len(kcols) != len(cols):
            err(f"{where}: Kandidaten haben {len(kcols)} Spalten, Ergebnis {len(cols)}")
            return
        kk = {row_key(r) for r in krows}
        missing = [r for r in rows if row_key(r) not in kk]
        if missing:
            err(f"{where}: Ergebniszeilen fehlen unter den Kandidaten: {missing[:3]}")
        if len({row_key(r) for r in rows}) != len(rows):
            err(f"{where}: Ergebnis enthält doppelte Zeilen – für modus 'zeilen' ungeeignet")
        if len(krows) == len(rows):
            warn(f"{where}: alle Kandidaten sind richtig (keine Ablenker)")


def check_choice(task: dict, where: str) -> None:
    opts = task.get("optionen") or []
    if len(opts) < 2:
        err(f"{where}: mindestens 2 'optionen' nötig")
    right = [o for o in opts if o.get("richtig")]
    if not right:
        err(f"{where}: keine Option ist 'richtig'")
    if not task.get("mehrfach") and len(right) > 1:
        err(f"{where}: mehrere richtige Optionen, aber 'mehrfach' ist nicht gesetzt")
    for o in opts:
        if not o.get("text"):
            err(f"{where}: Option ohne 'text'")


def check_text(task: dict, where: str) -> None:
    if not task.get("antworten") and not task.get("muster"):
        err(f"{where}: 'antworten' oder 'muster' nötig")
    if task.get("muster"):
        try:
            re.compile(task["muster"])
        except re.error as e:
            err(f"{where}: 'muster' ist kein gültiger regulärer Ausdruck: {e}")


def check_zuordnen(task: dict, where: str) -> None:
    kats = task.get("kategorien") or []
    elems = task.get("elemente") or []
    if len(kats) < 2 or len(elems) < 2:
        err(f"{where}: mindestens 2 'kategorien' und 2 'elemente' nötig")
    for e in elems:
        if e.get("antwort") not in kats:
            err(f"{where}: Element {e.get('text')!r} hat Antwort {e.get('antwort')!r}, die nicht in 'kategorien' steht")


def check_tabelle(task: dict, where: str) -> None:
    sp = task.get("spalten") or []
    rows = task.get("zeilen") or []
    if not sp or not rows:
        err(f"{where}: 'spalten' und 'zeilen' nötig")
        return
    cells = 0
    for i, r in enumerate(rows):
        if len(r) != len(sp):
            err(f"{where}: Zeile {i + 1} hat {len(r)} Zellen, erwartet {len(sp)}")
        cells += sum(1 for c in r if isinstance(c, dict) and "loesung" in c)
    if cells == 0:
        err(f"{where}: keine auszufüllende Zelle ({{'loesung': ...}})")


def check_chapter(meta: dict, dbs: Dbs, lz_count: dict, step_ids: dict) -> None:
    path = ROOT / meta["datei"]
    if not path.exists():
        (err if STRICT else warn)(f"Kapitel {meta['id']}: Datei {meta['datei']} fehlt (noch nicht erstellt)")
        return
    raw = path.read_text(encoding="utf-8")
    if "ß" in raw:
        lines = [i + 1 for i, l in enumerate(raw.splitlines()) if "ß" in l]
        err(f"Kapitel {meta['id']}: 'ß' gefunden (Schweizer Rechtschreibung: ss), Zeilen {lines[:10]}")
    try:
        ch = json.loads(raw)
    except json.JSONDecodeError as e:
        err(f"Kapitel {meta['id']}: ungültiges JSON: {e}")
        return
    if ch.get("id") != meta["id"]:
        err(f"Kapitel {meta['id']}: 'id' in der Datei ist {ch.get('id')!r}")
    for key in ("titel", "db"):
        if not ch.get(key):
            err(f"Kapitel {meta['id']}: '{key}' fehlt")
    if ch.get("db") and ch["db"] not in dbs.scripts:
        err(f"Kapitel {meta['id']}: unbekannte Datenbank {ch['db']!r}")
    schritte = ch.get("schritte") or []
    pool = ch.get("pool") or []
    if not meta.get("nurPool") and not schritte:
        err(f"Kapitel {meta['id']}: keine 'schritte'")
    ids = set()
    step_ids[meta["id"]] = {s.get("id") for s in schritte}
    n_tasks = 0
    for kind, items in (("schritte", schritte), ("pool", pool)):
        for s in items:
            sid = s.get("id")
            where = f"{meta['id']}.{sid} ({kind})"
            if not sid or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", sid):
                err(f"{where}: ungültige oder fehlende 'id' (nur a-z, 0-9, -)")
            if sid in ids:
                err(f"{where}: doppelte id")
            ids.add(sid)
            typ = s.get("typ")
            if typ not in STEP_TYPES:
                err(f"{where}: unbekannter typ {typ!r}")
                continue
            if typ == "info":
                if kind == "pool":
                    err(f"{where}: info-Schritte gehören nicht in den Pool")
                if not txt(s.get("text")).strip() and not s.get("story"):
                    warn(f"{where}: info-Schritt ohne Text")
                continue
            n_tasks += 1
            check_common(s, where)
            for l in s.get("lz") or []:
                lz_count[l] = lz_count.get(l, 0) + 1
            db = s.get("db") or ch.get("db")
            for label, inst in variants(s):
                w = where + label
                inst["_where"] = w
                left = leftover_placeholders(inst)
                if left:
                    err(f"{w}: Platzhalter {{{{...}}}} ohne Parameter in {left[:3]}")
                check_zeigen(inst, db, w, dbs)
                if typ == "sql":
                    check_sql(inst, db, w, dbs)
                elif typ == "ergebnis":
                    check_ergebnis(inst, db, w, dbs)
                elif typ == "choice":
                    check_choice(inst, w)
                elif typ == "text":
                    check_text(inst, w)
                elif typ == "zuordnen":
                    check_zuordnen(inst, w)
                elif typ == "tabelle":
                    check_tabelle(inst, w)
                if VERBOSE:
                    print(f"  ok? {w}")
    if VERBOSE:
        print(f"Kapitel {meta['id']}: {len(schritte)} Schritte, {len(pool)} Pool-Aufgaben, {n_tasks} Aufgaben")


def main() -> int:
    print(f"Prüfe {ROOT}")
    scripts = load_databases()
    dbs = Dbs(scripts)
    index = json.loads((ROOT / "chapters" / "index.json").read_text(encoding="utf-8"))
    lz_count: dict[str, int] = {}
    step_ids: dict[str, set] = {}
    seen = set()
    for meta in index["kapitel"]:
        if meta["id"] in seen:
            err(f"index.json: doppelte Kapitel-id {meta['id']}")
        seen.add(meta["id"])
        check_chapter(meta, dbs, lz_count, step_ids)

    # Links auf Lernabschnitte
    lernziele = json.loads((ROOT / "data" / "lernziele.json").read_text(encoding="utf-8"))
    if {l["id"] for l in lernziele} != LZ_IDS:
        err("data/lernziele.json: es müssen genau L1..L24 vorkommen")
    fehler = json.loads((ROOT / "data" / "fehlerarten.json").read_text(encoding="utf-8"))
    links = [(f"Lernziel {l['id']}", l["kapitel"], l["schritt"]) for l in lernziele]
    links += [(f"Fehlerart {k}", v.get("kapitel"), v.get("schritt")) for k, v in fehler.items() if v.get("kapitel")]
    for name, kid, sid in links:
        if kid in step_ids and sid not in step_ids[kid]:
            err(f"{name}: verweist auf Schritt '{sid}', den es in Kapitel {kid} nicht gibt")
        elif kid not in step_ids:
            warn(f"{name}: Ziel-Kapitel {kid} existiert noch nicht (Link #/kapitel/{kid}/{sid})")

    # Abdeckung
    print("\nAufgaben pro Lernziel (Ziel >= %d):" % MIN_PRO_LZ)
    line = []
    for i in range(1, 25):
        l = f"L{i}"
        n = lz_count.get(l, 0)
        line.append(f"{l}:{n}")
        if n < MIN_PRO_LZ:
            (err if STRICT else warn)(f"Lernziel {l}: nur {n} Aufgabe(n) im Pool (Ziel {MIN_PRO_LZ})")
    print("  " + "  ".join(line))

    if warnings:
        print(f"\nWarnungen ({len(warnings)}):")
        for w in warnings:
            print("  - " + w)
    if errors:
        print(f"\nFEHLER ({len(errors)}):")
        for e in errors:
            print("  - " + e)
        return 1
    print("\nKeine Fehler.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
