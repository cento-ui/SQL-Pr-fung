# SQL-Detektei

Lernumgebung zur Prüfung «Relationale Datenbanken und SQL» (5.11.2026). Schritt für Schritt von «Was ist eine Tabelle?» bis zu Abfragen über mehrere Tabellen. SQL läuft direkt im Browser (SQLite über sql.js); Fortschritt, Schwächen und Wiederholungen werden im Browser gespeichert. Details: [CONCEPT.md](CONCEPT.md).

## Lokal starten

Die Seite braucht einen Webserver (per Doppelklick als Datei funktioniert `fetch` nicht):

```sh
cd SQL-Pruefung
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen. Für GitHub Pages: Ordner als Repository hochladen und Pages auf den Hauptzweig stellen; es gibt keinen Build-Schritt.

sql.js 1.10.3 wird von cdnjs geladen (Internet nötig). Für Offline-Betrieb `sql-wasm.js` und `sql-wasm.wasm` derselben Version nach `vendor/` legen; die Seite nutzt sie automatisch, wenn das CDN nicht erreichbar ist.

## Aufbau

```
index.html            Seitengerüst
css/style.css         Design (hell/dunkel automatisch)
js/app.js             Router und Ansichten (Lernpfad, Training, Probeprüfung, Fortschritt, Spielwiese, Hilfsblatt/Schema)
js/tasks.js           Aufgabentypen: sql, ergebnis, choice, text, zuordnen, tabelle
js/compare.js         Ergebnisvergleich und verständliche Fehlermeldungen
js/db.js              sql.js laden, Datenbanken aufbauen, Abfragen ausführen
js/content.js         Kapitel, Lernziele, Aufgabenpool, Parameter-Varianten
js/progress.js        localStorage, Statistik, Leitner-Wiederholung, Export/Import
js/markdown.js, js/highlight.js, js/util.js
data/*.sql            Datenbanken: flugbuchung, bibliothek (Lern-Daten), obst, insel (Lern-Daten)
data/*.json           Datenbankliste, Lernziele L1-L24, Figuren, Fehlerarten
data/hilfsblatt.md    Hilfsblatt (mit Korrektur zu Tipp 5: NOT > AND > OR)
chapters/index.json   Reihenfolge der Kapitel
chapters/kNN-*.json   ein Kapitel pro Datei
tools/check.py        automatische Prüfung aller Inhalte und Referenzlösungen
```

## Ein Kapitel ergänzen

1. Datei laut `chapters/index.json` anlegen (z. B. `chapters/k05-select-where.json`). Format und Felder: CONCEPT.md, Abschnitt 5. Muster: `chapters/k01-tabellen-lesen.json`.
2. Lernpfad in `schritte` (Info-Schritte und Aufgaben im Wechsel), zusätzliche Übungen in `pool`. Jede Aufgabe braucht `lz`, `thema`, `stufe`, `frage`, `hinweise`, `erklaerung`; Varianten über `parameter` und `{{platzhalter}}`.
3. Die Anker aus `data/lernziele.json` (z. B. `s-where`) als Schritt-ids verwenden.
4. Prüfen:

```sh
python3 tools/check.py            # Fehler = Exit-Code 1
python3 tools/check.py --verbose  # jede Aufgabe einzeln
python3 tools/check.py --strict   # Endabnahme: alle Kapitel da, jedes Lernziel >= 4 Aufgaben
```

5. Im Browser ansehen: `#/kapitel/k05`, Training des Kapitels: `#/training/kapitel/k05`.

## Bedienung

- **Ctrl/Cmd + Enter** prüft eine SQL-Abfrage, **H** öffnet das Hilfsblatt, **Escape** schliesst das Panel.
- **Prüfungsmodus** (Schalter oben): keine Hinweise und Lösungen, kein freies Ausführen, nur das Hilfsblatt.
- **Fortschritt**: Beherrschung pro Lernziel, schwächste Lernziele, typische Fehler, Export/Import/Zurücksetzen.
