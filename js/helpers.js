/* ===========================================================
   helpers.js — Utilities, Konstanten, Rechtsgrundlagen
   Quelle: KBGG §§ 2, 24, 24a, 24b (Stand 2026)
   =========================================================== */

// ---------- Rechtskonstanten (KBGG idF 2026) ----------
const KBG_LAW = {
  WOCHENGELD_DAYS: 56, // 8 Wochen nach Geburt
  MAX_TOTAL_DAYS: 426, // § 24b Abs. 2 (max ab Geburt bei Aufteilung)
  SINGLE_PARENT_DAYS: 365, // § 24b Abs. 1
  UNUEBERTRAGBAR_DAYS: 61, // § 24b Abs. 2 letzter Satz
  MIN_BLOCK_DAYS: 61, // § 24b Abs. 4
  MAX_SWITCHES: 2, // § 24b Abs. 2
  MAX_OVERLAP_DAYS: 31, // § 24b Abs. 3
  EAKBG_MAX_DAILY: 80.12, // § 24a Abs. 2 + Anpassungsfaktor 2026
  EAKBG_MIN_DAILY: 35.85, // praktischer Mindestwert (Selbstständigen-Formel)
  EAKBG_PERCENT: 0.8, // § 24a Abs. 1: 80 % des (fiktiven) Wochengelds
  WOCHENGELD_FACTOR: 1.17, // Sonderzahlungsfaktor (13./14. Gehalt)
  // Netto-Äquivalent der ASVG-Höchstbeitragsgrundlage 2026 (~6.450 € brutto → ~4.500 € netto).
  // De-facto wird der Cap aber meist durch den eaKBG-Höchstbetrag (80,12 €/Tag) erreicht.
  MAX_NETTO_SV: 4500,
  ZUVERDIENST_LIMIT: 8600, // § 24 Abs. 1 Z 3 (absoluter Grenzbetrag eaKBG)
  // Pauschales KBG (KBG-Konto) — §§ 3–6a KBGG
  PAUSCHAL_MIN_DAYS_SPLIT: 456, // bei Aufteilung min. 456 Tage → hoher Tagsatz
  PAUSCHAL_MAX_DAYS_SPLIT: 1063, // bei Aufteilung max. 1063 Tage → niedriger Tagsatz
  PAUSCHAL_MIN_DAYS_SINGLE: 365,
  PAUSCHAL_MAX_DAYS_SINGLE: 851,
  PAUSCHAL_TOTAL_BUDGET_SPLIT: 16449.5, // ~ 15,46 € × 1063 Tage Gesamttopf 2026 (gerundet)
  PAUSCHAL_TOTAL_BUDGET_SINGLE: 12366, // ~ 14,53 € × 851 Tage
  PAUSCHAL_ZUVERDIENST_LIMIT: 18000, // § 8 Abs. 1 KBGG (oder 60 % d. Einkommens — hier Pauschalwert)
  EKP_PENALTY: 1300, // § 24a Abs. 4 (pro Elternteil bei fehlenden Untersuchungen)
  PARTNERBONUS_TOTAL: 1000, // § 5 Abs. 5 (500 € × 2)
  PARTNERBONUS_MIN_DAYS: 124, // Mindestens 124 Tage je Elternteil
  PARTNERBONUS_MIN_RATIO: 0.4, // 40:60 Verhältnis
};

// ---------- Formatierung ----------
const formatEur = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const formatEurCents = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
});

// ---------- Datum ----------
// Alle Datumswerte werden auf 12:00 Uhr Ortszeit normalisiert,
// damit DST-Umstellungen (Ende Oktober / Ende März) keine Off-by-one-
// Fehler in der Tagesschleife verursachen.
function normalizeDate(date) {
  const r = new Date(date);
  r.setHours(12, 0, 0, 0);
  return r;
}
function addDays(date, days) {
  const r = normalizeDate(date);
  r.setDate(r.getDate() + days);
  r.setHours(12, 0, 0, 0); // erneut absichern (DST-Wechsel)
  return r;
}
function dayDiff(d1, d2) {
  return Math.round(
    (normalizeDate(d2) - normalizeDate(d1)) / (1000 * 60 * 60 * 24),
  );
}
function formatDateStr(date) {
  return date.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function getYearMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function getMonthName(yearMonthStr) {
  const [year, month] = yearMonthStr.split("-");
  return new Date(year, month - 1, 1).toLocaleDateString("de-AT", {
    month: "long",
    year: "numeric",
  });
}
function isoDate(date) {
  // YYYY-MM-DD für <input type="date">
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- Finanz-Engine ----------
/**
 * Wochengeld pro Tag (vereinfacht).
 * Formel ÖGK: Ø-Netto der letzten 3 Monate × 1,17 (Sonderzahlungen) / 30.
 * Deckelung: ASVG-Höchstbeitragsgrundlage.
 */
function calcWochengeldDaily(monthlyNet) {
  const capped = Math.min(monthlyNet, KBG_LAW.MAX_NETTO_SV);
  return (capped / 30) * KBG_LAW.WOCHENGELD_FACTOR;
}

/**
 * eaKBG-Tagsatz: 80 % des (fiktiven) Wochengelds, gedeckelt 80,12 €.
 * § 24a Abs. 1 Z 1–4 KBGG.
 */
function calcEaKbgDaily(monthlyNet) {
  const wgDaily = calcWochengeldDaily(monthlyNet);
  return Math.min(KBG_LAW.EAKBG_MAX_DAILY, wgDaily * KBG_LAW.EAKBG_PERCENT);
}

/**
 * Pauschales KBG (KBG-Konto) Tagsatz.
 * Gesamttopf / gewählte Tage = Tagsatz. Beispiel:
 *   456 Tage → ~36,07 €/Tag (höchster Tagsatz bei Aufteilung)
 *  1063 Tage → ~15,46 €/Tag (niedrigster Tagsatz)
 */
function calcPauschalDaily(totalDays, isSplit = true) {
  const budget = isSplit
    ? KBG_LAW.PAUSCHAL_TOTAL_BUDGET_SPLIT
    : KBG_LAW.PAUSCHAL_TOTAL_BUDGET_SINGLE;
  return budget / totalDays;
}
