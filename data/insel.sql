-- Datenbank insel  (LERN-DATEN)
-- Schema angelehnt an SQL Island (Tabellen dorf, bewohner, gegenstand), damit die
-- Uebungen aus dem Unterricht passen. ALLE DATEN SIND EIGENE, ERFUNDENE LERN-DATEN
-- (keine Kopie der SQL-Island-Daten). Werte ohne Umlaute wie im Original-Spiel
-- (z. B. 'Haendler', 'Baecker').

CREATE TABLE dorf (
  dorfnr INTEGER PRIMARY KEY,
  name TEXT,
  haeuptling INTEGER REFERENCES bewohner(bewohnernr)
);

CREATE TABLE bewohner (
  bewohnernr INTEGER PRIMARY KEY,
  name TEXT,
  dorfnr INTEGER REFERENCES dorf(dorfnr),
  geschlecht TEXT,
  beruf TEXT,
  gold INTEGER,
  status TEXT
);

CREATE TABLE gegenstand (
  gegenstand TEXT PRIMARY KEY,
  besitzer INTEGER REFERENCES bewohner(bewohnernr)
);

INSERT INTO dorf VALUES
(1,'Muschelbucht',3),
(2,'Palmenhain',8),
(3,'Felsenau',14);

INSERT INTO bewohner VALUES
(1,'Kai Kokos',1,'m','Fischer',120,'friedlich'),
(2,'Mara Muschel',1,'w','Haendler',540,'friedlich'),
(3,'Oskar Orka',1,'m','Kapitaen',890,'friedlich'),
(4,'Lina Lagune',1,'w','Heilerin',310,'friedlich'),
(5,'Ben Brandung',1,'m','Schmied',260,'misstrauisch'),
(6,'Wanda Welle',1,'w','Baecker',95,'friedlich'),
(7,'Paul Palme',2,'m','Kaufmann',720,'friedlich'),
(8,'Hanna Hibiskus',2,'w','Kaufmann',1030,'friedlich'),
(9,'Timo Tukan',2,'m','Hufschmied',180,'friedlich'),
(10,'Rita Riff',2,'w','Pilot',400,'friedlich'),
(11,'Gustav Gecko',2,'m','Haendler',60,'misstrauisch'),
(12,'Nora Nebel',2,'w','Weberin',150,'gefangen'),
(13,'Fritz Fels',3,'m','Waffenschmied',610,'misstrauisch'),
(14,'Greta Granit',3,'w','Baecker',480,'friedlich'),
(15,'Udo Uhu',3,'m','Koch',75,'friedlich'),
(16,'Erna Echse',3,'w','Haendler',230,'friedlich'),
(17,'Sven Sturm',3,'m','Pilot',0,'gefangen'),
(18,'Dora Duene',3,'w','Fischerin',140,'friedlich'),
(19,'Kater NULL',NULL,'m',NULL,NULL,'friedlich'),
(20,'Gast',NULL,NULL,NULL,0,'friedlich');

INSERT INTO gegenstand VALUES
('Kompass',3),
('Fernrohr',3),
('Fischernetz',1),
('Hammer',5),
('Amboss',13),
('Kochtopf',15),
('Webstuhl',12),
('Funkgeraet',10),
('Katzenkorb',NULL),
('Landkarte',NULL),
('Taschenlampe',NULL),
('Goldmuenze',8);
