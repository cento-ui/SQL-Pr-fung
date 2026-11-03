# Konzept: SQL-Detektei

Lernumgebung zur Prüfung «Relationale Datenbanken und SQL» (Kantonsschule, 4bMN, Donnerstag 5.11.2026, Hilfsmittel nur das Hilfsblatt SQL). Leitstab sind die 24 Lernziele in `moodle-extract/lernziele.md` (L1–L24).

## 1. Zielgruppe und Grundsätze

- **Lernende ohne Vorwissen.** Das Thema wurde noch nicht angeschaut. Kapitel 1 beginnt bei «Was ist eine Tabelle?». Jeder Begriff wird erst im Alltag erklärt, dann mit dem Fachwort benannt, dann geübt. Kleine Schritte, viele Beispiele, sofort ausprobieren.
- **Prüfungsnah.** Es gibt nur Stoff aus Lernzielen und Hilfsblatt. Die Prüfung findet auf Papier statt; darum gibt es neben «SQL schreiben» viele Aufgaben «Ergebnis bestimmen, ohne auszuführen» (L10, L11) und einen Prüfungsmodus.
- **Kein Einmal-Spiel.** Jede Aufgabe ist getaggt, jeder Versuch wird gespeichert. Daraus entstehen Schwächen-Dashboard, gezieltes Schwächen-Training, Wiederholung nach Leitner und eine Probeprüfung. Pro Lernziel gibt es einen Pool mit mehreren Aufgaben, viele davon mit Varianten (Parameter).
- **Ruhiges Design.** Reduziert, viel Weissraum, eine Akzentfarbe (Blau), Systemschrift, Zeilenhöhe 1.65, hell/dunkel automatisch. Keine Animationen ausser dezenten Übergängen (abgeschaltet bei `prefers-reduced-motion`), keine Pop-ups (Bestätigungen zweistufig im Knopf), keine Gamification. Story nur als kurze, graue Einleitung. Feedback freundlich: grün für richtig, warmes Bernstein für «noch nicht ganz» (kein Alarmrot). Pro Bildschirm eine Sache: Aufgabe, Eingabe, Ergebnis.

## 2. Story-Rahmen (eigene Geschichte)

**Die Datendetektei.** Kommissarin **Tabea Tupel** sucht ihren Kater **NULL** (der Name ist ein Wortspiel: «Wo ist NULL?» → `IS NULL`). Die Spur führt über vier Datenbanken. Jede Station liefert einen Hinweis, wenn die Lernenden helfen.

| Station | Datenbank | Figuren (`data/figuren.json`) | Kapitel |
|---|---|---|---|
| Flughafen: Kiste mit Kater verschwunden | flugbuchung | tabea, pilotin (Rita Riff) | k01, k04, k05 |
| Stadtbibliothek: Chaos-Liste, Kater schlief auf Büchern | bibliothek | ammann (Herr Ammann) | k02, k03, k06–k09 |
| Markt: Obststand, Preisschild-Verwechslung | obst | marktfrau (Frau Kiwi) | k10 |
| Zurück am Flughafen: Wer flog mit der Kiste? | flugbuchung + bibliothek | tabea, pilotin | k11 |
| Insel Muschelbucht: NULL wird gefunden | insel | kapitaen (Oskar Orka) | k12 |
| Abschluss: Prüfung der Detektei-Akademie | alle | tabea | k13 / Probeprüfung |

Regeln für die Story: höchstens 1–3 kurze Sätze pro Schritt, nie Pflichtlektüre für die Aufgabe, keine Kopie von SQL Island (eigene Figuren, eigene Daten). Die Insel-DB nutzt nur das Schema (dorf, bewohner, gegenstand), alle Daten sind erfunden. Im Bewohner-Datensatz 19 «Kater NULL» und im Gegenstand «Katzenkorb» (besitzer NULL) steckt das Finale.

## 3. Lernpfad und Kapitel (Reihenfolge nach Abhängigkeit)

