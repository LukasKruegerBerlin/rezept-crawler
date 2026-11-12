# Rückblick: Planung von Feature 9 „Sortier-Modus und Rezeptanzahl“

**Datum:** 2026-11-12
**Ergebnis:** Pläne und Projektübersicht angepasst. Es wurde noch kein Code
geschrieben, und es gibt noch keine Spec.
**Archiv:** keins, weil noch kein `/complete` gelaufen ist

## 1. Ausgangslage geprüft

Mit `/overview` haben wir nachgesehen, ob die Projektübersicht noch zu deinen
Plänen passt. Sie war aktuell, alle MVP-Features 1–8 sind fertig. Claude hat
drei Lücken genannt:

- Im Projektplan standen noch zwei Fragen als offen, die längst entschieden
  waren: die Form der Favoriten-ID und ob Suchergebnisse gecacht werden.
- Die „Later“-Punkte im Build-Plan haben keine Nummer, `/feature` kann sie so
  nicht aufnehmen.
- Die Suchrelevanz stand gleichzeitig unter „Later“ und unter den Nicht-Zielen.

> **Dein Part:** Du wolltest die Lücken schließen und die Suchrelevanz zum
> nächsten Feature machen, aber vorher genau besprechen, was damit gemeint ist.

Claude hat im Code nachgesehen: Die Favoriten-ID ist eine zufällige `uuid4`,
und einen Cache für Suchergebnisse gibt es nicht. Beides steht jetzt als
entschieden im Projektplan.

## 2. Was „Suchrelevanz“ bedeutet

Claude hat erklärt, dass heute beide Stufen der Suche Rezepte mit wenigen
Zutaten bevorzugen. Spoonacular liefert die Rezepte, denen am wenigsten fehlt,
und unsere eigene Sortierung macht dasselbe. Ein Rührei, das nur die Eier
braucht, landet so vor einer Frittata, die all deine Zutaten verwertet, aber
Milch braucht. Claude hat vorgeschlagen, fest auf „meiste Zutaten verwendet“
umzustellen.

> **Dein Part:** Du wolltest keine feste Regel, sondern einen **Schalter**.
> Wenn keine Zeit zum Einkaufen ist, soll nach den wenigsten fehlenden Zutaten
> sortiert werden, sonst nach den meisten verwendeten Zutaten.

Der Schalter steuert beide Stufen: welche Rezepte Spoonacular liefert und wie
wir sie sortieren. Die Schwelle für den KI-Hinweis bleibt in beiden Modi gleich.

## 3. Mehr als 20 Rezepte

> **Dein Part:** Du hast gefragt, ob man mehr als 20 Rezepte suchen kann, und
> wie groß das Tageskontingent bei Spoonacular ist.

Spoonacular erlaubt bis zu 100 Ergebnisse. Das Gratis-Kontingent liegt laut
den meisten Quellen bei 50 Punkten pro Tag (ältere Quellen nennen 150). Eine
Suche mit 20 Rezepten kostet grob 2–3 Punkte, mit 100 etwa 5–7. Teurer ist die
Übersetzung: Jedes neue Rezept bringt Titel und Zutaten mit, die Claude
übersetzen muss, das macht die Suche langsamer.

Claude hatte vorgeschlagen, mehr Rezepte zu holen, aber nur die besten 20 zu
übersetzen. Das hätte aber den Filter für fehlende Zutaten gestört, weil der im
Browser nur auf die gelieferten Rezepte wirkt.

> **Dein Part:** Du wolltest, dass man die Anzahl selbst wählen kann, und zwar
> nur **20, 50 oder 100**. Ohne Angabe gilt 20. Standard beim Schalter bleibt
> „wenigste fehlende Zutaten“.

So viele Rezepte, wie du wählst, werden geholt, sortiert, übersetzt und
angezeigt.

## 4. Pläne eingetragen

- **Build-Plan:** neuer Abschnitt „Next“ mit Feature 9; die Suchrelevanz ist
  aus „Later“ entfernt
- **Projektplan:** neues Feature, Ranking-Regel mit zwei Modi, Rezeptanzahl,
  Schalter und Auswahl in der Oberfläche; die Suchrelevanz steht nicht mehr
  unter den Nicht-Zielen; offene Fragen sind als entschieden markiert
- **Projektübersicht:** neu auf diesen Stand gebracht

> **Dein Part:** Du wolltest diesen Planungsschritt als Rückblick festhalten und
> zusammen mit den Plänen committen.

## Offen

- Deutsche Beschriftungen für Schalter und Auswahl (in der Spec)
- Wie Modus und Anzahl an die API übergeben werden (in der Spec)
- Ob das Tageskontingent 50 oder 150 Punkte beträgt, im Spoonacular-Konto
  prüfen
- Als Nächstes: `/feature` für **Feature 9: Sortier-Modus und Rezeptanzahl**
