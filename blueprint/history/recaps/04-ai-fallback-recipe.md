# Rückblick: Feature 4 „KI-Ersatzrezept“

**Datum:** 2026-11-04
**Ergebnis:** `2eadb9c feat: AI fallback recipe` auf `main` (lokal, noch nicht gepusht)
**Archiv:** [04-ai-fallback-recipe.md](../features/04-ai-fallback-recipe.md)

## 1. Projektübersicht geprüft und Zwischenstand

Mit `/overview` hat Claude geprüft, ob die Projektübersicht noch zu den Plänen
passt. Sie passte, es musste nichts neu erzeugt werden. Claude hat aber einige
Lücken gemeldet, zum Beispiel, dass der Plan bei der Sortierung
`min-missing-ingredients` nennt, während unter „Später“ steht, dass
`max-used-ingredients` besser getestet wurde.

> **Dein Part:** Du wolltest eine Zusammenfassung von allem, was bisher gebaut
> wurde. Claude hat die vier fertigen Features (Zutatensuche, Rezeptdetail,
> Vorschläge beim Tippen, Kochzeit-Filter) und die offenen Punkte aufgelistet.

## 2. Erster Plan: KI-Rezept automatisch

Claude hat einen ersten Plan geschrieben, der dem Projektplan folgte: Liefert
die Suche zu wenig Gutes (weniger als 3 Rezepte mit höchstens 2 fehlenden
Zutaten) oder fällt Spoonacular aus, erzeugt Claude automatisch ein deutsches
Rezept mit dem stärkeren Modell Sonnet.

## 3. Deine Änderung: erst fragen

> **Dein Part:** Du wolltest, dass die App **vorher fragt**, statt das Rezept
> einfach zu erzeugen. Bei zu wenig Treffern soll eine Meldung erscheinen, die
> sagt, wie viele Gerichte gefunden wurden. Du willst die Rezepte erst normal
> anschauen und das KI-Rezept auch **nachträglich** noch anfordern können.
> Außerdem hast du einen **Filter für die Zahl fehlender Zutaten** gewünscht
> und Claude gebeten, vorzuschlagen, was in dieses Feature gehört und was ein
> eigenes wird.

Claude hat vorgeschlagen: Rückfrage, Meldung mit Trefferzahl und nachträgliches
Erstellen gehören zusammen in Feature 4, weil sie genau beschreiben, *wann* das
KI-Rezept entsteht. Der Filter für fehlende Zutaten ist ein eigenes Thema (ein
Suchfilter wie die Kochzeit) und wird Feature 8.

> **Dein Part:** Du hast entschieden, dass auch bei einem Spoonacular-Ausfall
> **immer erst gefragt** wird. Den Button soll es auch bei guten Treffern
> geben. Du hast gefragt, ob eine Meldung oder nur ein ständiger Button
> benutzerfreundlicher ist.

Claudes Antwort: beides an einer Stelle. Nach jeder Suche gibt es einen Button,
bei schwachen Treffern sitzt er in einem gelben Kasten mit der Trefferzahl, die
erklärt, *warum* sich ein KI-Rezept lohnen könnte.

Claude hat daraufhin Projektplan und Bauplan angepasst (Feature 4 neu
beschrieben, Feature 8 eingefügt), die Übersicht neu erzeugt und den Plan für
Feature 4 neu geschrieben. Das KI-Rezept bekommt jetzt einen eigenen Aufruf,
der erst durch deinen Klick startet. Die Suche wird dadurch nicht langsamer und
verbraucht kein Pro-Kontingent für Rezepte, die du gar nicht willst.

> **Dein Part:** Du hast den neuen Plan freigegeben und `/implement` gestartet.

## 4. Umsetzung in fünf Schritten

1. **Gemeinsamer Claude-Aufruf:** Der Code, der die `claude`-CLI startet und
   den API-Key aus der Umgebung entfernt, steht jetzt nur noch an einer Stelle.
   Übersetzung und KI-Rezept nutzen ihn beide.
2. **KI-Rezept-Generator:** Sonnet schreibt direkt auf Deutsch, nur mit deinen
   Zutaten plus Gewürzen und Grundzutaten, und hält ein gesetztes Zeitlimit
   ein. Das Ergebnis wird geprüft, bevor es angezeigt wird.
3. **Backend:** Die Suche meldet, ob die Treffer schwach sind und wie viele gut
   sind. Fällt Spoonacular aus, gibt es keinen Fehler mehr, sondern das Angebot.
