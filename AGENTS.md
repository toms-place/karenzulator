# Pro-Planer: Österreich Karenz, KBG & Haushaltsbudget



## 1. Projektübersicht & Tech Stack

- **Projektname:** Pro-Planer: Österreich Karenz, KBG & Haushaltsbudget
- **Architektur:** Client-side rendered Single-Page Application (SPA).
- **Tech Stack:** HTML5, CSS3 (CSS Variables, Flexbox/Grid), JavaScript (Vanilla ES6+).
- **Externe Abhängigkeiten:** `Chart.js` (über CDN) für das Balkendiagramm.
- **Paradigma:** Reaktiv. Jede Änderung an einem Input triggert einen globalen Recalculate- und Re-Render-Zyklus.

---

## 2. Empfohlene Dateistruktur (IDE Setup)

Ein Agent sollte das Projekt idealerweise in drei Kern-Dateien unterteilen, um sauberen Code zu gewährleisten:

- `index.html` (DOM-Skelett)
- `css/styles.css` (Styling & Design System)
- `js/app.js` (Core Logic & Rendering)
- `js/helpers.js` (Optionale Auslagerung von Datums- und Formatierungsfunktionen)

---

## 3. Modul 1: Das HTML DOM-Skelett (`index.html`)

Das Layout basiert auf einem asymmetrischen CSS Grid (Links: Controls, Rechts: Visuals).

### 3.1 Sidebar (Inputs / Controls)

Die Input-Elemente müssen mit eindeutigen IDs versehen werden, um sie in JS abzugreifen. Sie sind in 4 logische Sektionen unterteilt:

- **Sektion 1: Zeit & Wechsel:**
- `#birthDate` (Geburtstag, Start des 2-Jahres-Plans).
- `#switchDate` (Datum des ersten Wechsels).
- `#useOverlap` (Checkbox) & `#overlapControls` (Tage, Finanzierungsart: _Beide, Mutter, Vater_).
- `#useSwitch2` (Checkbox) & `#switchDate2` (Datum zweiter Wechsel).

- **Sektion 2: Einkommen:**
- `#incomeMutter`, `#incomeVater` (Netto monatlich).

- **Sektion 3: Zuverdienst:**
- `#gfMutter`, `#gfVater` (Geringfügigkeit).

- **Sektion 4: Unbezahlte Karenz (Extended Leave):**
- `#extendedWho`, `#extendedEndDate` (Wer bleibt wie lange?).
- `#useExtSwitch`, `#extendedWho2`, `#extendedEndDate2` (Wechsel in der unbezahlten Zeit).

### 3.2 Main Content (Outputs / Dashboards)

- **Warnungs-Container:** Hidden by default. IDs: `#blockAlertBox` (61-Tage-Regel), `#switchAlertBox` (Max 2 Wechsel).
- **KPI Dashboards (Cards):** Elemente für Gesamtgeld, Haushaltsbudget, Tage Mutter/Vater, Ratio (M:V) und Partnerschaftsbonus-Status.
- **Rechenweg-Container:** `#calcDetailsText` zur Ausgabe der ASVG-Deckelungen.
- **Chart Container:** `<canvas id="incomeChart"></canvas>` innerhalb eines fixen `div.chart-container` (Höhe 300px), um Layout-Bugs von Chart.js zu vermeiden.
- **Chronologie:** `#timelineBar` (visuelle Balken) und `#textTimeline` (Textausgabe).
- **Kalender:** `#calendarView` (Grid für die Monats-Karten).

---

## 4. Modul 2: CSS & Design System (`styles.css`)

### 4.1 CSS Variablen (Single Source of Truth für Farben)

Das gesamte Farbsystem muss über `:root` gesteuert werden, damit Diagramme, Legenden, Kalender-Badges und die Timeline perfekt synchronisiert sind.

- `--wochengeld-color`: `#e63946` (Rot)
- `--mutter-kbg-color`: `#457b9d` (Hellblau)
- `--vater-kbg-color`: `#2a9d8f` (Grün)
- `--mutter-kbg-2-color`: `#1d3557` (Dunkelblau)
- `--ext-m-color`: `#f4a261` (Orange)
- `--ext-v-color`: `#e9c46a` (Gelb)
- `--arbeiten-color`: `#e9ecef` (Grau)

### 4.2 Layout & Komponenten

- **Grid:** `.grid { display: grid; grid-template-columns: 380px 1fr; gap: 30px; }` mit einem Fallback für Mobile (`@media max-width: 1000px`).
- **Cards:** Flexbox, abgerundete Ecken, Box-Shadow, linker Border-Highlight (`border-left: 5px solid`).
- **Kalender-Boxen:** Flexbox mit `flex-direction: column` und `justify-content: space-between` für einen sauberen Footer-Abschluss (Geldsummen).

