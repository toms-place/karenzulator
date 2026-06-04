# Agent Instructions & Project Description

## Project Overview: Karenzulator
**Karenzulator** is an interactive calculator and optimizer built for the Austrian Kinderbetreuungsgeld (KBG). It supports both variants: the income-dependent childcare allowance (eaKBG) and the flat-rate KBG account (pKBG).

The app visualizes phases of maternity allowance (Wochengeld), childcare allowance (KBG), and unpaid parental leave (unbezahlte Karenz) on a timeline. 
Key legal constraints handled:
- Maximum duration (e.g., 426 days for eaKBG or 456-1063 days for pKBG).
- Minimum block duration of 61 days.
- Maximum of 2 switches between parents (3 blocks total).
- Overlap limit (up to 31 days).
- Partnership bonus (Partnerschaftsbonus) criteria.
- Income limits (Zuverdienstgrenze) and marginal employment rules (Geringfügigkeit).

The app includes an optimizer (`optimizer.js`) to recommend the best split based on total household income and state payouts.
**Tech Stack**: Vanilla HTML, CSS, and JavaScript. Uses Chart.js (via CDN). No build tools or bundlers are required.

## Resources for Online Research
When researching changes to the Austrian KBG and Karenz laws, use the following authoritative resources:
- **Arbeiterkammer (AK):** Detailed labor law summaries, Wochengeld calculation, and parental leave rights.
- **Österreichische Gesundheitskasse (ÖGK):** Specific parameters, payouts, and applications for eaKBG and pKBG.
- **Oesterreich.gv.at (USP / Bundesregierung):** General guidelines for Karenz, Papamonat, and KBG.
- **RIS (Rechtsinformationssystem des Bundes):** For exact legal paragraphs in the KBGG (Kinderbetreuungsgeldgesetz) and MSchG (Mutterschutzgesetz).
- **Bundeskanzleramt (BKA) - Sektion Familie:** Official brochures and edge-case definitions for the scheme.

## Testing and Validating Changes

### How to Run Locally
Start a static HTTP server to test the app in the browser:
`npx http-server -p 8080`
*(Then navigate to http://localhost:8080)*

### Validation Steps
When making changes, follow these validation steps:
1. **UI & Responsiveness:** Open the app and ensure mobile breakpoints function correctly. Check the console for any JavaScript or Chart.js rendering errors.
2. **Compliance Engine (`app.js` & `helpers.js`):** Verify that any new features correctly respect the minimum 61-day block, the allowed overlap windows (max 31 days), and the maximum claim duration boundaries.
3. **Financial Edge Cases:** Ensure Wochengeld rates, daily eaKBG limits (currently capped at 80.12 EUR/day), and partnership bonus amounts (currently 500 EUR per parent) are correct.
4. **Optimizer Logic:** After JS changes, run the optimizer in the UI and confirm the proposed optimal scenarios fall within valid legal parameters and visually map to the timeline without gaps.
