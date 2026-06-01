# Karenzulator

Interaktiver Rechner und Optimizer für das österreichische **Kinderbetreuungsgeld (KBG)**
nach KBGG §§ 24, 24a, 24b — unterstützt sowohl das **einkommensabhängige KBG (eaKBG)**
als auch das **pauschale KBG-Konto (pKBG)**.

## Features

- **Wochengeld-, KBG- und unbezahlte-Karenz-Phasen** in einer Timeline visualisiert
- **Beide Varianten**: eaKBG (max. 426 Tage, 80,12 €/Tag, 8 600 € Zuverdienstgrenze)
  und pKBG-Konto (456–1063 Tage)
- **Compliance-Checks**: Mindestblockdauer (61 Tage), max. 2 Wechsel,
  chronologische Reihenfolge, Partnerschaftsbonus, ungenutzte Tage
- **Geringfügigkeit** während unbezahlter Karenz korrekt berücksichtigt
- **Optimizer**: findet die bestmögliche Aufteilung (Haushaltseinkommen, Staatsleistung
  oder Bonus-Pflicht) — prüft ein- und zweifache Wechsel sowie „kein Wechsel"
  (Mutter oder Vater bezieht alles), optional kombiniert mit unbezahlter Karenz
  bis zu einem Zieldatum
- **Mobile-responsive**, keine Build-Toolchain — pure HTML/CSS/JS + Chart.js via CDN

## Nutzung

Lokal einfach `index.html` im Browser öffnen oder einen statischen Server starten:

```sh
npx http-server -p 8080
```

## Struktur

```
index.html        DOM-Skeleton (Sidebar + Dashboard)
css/styles.css    Styling inkl. Mobile-Breakpoints
js/helpers.js     Konstanten (KBGG-Werte) & Datums-/Geld-Utilities
js/app.js         readInputs → buildBlocks → simulate → evaluateCompliance
js/optimizer.js   Kandidaten-Generator + Top-3-Auswertung
```

## Disclaimer

Inoffizielles Tool zur groben Planungsunterstützung. Keine Rechtsberatung —
maßgeblich sind das **KBGG** in der jeweils geltenden Fassung sowie die Auskunft
der zuständigen Krankenkasse / des AMS.
