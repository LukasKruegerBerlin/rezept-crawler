# Rückblick: Feature 5 „Favoriten“

**Datum:** 2026-11-09
**Ergebnis:** `42e192e feat: favorites` auf `main` (lokal, noch nicht gepusht)
**Archiv:** [05-favorites.md](../features/05-favorites.md)

## 1. Projektübersicht geprüft

Mit `/overview` hat Claude geprüft, ob die Projektübersicht noch zu den Plänen
passt. Der Fingerabdruck stimmte, es musste nichts neu erzeugt werden. Claude
hat aber drei Unstimmigkeiten zwischen den Plänen gemeldet:

1. Im Projektplan stand als Sortierung `min-missing-ingredients`, im Build-Plan
   der Hinweis, dass `max-used-ingredients` im Test besser war.
2. Unter „Open decisions“ standen noch Fragen, die frühere Features längst
   beantwortet hatten (Modelle, Anzahl der Treffer, Detail als Dialog).
3. Drei Ideen für später standen nur im Build-Plan, nicht im Projektplan.

> **Dein Part:** Du hast entschieden, Punkt 1 und 2 anzupassen, und bei
> Punkt 3 nach einem Vorschlag gefragt.

Claude hat bei Punkt 1 bewusst **nicht** die Sortierung umgestellt, sondern
den Plan an den echten Code angepasst. Der nutzt weiterhin
`min-missing-ingredients`, der Wechsel bleibt ein späterer Punkt. Eine
Umstellung wäre eine Codeänderung gewesen, keine Planänderung. Bei Punkt 2
wurden die getroffenen Entscheidungen (`haiku` für Übersetzungen, `sonnet`
für KI-Rezepte, 20 Treffer, Detail als Dialog) in den Plan geschrieben.
Für Punkt 3 schlug Claude vor, die drei Ideen in die bestehende Liste
„Explicit non-goals (MVP)“ mit dem Zusatz „(later)“ aufzunehmen, wie es dort
schon bei Diät-Filtern und Einkaufsliste steht.

> **Dein Part:** Du hast den Vorschlag angenommen und direkt `/feature`
> angestoßen.

## 2. Plan für das Feature erstellt

Claude hat eine Spec in vier Schritten geschrieben: Speicher-Modul im Backend,
Endpunkte, Favoritenliste im Frontend und der Speichern-Knopf im Rezept-Dialog.

Drei Entscheidungen hat Claude selbst getroffen und offen benannt:

- **Die Favoriten-ID** (im Plan noch offen) ist eine zufällige Zeichenkette
  (`uuid4`), vom Backend erzeugt.
- **Keine Favoriten verlieren:** Ist `favorites.json` kaputt, gibt es einen
  Fehler, statt die Datei als leer zu behandeln. Sonst hätte das nächste
  Speichern alle alten Favoriten überschrieben. Beim Übersetzungs-Wörterbuch
  ist „kaputt = leer“ harmlos, bei Favoriten nicht.
- **Englische Titel:** Wird ein Rezept gespeichert, während die Übersetzung
  ausfällt, zeigt die Liste später trotzdem den deutschen Titel, sobald es
  übersetzt im Cache liegt.

Claude hat außerdem vorgeschlagen, die Planänderungen vorab in einem eigenen
Commit auf `main` festzuhalten.

> **Dein Part:** Du hast die Spec freigegeben, indem du `/implement`
> gestartet hast.

## 3. Gebaut

Claude hat die vier Schritte auf dem Branch `feature/favorites` umgesetzt.
Das Backend wurde mit einem Skript und dem FastAPI-Testclient gegen eine
Testdatei geprüft, nicht gegen deine echten Daten. Das Frontend wurde mit
Lint und Build geprüft. Zwei Dinge hat Claude unterwegs korrigiert: einen
Fall, in dem die Liste dauerhaft auf „wird geladen“ hängen geblieben wäre,
und eine Lint-Warnung beim ersten Laden der Liste.

Ohne Router-Bibliothek: Die App hat nur zwei Ansichten, ein einfacher Schalter
reicht. Die Suche wird beim Wechsel zu den Favoriten nur ausgeblendet, damit
deine Zutaten und Ergebnisse erhalten bleiben.

## 4. Durch den Code geführt

> **Dein Part:** Du wolltest Schritt für Schritt am Code sehen, was gemacht
> wurde und warum.

Claude hat die vier Schritte mit Dateien und Zeilen erklärt. Der
kniffligste Teil war die Frage „Ist dieses KI-Rezept schon gespeichert?“.
KI-Rezepte haben keine eigene ID, deshalb merkt sich die App, welches
Rezept-Objekt zu welchem Favoriten gehört.

## 5. Abgeschlossen, mit unabhängigem Review

Bei `/complete` fielen zwei Punkte auf. Erstens lagen die Planänderungen
immer noch im Arbeitsstand. Zweitens zählt `/complete` gespeicherte
Nutzerdaten und Löschen zu den heiklen Fällen. Damit wäre ein unabhängiges
Review fällig, obwohl Claude das Feature vorher als nicht heikel eingestuft
hatte.

> **Dein Part:** Du hast entschieden, die Planänderungen im Feature-Commit
> mitzunehmen, und hast das unabhängige Review gewählt. Den dafür nötigen
> Zwischen-Commit hast du freigegeben.

Ein frischer Subagent ohne diesen Chatverlauf hat den Code geprüft und das
Review **bestanden**. Er fand zwei kleine Punkte (P3, nicht blockierend):

- **F-04:** Das Backend begrenzt beim Speichern nicht die Länge der Texte.
  Das Risiko ist gering, weil nur dein eigenes Frontend dort speichert.
- **F-05:** Im Dev-Modus springt der Fokus beim Laden der Seite
  vermutlich auf den „Favoriten“-Knopf. Das ist abgeleitet, nicht im Browser
  gesehen.

> **Dein Part:** Du hast Commit und lokalen Squash-Merge nach `main`
> freigegeben.

## Was noch offen ist

- **Nicht gepusht:** `main` ist lokal einen Commit vor `origin/main`.
- **Nicht im Browser getestet:** Favoritenliste und Speichern-Knopf sind nur
  durch Lint und Build abgesichert. Die Schritte zum Ausprobieren stehen im
  Archiv unter „Try it now“.
- **Offene P3-Findings:** F-01 bis F-05 (nicht blockierend). F-05 lässt sich
  beim Ausprobieren gleich mit prüfen.

**Nächstes Feature:** 6. UI-Feinschliff (einheitliches Layout, Lade-, Leer-
und Fehlerzustände, Tastaturbedienung in allen Ansichten).
