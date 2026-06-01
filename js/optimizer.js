/* ===========================================================
   optimizer.js — findet die bestmögliche Aufteilung
   ===========================================================
   Strategie:
   1) Erzeuge Kandidaten-Konfigurationen (switchDate1, ggf. switchDate2,
      ohne Überschneidung — Überschneidung kürzt die Anspruchsdauer
      und ist daher außer in Spezialfällen nie optimal).
   2) Simuliere jeden Kandidaten via calculateScenario().
   3) Sortiere nach Zielfunktion und gib Top-3 aus.
   =========================================================== */

function* candidateGenerator(base) {
  // Window: birth+56 … birth + variantMaxDays-1
  const variantMaxDays =
    base.variant === "pauschal" ? base.pauschalDays : KBG_LAW.MAX_TOTAL_DAYS;
  const earliest = addDays(base.birthDate, KBG_LAW.WOCHENGELD_DAYS);
  const latest = addDays(base.birthDate, variantMaxDays - 1);
  const stepDays = 7;

  // Min-Block 61 Tage je Phase
  const minBlock = KBG_LAW.MIN_BLOCK_DAYS;

  // Variante A: nur 1 Wechsel (Mutter → Vater)
  for (
    let d = minBlock;
    d <= dayDiff(earliest, latest) + 1 - minBlock;
    d += stepDays
  ) {
    const switch1 = addDays(earliest, d);
    yield {
      ...base,
      switchDate1: switch1,
      useOverlap: false,
      useSwitch2: false,
      extendedWho: "Niemand",
      useExtSwitch: false,
    };
  }

  // Variante B: kein Wechsel — Mutter bezieht alles
  yield {
    ...base,
    switchDate1: addDays(latest, 1), // nie erreicht → Mutter bezieht durchgehend
    useOverlap: false,
    useSwitch2: false,
    extendedWho: "Niemand",
    useExtSwitch: false,
  };

  // Variante C: 2 Wechsel (Mutter → Vater → Mutter)
  const totalRange = dayDiff(earliest, latest) + 1;
  for (let d1 = minBlock; d1 <= totalRange - 2 * minBlock; d1 += stepDays) {
    for (let d2 = d1 + minBlock; d2 <= totalRange - minBlock; d2 += stepDays) {
      yield {
        ...base,
        switchDate1: addDays(earliest, d1),
        switchDate2: addDays(earliest, d2),
        useOverlap: false,
        useSwitch2: true,
        extendedWho: "Niemand",
        useExtSwitch: false,
      };
    }
  }
}

function objectiveValue(scenario, goal) {
  const { stateMoney, householdMoney, comp } = scenario;
  if (comp.blockRuleViolated || comp.switchRuleViolated) return -Infinity;

  if (goal === "state") return stateMoney;
  if (goal === "household") return householdMoney;
  if (goal === "bonus") {
    // Pflicht: Bonus muss greifen. Sonst harte Strafe.
    return comp.bonusEligible ? householdMoney : householdMoney - 1e9;
  }
  return householdMoney;
}

function describeScenario(s) {
  const kbgBlocks = s.blocks.filter((b) => b.type === "kbg");
  const phases = kbgBlocks
    .map((b) => {
      const days = dayDiff(b.start, b.end) + 1;
      return `${b.who} ${days}T (${formatDateStr(b.start)}–${formatDateStr(b.end)})`;
    })
    .join(" → ");
  return phases || "Keine KBG-Phasen";
}

function runOptimizer() {
  const btn = document.getElementById("optimizeBtn");
  const out = document.getElementById("optimizerResult");
  const goal = document.getElementById("optGoal").value;
  btn.disabled = true;
  btn.innerText = "⏳ Berechne…";
  out.classList.remove("active");

  // Asynchron laufen lassen, damit UI nicht blockiert
  setTimeout(() => {
    const base = readInputs();
    const results = [];
    let count = 0;

    for (const cand of candidateGenerator(base)) {
      const r = calculateScenario(cand);
      r.score = objectiveValue(r, goal);
      results.push(r);
      count++;
    }

    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 3);
    const best = top[0];

    // Beste Konfiguration in die Form übernehmen
    applyScenarioToForm(best.p);
    calculateTimeline();

    // Ergebnis anzeigen
    let html = `<h4>✓ Optimum gefunden (${count} Szenarien geprüft)</h4>`;
    top.forEach((r, i) => {
      const unusedHint =
        r.comp.unusedDays > 30
          ? ` · <span style="color:#b76e00;">⚠️ ${r.comp.unusedDays} ungenutzte KBG-Tage</span>`
          : "";
      html += `<div style="margin-bottom:8px;padding:6px;border-radius:4px;background:${i === 0 ? "#e8f5e9" : "#f8f9fa"};">
                <b>${i === 0 ? "★ Beste" : i + 1 + "."} Aufteilung</b><br>
                ${describeScenario(r)}<br>
                Haushalt: <b>${formatEur.format(r.householdMoney)}</b> ·
                Staat: ${formatEur.format(r.stateMoney)} ·
                Bonus: ${r.comp.bonusEligible ? "✓" : "✗"} ·
                Verhältnis: ${Math.round(r.comp.mRatio * 100)}:${Math.round(r.comp.vRatio * 100)}${unusedHint}
            </div>`;
    });
    out.innerHTML = html;
    out.classList.add("active");
    btn.disabled = false;
    btn.innerText = "⚡ Bestmögliche Aufteilung berechnen";
  }, 30);
}

function applyScenarioToForm(p) {
  document.getElementById("switchDate").value = isoDate(p.switchDate1);
  document.getElementById("useSwitch2").checked = p.useSwitch2;
  document.getElementById("switchDate2").style.display = p.useSwitch2
    ? "block"
    : "none";
  if (p.useSwitch2) {
    document.getElementById("switchDate2").value = isoDate(p.switchDate2);
  }
  document.getElementById("useOverlap").checked = false;
  document.getElementById("overlapControls").style.display = "none";
  document.getElementById("extendedWho").value = "Niemand";
  document.getElementById("extendedControls").style.display = "none";
  document.getElementById("useExtSwitch").checked = false;
  document.getElementById("extSwitchControls").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("optimizeBtn")
    .addEventListener("click", runOptimizer);
});