---

## 5. Modul 3: JavaScript Core Logic (`app.js`)

Die Logik wird in einer einzigen Main-Funktion (`calculateTimeline()`) orchestriert, die bei jedem Event feuert.

### Schritt 1: Initialization & Event Binding

- Sammle alle Input-IDs in einem Array.
- Binde einen `addEventListener('input')` oder `'change'` an jedes Feld, der `calculateTimeline()` triggert.
- Erstelle DOM-Toggles (Ein-/Ausblenden von `#overlapControls`, `#extendedControls` je nach Checkbox-Status).

### Schritt 2: Block Generation (Die Zeitmaschine)

Dies ist der wichtigste algorithmische Teil. Der Agent muss ein Array aus Objekten (Blocks) bauen:

1. **Block 0:** Wochengeld (Tag 0 bis Tag 55).
2. **Block 1:** KBG Mutter (Tag 56 bis `switchDate1 - 1`).
3. **Overlap Block (Optional):** Startet am `switchDate1`. Dauer: `overlapDays`.
4. **Block 2:** KBG Vater (Startet nach Overlap bis `switchDate2` oder `maxKbgEnd`).
5. **Block 3 (Optional):** KBG Mutter 2 (Startet ab `switchDate2`).
6. **Extended Blocks (Optional):** Starten am Tag nach dem letzten KBG-Tag. Enden an den definierten Daten.

_Wichtig:_ Die maximale KBG-Dauer beträgt 425 Tage ab dem Tag nach dem Wochengeld (insgesamt 426 ab Geburt). Wenn `overlapFinancing === 'beide'`, zieht der Agent die `overlapDays` von diesem absoluten Maximum ab!

### Schritt 3: Financial Engine (Mathematik & Limits)

Der Agent muss die österreichischen Gesetze exakt abbilden:

- `MAX_NETTO_SV = 4500` (Deckelung für die ASVG-Beitragsgrundlage).
- `relevantNetM` = `Math.min(incM, MAX_NETTO_SV)`.
- **Wochengeld:** `(relevantNetM / 30) * 1.17`.
- **eaKBG:** 80% des fiktiven/echten Wochengelds, strikt gedeckelt durch `Math.min(80.12, berechneterWert)`.

### Schritt 4: The 2-Year Daily Loop

Der Agent erstellt eine `while`-Schleife, die exakt am Tag der Geburt startet und exakt am Vortag des 2. Geburtstags endet (`twoYearsLater`).

- **Tages-Evaluation:** Für jeden der 730 Tage wird geprüft: Welcher "Block" ist heute aktiv?
- **Tages-Verdienst:** Ermittlung des exakten Taggelds (`Wochengeld`, `KBG`, oder `Vollzeitgehalt = incM / TageImAktuellenMonat`).
- **Aggregation:** Summieren der Tageswerte in ein Monatsobjekt (identifiziert über `YYYY-MM`), Zählen der Tage pro Status für die Kalender-Badges.

### Schritt 5: Rules & Compliance Check

Nach dem Loop prüft das Skript rechtliche Fehler:

- Hat jeder KBG-Block (außer ein Block, der auf Tag 426 stößt) `>= 61 Tage`? -> Trigger Alert-Box.
- Sind es maximal 2 Wechsel (3 KBG-Phasen)? -> Trigger Alert-Box.
- Mindestens 124 Tage pro Elternteil & Ratio zwischen 40% und 60%? -> Partnerbonus-Status auf 1.000€ (JA) setzen.

### Schritt 6: Rendering (DOM Updates)

- **Text-Update:** Aktualisieren der `innerText` aller KPI-Karten (`formatEur.format(TotalMoney)`).
- **Timeline:** Rendern von `<div class="timeline-segment">` Elementen, deren `%`-Breite aus `(Tage / 730) * 100` berechnet wird.
- **Kalender:** Iterieren über das `monthsData` Objekt und Rendern von HTML-Cards für jeden Monat inkl. Footer-Summen.

### Schritt 7: Chart.js Rendering

- Extrahieren der Monatsnamen (`Object.keys`) und der Monatssummen Mutter/Vater (`Object.values`).
- Aufrufen der `Chart()` Instanz.
- _Sicherheitsmaßnahme für den Agenten:_ Vor Erstellung muss eine eventuell existierende Instanz mit `if (chartInstance) chartInstance.destroy();` zerstört werden, um Memory-Leaks und Glitches zu vermeiden. Konfiguration als "Stacked Bar Chart" (Balken übereinander).