| Nr | Datei | Titel | DB | Haupt-Lernziele | Pflicht-Anker (Schritt-ids) |
|---|---|---|---|---|---|
| k01 | `chapters/k01-tabellen-lesen.json` | Der erste Fall: Tabellen lesen | flugbuchung | L3, L8, L12 (Einstieg), L10 (Einstieg) | s-begriffe, s-erste-abfrage, s-spalten, s-tabelle-fuellen |
| k02 | `chapters/k02-redundanz.json` | Das Chaos in der Bibliothek | bibliothek | L1, L2, L3 (logische Verknüpfung) | s-redundanz, s-probleme |
| k03 | `chapters/k03-schluessel-datentypen.json` | Schlüssel zu allem | bibliothek (+ flugbuchung) | L4, L5 | s-primaerschluessel, s-datentypen |
| k04 | `chapters/k04-schema-beziehungen.json` | Der Bauplan des Flughafens | flugbuchung | L6, L7, L8 | s-schema, s-nm |
| k05 | `chapters/k05-select-where.json` | Spuren filtern | flugbuchung | L12, L15 (Vergleich), L9 | s-where, s-vergleich, s-uebersetzen |
| k06 | `chapters/k06-sortieren-distinct-alias.json` | Ordnung in der Akte | bibliothek | L13, L21, L14, L20 | s-order-by, s-mehrere-kriterien, s-distinct, s-alias |
| k07 | `chapters/k07-logik-klammern.json` | Und, oder, nicht | bibliothek | L15 (logisch), L22 | s-and-or-not, s-klammern |
| k08 | `chapters/k08-muster-bereiche-null.json` | Unscharfe Zeugenaussagen | bibliothek | L16, L17, L18 | s-like, s-between-in, s-null |
| k09 | `chapters/k09-aggregate.json` | Zählen, summieren, vergleichen | bibliothek (+ insel) | L19 (+ L14 COUNT(DISTINCT), L20) | s-aggregate |
| k10 | `chapters/k10-kreuzprodukt.json` | Alles mit allem: das Kreuzprodukt | obst, flugbuchung | L23, L10, L11 | s-kreuzprodukt, s-zeilen-zaehlen, s-ergebnis-angeben |
| k11 | `chapters/k11-verknuepfen.json` | Die Spur über drei Tabellen | flugbuchung, bibliothek | L24, L7 | s-verknuepfen, s-zwischentabelle |
| k12 | `chapters/k12-insel-training.json` | Finale auf der Insel | insel | gemischt L9–L24 | – |
| k13 | `chapters/k13-pruefungspool.json` | Prüfungspool | alle | alle (Prüfungsstil) | – (nur `pool`, `nurPool: true` im Index) |

Die Pflicht-Anker sind die Ziele der Links «Zum Lernabschnitt» (aus `data/lernziele.json` und `data/fehlerarten.json`). `tools/check.py` prüft, dass sie existieren.

Zusätzliche Wege neben dem Lernpfad:
- **Einstufungstest** (`#/einstufung`): pro Lernziel eine leichte Aufgabe (stufe 1) aus dem Pool, ohne Hinweise; danach Empfehlung, mit welchem Kapitel man beginnt.
- **Heute fällig** (`#/training/faellig`): Wiederholung nach Leitner.
- **Schwächen trainieren** (`#/training/schwaechen`): Aufgaben der 3 schwächsten Lernziele.
- **Lernziel üben** (`#/training/lz/L17`), **Kapitel üben** (`#/training/kapitel/k08`).
- **Probeprüfung** (`#/pruefung`): 8/12/16 Aufgaben, 20–60 Minuten, nur Hilfsblatt, Auswertung erst bei Abgabe, danach nach Lernzielen.
- **Spielwiese** (`#/spielwiese`): freies SQL auf allen vier Datenbanken.

## 4. Aufgabentypen

| typ | Zweck | Auswertung |
|---|---|---|
| `sql` | Abfrage aus Text schreiben (L9, L12–L24) | Ergebnis gegen Referenzlösung: Mehrmenge der Zeilen; bei `reihenfolge: true` auch Reihenfolge; Spaltenreihenfolge tolerant (mit Hinweis); `spaltennamen: true` prüft Aliase; `muss`/`verboten` prüfen Sprachelemente |
| `ergebnis` | Ergebnis einer gegebenen Abfrage vorhersagen, ohne Ausführen (L10, L11, L23) | `modus: "anzahl"` Zahl der Zeilen (aus der DB berechnet); `modus: "zeilen"` Zeilen aus `kandidaten` ankreuzen |
| `choice` | Multiple Choice, einfach oder `mehrfach` | pro falscher Option eine Begründung `warum` |
| `text` | Kurzantwort (Begriff, Zahl, Wert) | normalisierter Vergleich mit `antworten` (Gross/klein, Umlaute ä/ae, Satzzeichen egal) oder Regex `muster` |
| `zuordnen` | Begriffe/Elemente Kategorien zuordnen (PK/FK/keins, Datentypen, Begriffe) | jedes Element einzeln |
| `tabelle` | Tabelle mit Werten füllen (L8), Ausgabetabelle eintragen (L11) | jede Zelle einzeln, mehrere zulässige Werte möglich |
| `info` | Erklärschritt im Lernpfad (kein Pool) | – |

