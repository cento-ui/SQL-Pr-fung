-- Datenbank obst (Tagespreise fuer Obst)
-- Quelle: Folien RDB_SQL F7/F8 (Kreuzprodukt-Demo). Daten unveraendert.
-- Der Primaerschluessel von Tagespreis ist im Material nicht angegeben; hier ArtikelNr.

CREATE TABLE Artikel (
  ArtikelNr INTEGER PRIMARY KEY,
  Beschreibung TEXT
);

CREATE TABLE Tagespreis (
  ArtikelNr INTEGER PRIMARY KEY REFERENCES Artikel(ArtikelNr),
  Tagespreis REAL
);

INSERT INTO Artikel VALUES (1,'Trauben(500g)'),(2,'Kiwi(3Stk.)');
INSERT INTO Tagespreis VALUES (1,3.5),(2,4.75);