4. **Hinweis über den Karten** mit Laden, Fehler und erneutem Versuch.
5. **KI-Karte** mit dem Label „KI-Vorschlag“, vorne im Raster, sofort im
   Rezeptfenster zu öffnen.

Claude hat das Backend live geprüft: Übersetzung über den neuen Aufruf, ein
echtes KI-Rezept („Zucchini-Feta-Omelett“, 20 Minuten bei Limit 30, nach etwa
8 Sekunden), starke und schwache Suche, Spoonacular-Ausfall und fehlende CLI.

## 5. Rundgang durch den Code

> **Dein Part:** Du wolltest jede Änderung ausführlich besprechen, Klasse für
> Klasse, und erst weitergehen, wenn du „weiter“ sagst.

Claude hat in sieben Etappen erklärt, was es gemacht hat und warum. Dabei sind
mehrere Schwachstellen aufgefallen, über die du jeweils entschieden hast:

> **Dein Part:** Beim KI-Generator hast du zwei Korrekturen umbauen lassen: Die
> Prüffunktion bekam einen eindeutigen Namen (es gab denselben Namen schon für
> Spoonacular-Rezepte), und ein `true` von Claude wird nicht mehr als
> „1 Minute“ angenommen.

> **Dein Part:** Beim Hinweis-Kasten hast du entschieden, dass die Zahl „2“
> (höchstens 2 fehlende Zutaten) vom Backend mitgeschickt wird statt fest im
> Text zu stehen. Das ist wichtig für Feature 8. Der doppelte Satz
> („Keine passenden Rezepte gefunden“ in Statuszeile **und** Kasten) ist
> entfernt.

> **Dein Part:** Eine Verbesserung nur für Screenreader hast du abgelehnt, weil
> die App nur für dich ist. Claude hat sich das gemerkt.

> **Dein Part:** Im Rezeptfenster hast du Vorschlag a gewählt: Beim KI-Rezept
> gibt es keinen leeren grauen Bildbereich mehr. Die Karte verspricht nicht mehr
> „nur mit deinen Zutaten“, sondern sagt ehrlicher „Aus deinen Zutaten,
> ergänzt um Gewürze und Grundzutaten“.

> **Dein Part:** Du wolltest die Fokus-Korrektur sofort: Nach dem Erstellen
> springt der Tastatur-Fokus auf die neue KI-Karte, statt verloren zu gehen.

## 6. Unabhängige Prüfung

Weil die Änderung den Code betrifft, der die CLI startet und den API-Key
entfernt, war eine unabhängige Prüfung Pflicht. Dafür brauchte es einen festen
Prüf-Commit.

> **Dein Part:** Du hast den Prüf-Commit freigegeben.

Ein frischer Prüf-Agent ohne den Gesprächsverlauf hat alle Änderungen geprüft:
**bestanden**, keine neuen Befunde. Er hat aber einige Restrisiken notiert
(siehe unten).

## 7. Abschluss

Claude hat das Feature archiviert und im Bauplan abgehakt. Die Übersicht blieb
unverändert, weil Häkchen beim Fingerabdruck nicht zählen.

> **Dein Part:** Du hast den Feature-Commit und danach den Squash-Merge in
> `main` freigegeben. Der Feature-Branch ist gelöscht.

## Was noch offen ist

- **Push:** `main` ist einen Commit vor `origin/main`, noch nicht gepusht.
- **Im Browser testen:** Hinweis, Laden, Fehler, KI-Karte, Fokus und
  Rezeptfenster wurden noch nicht im Browser ausprobiert. Siehe „Try it now“
  im Archiv.
- **Restrisiken aus der Prüfung:** Es gibt keine Tests. Eine neue Suche während
  der KI-Erstellung lässt den alten Sonnet-Aufruf trotzdem zu Ende laufen
  (kostet Kontingent). Bei einem Neustart des Dev-Servers wird ein laufender
  CLI-Prozess nicht beendet.
- **Weggefallen:** Den Hinweis „Tageskontingent aufgebraucht“ gibt es nicht
  mehr, ein Spoonacular-Ausfall heißt jetzt immer „Live-Rezepte sind gerade
  nicht verfügbar“.
- **Für Feature 8 merken:** Die Suche und der KI-Aufruf nutzen dieselbe
  Eingabe-Prüfung. Ein neues Filterfeld würde der KI-Aufruf automatisch
  annehmen und ignorieren. Das sollte die Spec bewusst entscheiden.
- **Alte Befunde:** F-01 bis F-03 (alle P3) sind weiterhin offen.
- **Nächstes Feature:** 8. Filter für fehlende Zutaten – nur Rezepte mit
  höchstens N fehlenden Zutaten anzeigen.
