# Rückblick: Planung von Feature 7 „Zutaten-Autovervollständigung“

**Datum:** 2026-10-23
**Ergebnis:** Pläne angepasst, noch nicht committet. Es wurde noch kein Code
geschrieben und es gibt noch keine Spec.
**Archiv:** keins, weil noch kein `/complete` gelaufen ist

## 1. Ausgangslage geprüft

Mit `/overview` haben wir nachgesehen, ob die Projektübersicht noch zu deinen
Plänen passt. Sie war aktuell, es musste nichts neu erzeugt werden. Claude hat
ein paar Stellen genannt, an denen der Projektplan veraltet ist. Dort stehen
zum Beispiel noch Fragen als offen, die in Feature 1 und 2 schon entschieden
wurden: wie viele Suchergebnisse abgerufen werden, welches Claude-Modell
übersetzt und dass die Detailansicht ein Fenster ist.

## 2. Die Idee für ein neues Feature

> **Dein Part:** Du wolltest, dass bei der Zutateneingabe Zutaten vorgeschlagen
> werden, die schon einmal vom Deutschen ins Englische übersetzt wurden.

Claude hat dazu angemerkt, dass diese Daten schon vorhanden sind: Jede
übersetzte Zutat steht im Übersetzungs-Wörterbuch, das in Feature 2 entstanden
ist. Außerdem hat Claude drei Fragen für die Spec gestellt: Wann erscheinen
Vorschläge, wie funktioniert die Bedienung mit der Tastatur und wie viele
Vorschläge gibt es.

> **Dein Part:** Du hast alle drei Fragen beantwortet:
>
> 1. Ein Vorschlag erscheint nur, wenn das Wort mit der Eingabe **beginnt**.
> 2. Mit Pfeiltasten und Enter wählt man im Menü aus. Wer keine Pfeiltaste
>    drückt, bekommt mit Enter wie bisher genau das Getippte als Zutat.
> 3. Höchstens **5 Vorschläge**, damit es übersichtlich bleibt.

## 3. Das Feature in den Plan aufgenommen

Mit `/feature` hat Claude festgestellt, dass das Feature noch nicht im Plan
steht. Neue Features werden nicht einfach eingeschoben, deshalb hat Claude
zuerst gefragt, wo es hin soll.

> **Dein Part:** Du hast entschieden, dass es **als Nächstes** gebaut wird, also
> noch vor dem Kochzeit-Filter.

Das Feature hat die freie Nummer 7 bekommen. Die bestehenden Nummern bleiben,
damit die Verweise auf frühere Features stimmen. Claude hat diese Änderungen
vorgeschlagen:

- **Build-Plan:** neuer Punkt 7 zwischen Feature 2 und Feature 3
- **Projektplan:** die Autovervollständigung als neues Feature und ein Satz, dass
  das Wörterbuch jetzt auch die Vorschläge liefert

Neue gespeicherte Daten kommen dadurch nicht dazu.

> **Dein Part:** Du hast den Änderungen zugestimmt, und Claude hat sie
> eingetragen.

## 4. Wo es gerade steht

Bevor die Spec geschrieben werden kann, muss die Projektübersicht neu erzeugt
werden. Die Befehle `/overview` und `/feature` kann Claude nicht selbst starten,
die musst du eingeben.

> **Dein Part:** Du wolltest an dieser Stelle einen Rückblick wie nach einem
> `/complete`, damit dieser Planungsschritt festgehalten ist.

## Offen

- `/overview` ausführen, damit die Projektübersicht Feature 7 enthält
- Danach `/feature 7`, damit Claude die Spec für die Autovervollständigung
  schreibt
- Die Änderungen an `build-plan.md`, `project-plan.md` und dieser Rückblick sind
  noch nicht committet
- Veraltete offene Fragen im Projektplan bei Gelegenheit aufräumen (siehe
  Abschnitt 1)
- Als Nächstes im Plan: **Feature 7: Zutaten-Autovervollständigung**, danach
  Feature 3: Kochzeit-Filter
