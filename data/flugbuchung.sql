-- Datenbank flugbuchung
-- Quelle: RDB Grundlagen Arbeitsblatt (Aufgabe 3/4) und Kreuzprodukt-Arbeitsblaetter.
-- Daten unveraendert aus dem Unterrichtsmaterial, Datum im ISO-Format (yyyy-mm-dd).
-- Hinweis: "alter" ist in SQLite ein Schluesselwort (ALTER TABLE). Die Spalte muss
-- deshalb in Abfragen in doppelten Anfuehrungszeichen stehen: SELECT "alter" FROM kunde

CREATE TABLE kunde (
  knr INTEGER PRIMARY KEY,
  name TEXT,
  vorname TEXT,
  "alter" INTEGER
);

CREATE TABLE flug (
  flugnr TEXT PRIMARY KEY,
  fluglinie TEXT,
  von TEXT,
  nach TEXT,
  ab NUMERIC,
  an NUMERIC,
  groesse INTEGER
);

CREATE TABLE buchung (
  bnr INTEGER PRIMARY KEY,
  knr INTEGER REFERENCES kunde(knr),
  flugnr TEXT REFERENCES flug(flugnr),
  sitz INTEGER,
  datum NUMERIC
);

INSERT INTO kunde VALUES
(1,'Adlon','Markus',26),
(2,'Schmitz','Marco',25),
(3,'Meier','Julia',32),
(4,'Meyer','Herman',64),
(5,'Messdiener','Jochen',15),
(6,'Tiedemann','Katharina',59),
(7,'Beyenburg','Dirk',29),
(8,'Paetzold','Claudia',27),
(9,'Kowalski','Michael',33),
(10,'Ackermann','Volker',28),
(11,'Lahm','Ulrich',23);

INSERT INTO flug VALUES
('US1','USAirways','Frankfurt','Pittsburgh','11:20:00','16:38:00',380),
('BA1','BritishAirways','London','Berlin','17:10:00','18:10:00',220),
('GW4','Germanwings','LondonStansted','Köln/Bonn','08:00:00','10:15:00',220),
('LH772','Lufthansa','Frankfurt','Sydney','22:30:00','06:35:00',380),
('LH7','Lufthansa','Frankfurt','NewYorkJFK','10:00:00','12:30:00',421);

INSERT INTO buchung VALUES
(1001,1,'US1',12,'2025-09-15'),
(1002,8,'GW4',54,'2025-09-23'),
(1003,7,'GW4',55,'2025-09-17'),
(1004,7,'US1',123,'2025-09-25'),
(1005,2,'LH772',77,'2025-09-19'),
(1006,6,'BA1',101,'2025-09-22'),
(1007,5,'LH772',102,'2025-09-21'),
(1008,4,'LH7',24,'2025-09-22'),
(1009,8,'US1',79,'2025-09-23');