Feedback bei `sql` (Fehlerarten in `data/fehlerarten.json`, jede mit Link zum Lernabschnitt): Syntaxfehler mit konkretem Tipp (überflüssiges Komma, fehlendes Anführungszeichen, Wert ohne `'…'`, `"alter"`), unbekannte Tabelle/Spalte (mit Liste aus dem Schema), mehrdeutige Spalte (→ `tabelle.spalte`), falsche Spaltenzahl (`*` erkannt), Duplikate (→ DISTINCT), Kreuzprodukt (mehrere Tabellen und viel zu viele Zeilen → Verknüpfungsbedingung fehlt), zu viele / zu wenige Zeilen (mit Beispielzeile), falsche Werte, falsche Reihenfolge, falsche Aliase. Hinweise auf Nicht-Prüfungsstoff (LIMIT, JOIN, GROUP BY, Unterabfragen, UPDATE/DELETE) erscheinen als ruhige Notiz.

**Hinweisstufen:** `hinweise` ist eine Liste (2–3 Stufen, vom Denkanstoss bis fast zur Lösung). Danach «Lösung zeigen». Nach dem Lösen oder Anzeigen folgt immer die `erklaerung`.

## 5. Kapitelformat (eine Datei pro Kapitel, JSON)

```json
{
  "id": "k05",
  "titel": "Spuren filtern",
  "untertitel": "Ein Satz, was man lernt.",
  "db": "flugbuchung",
  "lernziele": ["L9", "L12", "L15"],
  "dauer": 30,
  "schritte": [ Schritt, ... ],
  "pool":     [ Aufgabe, ... ]
}
```

