# SQL – Hilfsblatt

Inhalt wie das erlaubte Hilfsblatt der Prüfung (Schweizer Schreibweise). Eine Korrektur ist unten markiert.

## Grundstruktur einer SQL-Abfrage

- SELECT → welche Spalten sollen angezeigt werden
- FROM → aus welcher Tabelle
- WHERE → Bedingung / Filter
- ORDER BY → Sortierung (ASC = aufsteigend, DESC = absteigend)

```sql
SELECT spalte1, spalte2
FROM T1
WHERE bedingung
ORDER BY spalte1 [ASC|DESC];
```

## Bedingungen & Operatoren

| Ausdruck | Bedeutung | Beispiel |
|---|---|---|
| = | gleich | spalte1 = 10 |
| <> | ungleich | spalte2 <> 'X' |
| > < >= <= | grösser / kleiner (gleich) | spalte3 >= 2000 |
| AND | UND | spalte1 > 10 AND spalte2 < 20 |
| OR | ODER | spalte1 < 5 OR spalte1 IS NULL |
| NOT | Negation | NOT spalte1 = 10 |
| BETWEEN a AND b | Bereich inkl. Grenzen | spalte1 BETWEEN 5 AND 10 |
| IN (...) | mehrere Werte prüfen | spalte2 IN ('A','B','C') |
| LIKE % _ | Mustervergleich (% = beliebig viele Zeichen, _ = genau ein Zeichen) | spalte1 LIKE 'A%' → Auto, Apfel; spalte1 LIKE 'A_t' → Ast |
| IS NULL / IS NOT NULL | auf leere Werte prüfen | spalte3 IS NULL |

## Aggregatfunktionen

| Funktion | Bedeutung | Beispiel |
|---|---|---|
| COUNT(*) | Anzahl der Zeilen | SELECT COUNT(*) FROM T1; |
| COUNT(DISTINCT x) | Anzahl verschiedener Werte | SELECT COUNT(DISTINCT spalte1) FROM T1; |
| MIN(x) / MAX(x) | kleinster / grösster Wert | SELECT MIN(spalte1), MAX(spalte1) FROM T1; |
| AVG(x) | Durchschnitt | SELECT AVG(spalte1) FROM T1; |
| SUM(x) | Summe | SELECT SUM(spalte1) FROM T1; |

Bei Aggregatfunktionen werden keine Einzelzeilen mehr ausgegeben.

## Kreuzprodukt & Tabellenverknüpfung

- Tabellen durch Komma getrennt
- Beziehungen über WHERE definieren

```sql
SELECT T1.spalte1, T2.spalte2
FROM T1, T2
WHERE T1.schluessel = T2.schluessel;
```

Ohne WHERE entsteht ein Kreuzprodukt → jede Zeile aus T1 mit jeder Zeile aus T2.

## Verknüpfung über Zwischentabellen (n:m)

- T2 ist die Mapping-Tabelle
- Verknüpfung über Primär- und Fremdschlüssel
- id_T1 und id_T3 sind Fremdschlüssel in T2, die auf die Primärschlüssel in T1 bzw. T3 verweisen

```sql
SELECT T1.spalte1, T3.spalte2
FROM T1, T2, T3
WHERE T1.id = T2.id_T1
AND T3.id = T2.id_T3;
```

## Nützliche Extras

| Schlüsselwort | Funktion | Beispiel |
|---|---|---|
| AS | Alias (neuer Name) | SELECT spalte1 AS name |
| DISTINCT | doppelte Werte entfernen | SELECT DISTINCT spalte1 |
| ORDER BY 2 | Sortiert nach zweiter Spalte | ORDER BY 2 DESC |
| * | alle Spalten auswählen | SELECT * FROM T1 |

## Tipps für die Prüfung

1. Tabellen & Beziehungen zuerst klären.
2. SELECT → FROM → WHERE → ORDER BY logisch aufbauen.
3. Bei Aggregaten (COUNT, MIN, …) nur relevante Spalten zählen.
4. Mit DISTINCT doppelte Einträge vermeiden.
5. WHERE-Bedingungen genau lesen – Reihenfolge ist logisch entscheidend (AND > OR > NOT).

> **Achtung, Korrektur zu Tipp 5:** Auf dem Original-Hilfsblatt steht «AND > OR > NOT». Richtig ist die Bindungsstärke **NOT > AND > OR** (so auch im SQL-Tutorial, 9.3): NOT bindet am stärksten, dann AND, zuletzt OR. Beispiel: `a OR b AND c` bedeutet `a OR (b AND c)`. Im Zweifel immer Klammern setzen.