- **Texte** (`text`, `frage`, `story`-Text, `hinweise[i]`, `erklaerung`) sind Strings oder Arrays von Zeilen (werden mit Zeilenumbruch verbunden). Mini-Markdown: `## Titel`, Absätze, `- Liste`, `1. Liste`, `> Merkkasten`, ```` ```sql ```` Codeblock (eingefärbt), `| Tabellen |`, `**fett**`, `*kursiv*`, `` `code` ``, `[Link](#/kapitel/k03/s-datentypen)`.
- **story**: String (Sprecherin Tabea) oder `[{"sprecher": "ammann", "text": "..."}]` (Ids aus `data/figuren.json`). Kurz halten.
- **Schritt `info`**: `{ "id", "typ": "info", "titel", "story", "text" }`.
- **Jede Aufgabe** (in `schritte` = Lernpfad, in `pool` = nur Training/Prüfung):

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | eindeutig im Kapitel, `a-…` (Pfad) oder `p-…` (Pool), nur a-z 0-9 - |
| `typ` | ja | sql, ergebnis, choice, text, zuordnen, tabelle |
| `lz` | ja | Lernziele, erstes = Hauptlernziel (z. B. `["L17", "L9"]`) |
| `thema` | ja | kurzes Thema, z. B. «BETWEEN» |
| `stufe` | ja | 1 leicht, 2 mittel, 3 prüfungsschwer |
| `titel` | Pfad ja | Überschrift |
| `frage` | ja | Aufgabentext |
| `hinweise` | ja | 2–3 Stufen |
| `erklaerung` | ja | Erklärung nach dem Lösen |
| `db` | nein | andere DB als das Kapitel |
| `zeigen` | nein | Tabellen (`"kunde"`) oder `{"titel": "...", "sql": "SELECT ..."}` zum Anzeigen |
| `parameter` | nein | Liste von Objekten; `{{name}}` in allen Texten/SQL wird ersetzt. Im Pfad wird Variante 1 gezeigt, im Training eine zufällige |
| `pruefung` | nein | `false` = nicht in die Probeprüfung |
| sql: `loesung`, `vorlage`, `reihenfolge`, `spaltennamen`, `muss`, `verboten`, `erlaubtLeer` | | `muss`/`verboten`: `[{"muster": "\\bBETWEEN\\b", "meldung": "Verwende BETWEEN."}]` (Regex auf gross geschriebenem SQL ohne Text-Literale) |
| ergebnis: `abfrage`, `modus`, `kandidaten`, `antwort`, `fehlerTipp` | | `antwort` optional (wird sonst aus der DB berechnet; check.py vergleicht) |
| choice: `optionen` `[{"text", "richtig", "warum"}]`, `mehrfach`, `mischen` | | |
| text: `antworten`, `muster`, `fehlerTipp`, `eingabeLabel` | | |
| zuordnen: `kategorien`, `elemente` `[{"text", "antwort", "warum"}]`, `mischen` (Standard: gemischt) | | |
| tabelle: `tabellenname`, `spalten`, `zeilen` (Zelle = Text, `null` oder `{"loesung": "x" \| ["x","y"], "platzhalter"}`) | | |

Kapitel 1 (`chapters/k01-tabellen-lesen.json`) ist das vollständige Muster: 17 Schritte (8 info, 9 Aufgaben) und 14 Pool-Aufgaben, alle Typen, Parameter-Varianten, Hinweisstufen, Erklärungen.

## 6. Mapping Lernziel → Kapitel / Aufgaben

Ziel: **mindestens 4 Aufgaben pro Lernziel** über alle Kapitel (Hauptkapitel liefert mindestens 6, davon mindestens 2 mit `parameter`). `tools/check.py` zählt und warnt.

| LZ | Inhalt | Lernabschnitt | Aufgaben (Ist k01 / Soll gesamt) |
|---|---|---|---|
| L1 | Redundanz | k02 s-redundanz | k02 ≥ 6 · k13 ≥ 1 |
| L2 | Probleme Einzeltabelle (Speicher, Inkonsistenz, Änderungsaufwand, Einfügen ohne Buch, Zählen) | k02 s-probleme | k02 ≥ 6 · k13 ≥ 1 |
| L3 | Datensatz, Attribut, Attributwert, logische Verknüpfung | k01 s-begriffe | **k01: 11** · k02 ≥ 2 |
| L4 | Primär-/Fremdschlüssel (zusammengesetzt, künstlich, minimal) | k03 s-primaerschluessel | k03 ≥ 8 · k04 ≥ 2 · k13 ≥ 1 |
| L5 | Datentypen INTEGER, TEXT, REAL, BOOLEAN, Datum | k03 s-datentypen | k03 ≥ 6 |
| L6 | Datenbankschema lesen/zeichnen | k04 s-schema | k04 ≥ 6 |
| L7 | n:m braucht eigene Tabelle | k04 s-nm | k04 ≥ 4 · k11 ≥ 2 |
| L8 | Tabellen zeichnen und füllen | k01 s-tabelle-fuellen | **k01: 5** · k04 ≥ 2 |
| L9 | Text → SQL | k05 s-uebersetzen | k01: 3 · in allen SQL-Kapiteln als Zweit-LZ |
| L10 | Anzahl Ergebniszeilen bestimmen | k10 s-zeilen-zaehlen | k01: 3 · k05–k09 je ≥ 1 · k10 ≥ 6 |
| L11 | Ergebniszeilen angeben | k10 s-ergebnis-angeben | k05–k08 je ≥ 1 · k10 ≥ 4 |
| L12 | SELECT, FROM, WHERE | k05 s-where | **k01: 9** · k05 ≥ 6 |
| L13 | ORDER BY ASC/DESC | k06 s-order-by | k06 ≥ 5 |
| L14 | DISTINCT | k06 s-distinct | k06 ≥ 4 · k09 ≥ 2 (COUNT(DISTINCT)) |
| L15 | Vergleichs- und logische Operatoren | k05 s-vergleich | k05 ≥ 4 · k07 ≥ 4 |
| L16 | LIKE / NOT LIKE, % und _ | k08 s-like | k08 ≥ 5 |
| L17 | BETWEEN, IN, NOT IN | k08 s-between-in | k08 ≥ 5 |
| L18 | IS NULL / IS NOT NULL | k08 s-null | k08 ≥ 4 · k12 ≥ 1 |
| L19 | COUNT, MIN, MAX, SUM, AVG | k09 s-aggregate | k09 ≥ 8 |
| L20 | Alias AS | k06 s-alias | k06 ≥ 3 · k09 ≥ 2 |
| L21 | Sortierkriterien kombinieren | k06 s-mehrere-kriterien | k06 ≥ 4 |
| L22 | Klammern, Priorität NOT > AND > OR | k07 s-klammern | k07 ≥ 6 |
| L23 | Kreuzprodukt | k10 s-kreuzprodukt | k10 ≥ 6 |
| L24 | Tabellen verknüpfen (auch über Zwischentabelle) | k11 s-verknuepfen | k11 ≥ 8 · k12 ≥ 2 |

## 7. Lücken und Widersprüche im Material – Lösung

| Problem | Lösung im Konzept |
|---|---|
| Hilfsblatt Tipp 5 «AND > OR > NOT» ist falsch | `data/hilfsblatt.md` zeigt das Original und darunter einen markierten Korrekturkasten: **NOT > AND > OR**. k07 behandelt die Priorität ausdrücklich, mit Aufgabe «Was bedeutet `a OR b AND c`?» und dem Rat, immer Klammern zu setzen. |
| L5 nennt BOOLEAN und DATUM, Folien nennen NUMERIC für Datum, kein BOOLEAN | k03 lehrt beide Sichten: INTEGER, TEXT, REAL, BOOLEAN (wahr/falsch; in SQLite als 0/1 gespeichert), Datum (DATE; in unseren SQLite-DBs als NUMERIC bzw. Text `JJJJ-MM-TT`). Aufgaben fragen den *geeigneten Einsatz* ab, nicht SQLite-Interna. |
| SQL-Lösungen zur Bibliothek ungetestet, Originaldaten fehlen | Eigene Lern-Daten `data/bibliothek.sql` (die 6 Bücher/6 Autoren/3 Verlage der Folien plus erfundene, plausible Daten; klar markiert). Jede Referenzlösung läuft automatisch in `tools/check.py`. Arbeitsblatt-Aufgaben dürfen übernommen werden, aber **nie die Tipp-Zahlen** des Arbeitsblatts zitieren. |
| UPDATE, DELETE, GROUP BY (SQL Island) nicht prüfungsrelevant | Nicht im Lernstoff. check.py lehnt Referenzlösungen mit UPDATE/DELETE/INSERT, GROUP BY, HAVING, LIMIT, JOIN, Unterabfragen ab. Die Engine führt alles auf einer Kopie aus und zeigt bei solchen Befehlen eine ruhige Notiz. |
| LOWER in einer Arbeitsblatt-Überschrift, nirgends erklärt, nicht auf dem Hilfsblatt | Nicht verwenden. Wichtig: In SQLite ist `LIKE` für A–Z **nicht** gross-/kleinschreibungsempfindlich, `=` schon. k08 erwähnt das in einem Merkkasten; Aufgaben dürfen nicht davon abhängen. |
| Spalte `alter` ist in SQLite ein Schlüsselwort | Spalte bleibt `alter` (wie im Unterricht). In SQL muss sie `"alter"` heissen; die Engine erkennt den Fehler und erklärt es. Hinweis in Aufgaben: «auf Papier darfst du alter schreiben». |
| Datumsformat flugbuchung dd.mm.yy vs. ISO | ISO `JJJJ-MM-TT` überall (vergleichbar mit `<`, `BETWEEN`). |
| JOIN-Syntax vs. Komma + WHERE | Unterricht/Hilfsblatt: Komma + WHERE. JOIN wird akzeptiert, aber mit Notiz. |
| Tutorial 4.3.1 Aufgabentext-Tippfehler, Kreuzprodukt-Blatt 08 mit Lösung | Nicht übernehmen; eigene Aufgabentexte. |
| AVG fehlt im Tutorial 7.2, steht aber in L19/Hilfsblatt | k09 behandelt AVG. |
| PK von Tagespreis unbekannt | `data/obst.sql`: ArtikelNr als PK (Annahme, im Skript vermerkt). |
| PK/FK der Insel-DB nicht ausgewiesen | Abgeleitet (dorfnr, bewohnernr; gegenstand PK = Name). Eigene Daten. |

## 8. Hilfsblatt-Integration

- Knopf «Hilfsblatt» oben (oder Taste **H** ausserhalb von Eingabefeldern) öffnet ein Seitenpanel (auf dem Handy Vollbild), **Escape** schliesst. Inhalt: `data/hilfsblatt.md` (Original in Schweizer Schreibweise + Korrekturkasten).
- Zweiter Reiter «Schema»: alle Tabellen der aktuellen DB mit PK/FK-Markierung, Datentypen, Zeilenzahl, Daten auf Knopfdruck. Unter jedem SQL-Eingabefeld steht zusätzlich eine kompakte Schema-Zeile (wie bei SQL Island).
- **Prüfungsmodus** (Schalter oben): keine Hinweise, keine Lösungen, kein freies Ausführen, keine Ergebnistabelle vor der Abgabe; das Panel zeigt **nur das Hilfsblatt**. Die Probeprüfung läuft immer so (zusätzlich Zeitlimit, Auswertung erst am Ende).

## 9. Fortschritt, Statistik, Wiederholung

Speicher: `localStorage` Schlüssel `sql-pruefung.fortschritt.v1`, jeder Zugriff in try/catch; ohne Speicher läuft alles im Arbeitsspeicher, die Startseite weist darauf hin (`js/progress.js`).

Gespeichert wird:
- **pro Aufgabe** (`kapitel.id`): Versuche, richtig, falsch, Fehlerarten mit Anzahl, Hinweisnutzung, Lösung angezeigt, letzter Versuch (Zeitpunkt, Ergebnis), gelöst, Leitner-Box, Fälligkeit, Beherrschungswert (gleitender Mittelwert);
- **pro Lernziel**: Versuche, richtig, falsch, Fehlerarten, letzter Zeitpunkt;
- **Log** der letzten 1500 Versuche (Zeit, Aufgabe, Lernziele, Ergebnis, Fehlerart, Hinweise, Quelle Pfad/Training/Einstufung/Prüfung, Variante);
- Lernpfad-Position je Kapitel, Probeprüfungen, Einstufung, Einstellung Prüfungsmodus.

Bewertung einer Begegnung (nur der erste Versuch zählt für Box/Beherrschung): ohne Hilfe 1.0, mit Hinweisen 0.6, Lösung angesehen 0.2, falsch 0. Beherrschung = Mittelwert über die geübten Aufgaben des Lernziels (neuere Versuche zählen stärker). Ampel: grün ≥ 80 % (und mind. 3 Aufgaben geübt), gelb ≥ 50 %, rot darunter, grau = nicht geübt.

**Leitner:** Box 1 → in 10 Minuten wieder fällig, Box 2 → 1 Tag, 3 → 3 Tage, 4 → 7 Tage, 5 → 16 Tage. Richtig ohne Hilfe: eine Box höher; mit Hinweisen: Box bleibt; falsch oder Lösung angesehen: zurück in Box 1. «Heute fällig» = alles bis Tagesende Fällige.

**Schwächen-Dashboard** (`#/fortschritt`): Ampel und Prozent pro Lernziel, die drei schwächsten Lernziele mit «üben»/«nachlesen», typische Fehler (häufigste Fehlerarten mit Link zum Konzept), Probeprüfungs-Verlauf, **Export/Import als JSON** und Zurücksetzen (zweistufiger Knopf statt Dialog).

## 10. Technik

- Rein statisch, kein Build-Schritt: `index.html`, `css/style.css`, ES-Module in `js/`, Inhalte als JSON/SQL/Markdown. Läuft auf GitHub Pages und mit jedem lokalen Webserver (nicht per `file://`, weil `fetch` nötig ist).
- **sql.js 1.10.3** von cdnjs mit Subresource Integrity; die WASM-Datei wird von derselben CDN-Adresse geladen. Fallback: liegen `vendor/sql-wasm.js` und `vendor/sql-wasm.wasm` vor, werden sie verwendet (für Offline-Betrieb manuell ablegen). Keine weiteren Abhängigkeiten; Syntax-Hervorhebung ist ein eigenes Mini-Modul (`js/highlight.js`).
- Jede Ausführung läuft auf einer frischen Kopie der Datenbank (Änderungen sind folgenlos).

| Datei | Aufgabe |
|---|---|
| `js/app.js` | Router (`#/…`), Ansichten: Start, Kapitel, Training, Einstufung, Probeprüfung, Fortschritt, Spielwiese, Panel |
| `js/tasks.js` | Rendering und Auswertung aller Aufgabentypen, Hinweise, Lösung, Erklärung |
| `js/compare.js` | Ergebnisvergleich, Fehlermeldungen, Schlüsselwort-Regeln |
| `js/db.js` | sql.js laden, DBs aus `data/*.sql` aufbauen, Abfragen ausführen, Schema lesen |
| `js/content.js` | Kapitel/Lernziele/Figuren/Fehlerarten laden, Aufgabenpool, Parameter-Varianten |
| `js/progress.js` | Speicher, Statistik, Leitner, Beherrschung, Export/Import |
| `js/markdown.js`, `js/highlight.js`, `js/util.js` | Hilfsmodule |
| `data/*.sql` | flugbuchung, bibliothek (Lern-Daten), obst, insel (Lern-Daten) |
| `data/*.json`, `data/hilfsblatt.md` | Datenbankliste, Lernziele mit Anker, Figuren, Fehlerarten, Hilfsblatt |
| `chapters/index.json` | Reihenfolge aller Kapitel (alle 13 schon eingetragen; fehlende Dateien erscheinen als «Kapitel folgt») |

## 11. Arbeitspakete für parallele Subagenten

**Jedes Paket schreibt genau eine Datei** in `chapters/`. Gemeinsame Dateien (`chapters/index.json`, `js/`, `css/`, `data/`) werden **nicht** verändert. Fehlt etwas in einer Datenbank, wird es dem Koordinator gemeldet statt selbst geändert. Vorlage: `chapters/k01-tabellen-lesen.json`.

| Paket | Datei | Inhalt | Mindestumfang |
|---|---|---|---|
| AP-02 | `chapters/k02-redundanz.json` | Grosse Bibliothekstabelle (Folie F4) als Markdown-Tabelle; Brugger «Ralf N.»/«Ralf», «Addison Wesley»/«Addison-Wesley»; Probleme: Speicher, Tippfehler/Inkonsistenz, Änderungsaufwand (Verlag umbenennen), Autorin ohne Buch nicht erfassbar, Zählen schwierig; Lösung: Aufteilen in buch, autor, verlag, buch_aut; logische Verknüpfung über Ids | L1 ≥ 6, L2 ≥ 6, L3 ≥ 2 |
| AP-03 | `chapters/k03-schluessel-datentypen.json` | PK (eindeutig, nicht NULL, minimal; künstlich vs. natürlich, ISBN-Diskussion), zusammengesetzter PK (buch_aut), FK und referenzielle Integrität; Wahr/Falsch-Aussagen (Arbeitsblatt Aufgabe 2), Minimalität (Aufgabe 4: (knr, flugnr, datum)); Datentypen INTEGER/TEXT/REAL/BOOLEAN/Datum (siehe Abschnitt 7) | L4 ≥ 8, L5 ≥ 6 |
| AP-04 | `chapters/k04-schema-beziehungen.json` | Schema-Darstellung (Tabellen, Attribute, Datentypen, PK/FK, Pfeile), Schema der flugbuchung erarbeiten (Arbeitsblatt Aufgabe 3) mit `zuordnen`/`tabelle`; 1:n vs. n:m; warum n:m eine Zwischentabelle braucht (Kunde–Flug über buchung, Buch–Autor über buch_aut); Tabellen aus Text entwerfen | L6 ≥ 6, L7 ≥ 4, L8 ≥ 2 |
| AP-05 | `chapters/k05-select-where.json` | WHERE, Selektion vs. Projektion, Text in `'…'`, Zahlen ohne, `=`, `<>`, `<`, `<=`, `>`, `>=` auch bei Text und ISO-Datum, `"alter"`; Strategie «Text → SQL» (Welche Spalten? Welche Tabelle? Welche Bedingung?) | L12 ≥ 6, L15 ≥ 4, L9 ≥ 4, L10/L11 je ≥ 1 |
| AP-06 | `chapters/k06-sortieren-distinct-alias.json` | ORDER BY ASC/DESC, mehrere Kriterien, ORDER BY 2, DISTINCT, AS für Spalten und Tabellen | L13 ≥ 5, L21 ≥ 4, L14 ≥ 4, L20 ≥ 3 |
| AP-07 | `chapters/k07-logik-klammern.json` | AND, OR, NOT, Wahrheitstabelle im Kopf, Priorität **NOT > AND > OR** (Hilfsblatt-Fehler erklären), Klammern; viele `ergebnis`-Aufgaben | L15 ≥ 4, L22 ≥ 6, L10/L11 je ≥ 1 |
| AP-08 | `chapters/k08-muster-bereiche-null.json` | LIKE/NOT LIKE mit `%` und `_` (SQLite-LIKE ignoriert Gross/klein bei A–Z), BETWEEN inkl. Grenzen, NOT BETWEEN, IN, NOT IN, IS NULL/IS NOT NULL, `= NULL` als typischer Fehler | L16 ≥ 5, L17 ≥ 5, L18 ≥ 4 |
| AP-09 | `chapters/k09-aggregate.json` | COUNT(*), COUNT(spalte) (zählt keine NULL), COUNT(DISTINCT), MIN, MAX, SUM, AVG, Alias; «keine Einzelzeilen mehr»; kein GROUP BY | L19 ≥ 8, L14 ≥ 2, L20 ≥ 2 |
| AP-10 | `chapters/k10-kreuzprodukt.json` | Obst-Beispiel (Folie F7/F8), Kreuzprodukt-Arbeitsblatt Aufgaben 1–4 (flugbuchung: 99, 22, 2, 495/45 Zeilen) als `ergebnis`/`tabelle`, Zeilen zählen = multiplizieren, dann filtern | L23 ≥ 6, L10 ≥ 6, L11 ≥ 4 |
| AP-11 | `chapters/k11-verknuepfen.json` | Verknüpfung FROM a, b WHERE a.pk = b.fk, `tabelle.spalte`, drei Tabellen über Zwischentabelle (buch_aut, buch_sw; buchung zwischen kunde und flug), Tabellenalias | L24 ≥ 8, L7 ≥ 2, L9 ≥ 2 |
| AP-12 | `chapters/k12-insel-training.json` | Gemischtes Training auf der Insel-DB, Story-Finale (Kater NULL, Katzenkorb ohne Besitzer) | ≥ 12 Aufgaben über L9–L24 |
| AP-13 | `chapters/k13-pruefungspool.json` | Nur `pool` (`"schritte": []`), Aufgaben im Stil der Prüfung (stufe 2–3), alle DBs über `db` pro Aufgabe, jedes Lernziel L1–L24 mindestens einmal | ≥ 30 Aufgaben |

Regeln für alle Pakete:
1. Schweizer Rechtschreibung, **kein ß** (check.py meldet es als Fehler). Du-Form, kurze Sätze, kein Vorwissen voraussetzen, das nicht in früheren Kapiteln kam.
2. Lernpfad: 6–10 Aufgaben plus Info-Schritte im Wechsel («erklären → ausprobieren»), Pflicht-Anker als `info`-Schritt-ids. Pool: so viele Aufgaben, dass der Mindestumfang erfüllt ist; mindestens 2 Aufgaben pro Haupt-LZ mit `parameter` (3–4 Varianten).
3. Typen mischen; SQL-Kapitel enthalten immer auch `ergebnis`-Aufgaben (Prüfung!).
4. Nur Prüfungsstoff (kein LIMIT, JOIN, GROUP BY, UPDATE …). Referenzlösungen im Stil des Hilfsblatts (Komma + WHERE). Bei `reihenfolge: true` muss die Sortierung eindeutig sein (check.py prüft das).
5. Abschluss: `python3 tools/check.py` muss für die eigene Datei fehlerfrei sein. Daten anschauen: `python3 -c "import sqlite3; c=sqlite3.connect(':memory:'); c.executescript(open('data/bibliothek.sql').read()); print(c.execute('SELECT …').fetchall())"`.

## 12. Test- und Qualitätskonzept

- `python3 tools/check.py` (ohne Abhängigkeiten, Python-`sqlite3`):
  - lädt alle `data/*.sql`, prüft Fremdschlüssel-Integrität;
  - prüft jedes Kapitel: gültiges JSON, Ids, Typen, Pflichtfelder, Tags (`lz`, `thema`, `stufe`), kein ß, keine übrig gebliebenen `{{…}}`;
  - führt **jede Referenzlösung und jede Abfrage in jeder Parameter-Variante** aus: Fehler, leere Ergebnisse, `antwort` stimmt, Kandidaten enthalten alle Ergebniszeilen, Lösung erfüllt eigene `muss`/`verboten`, kein Nicht-Prüfungsstoff, bei `reihenfolge` eindeutige Sortierung (Gegenprobe auf einer DB-Kopie mit umgekehrt gespeicherten Zeilen);
  - prüft die Links der Lernziele und Fehlerarten auf existierende Schritte;
  - zählt Aufgaben pro Lernziel (Ziel ≥ 4). `--strict` macht fehlende Kapitel und zu kleine Pools zu Fehlern (für die Endabnahme), `--verbose` listet alles.
- Browser-Test (manuell, mit lokalem Server): je Kapitel eine Aufgabe falsch und richtig lösen, Konsole ohne Fehler, Handy-Breite 375 px ohne horizontales Scrollen, hell und dunkel.
- Endabnahme: `python3 tools/check.py --strict` fehlerfrei.
