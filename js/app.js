/* ===========================================================
   app.js — Berechnungs-Engine + DOM-Rendering
   =========================================================== */

let incomeChartInstance = null;

// ----------------------------------------------------------
// 1) Inputs aus DOM lesen
// ----------------------------------------------------------
function readInputs() {
  return {
    birthDate: normalizeDate(
      new Date(document.getElementById("birthDate").value),
    ),
    switchDate1: normalizeDate(
      new Date(document.getElementById("switchDate").value),
    ),
    useOverlap: document.getElementById("useOverlap").checked,
    overlapDays: Math.min(
      KBG_LAW.MAX_OVERLAP_DAYS,
      Math.max(1, parseInt(document.getElementById("overlapDays").value) || 0),
    ),
    overlapFin: document.getElementById("overlapFinancing").value,
    useSwitch2: document.getElementById("useSwitch2").checked,
    switchDate2: normalizeDate(
      new Date(document.getElementById("switchDate2").value),
    ),
    extendedWho: document.getElementById("extendedWho").value,
    extendedEndDate: normalizeDate(
      new Date(document.getElementById("extendedEndDate").value),
    ),
    useExtSwitch: document.getElementById("useExtSwitch").checked,
    extendedWho2: document.getElementById("extendedWho2").value,
    extendedEndDate2: normalizeDate(
      new Date(document.getElementById("extendedEndDate2").value),
    ),
    incM: parseFloat(document.getElementById("incomeMutter").value) || 0,
    incV: parseFloat(document.getElementById("incomeVater").value) || 0,
    gfM: parseFloat(document.getElementById("gfMutter").value) || 0,
    gfV: parseFloat(document.getElementById("gfVater").value) || 0,
    ekpDone: document.getElementById("ekpDone").checked,
    birthType: document.getElementById("birthType").value, // 'standard' | 'extended'
    wochengeldDays:
      document.getElementById("birthType").value === "extended"
        ? KBG_LAW.WOCHENGELD_DAYS_EXTENDED
        : KBG_LAW.WOCHENGELD_DAYS,
    variant: document.getElementById("kbgVariant").value, // 'ea' | 'pauschal'
    pauschalDays: Math.max(
      KBG_LAW.PAUSCHAL_MIN_DAYS_SPLIT,
      Math.min(
        KBG_LAW.PAUSCHAL_MAX_DAYS_SPLIT,
        parseInt(document.getElementById("pauschalDays").value) || 730,
      ),
    ),
  };
}

// ----------------------------------------------------------
// 2) Block-Generator (Zeitstrahl der KBG-Phasen)
// ----------------------------------------------------------
function buildBlocks(p) {
  const blocks = [];
  const wgStart = new Date(p.birthDate);
  const wgDays = p.wochengeldDays || KBG_LAW.WOCHENGELD_DAYS;
  const wgEnd = addDays(wgStart, wgDays - 1);
  const lbl = kbgLabel(p.variant);

  // Beim 1. Wechsel mit "beide" wird die Anspruchsdauer um overlapDays gekürzt
  const reducedDays =
    p.useOverlap && p.overlapFin === "beide" ? p.overlapDays : 0;

  // Maximale KBG-Anspruchsdauer hängt von der Variante ab.
  // eaKBG:    426 Tage ab Geburt (§ 24b Abs. 2)
  // Pauschal: vom User gewählt, max. 1063 Tage ab Geburt (§ 5 Abs. 2)
  const variantMaxDays =
    p.variant === "pauschal" ? p.pauschalDays : KBG_LAW.MAX_TOTAL_DAYS;
  const maxKbgEnd = addDays(p.birthDate, variantMaxDays - 1 - reducedDays);

  // Block 0: Wochengeld
  blocks.push({
    type: "wG",
    who: "Mutter",
    start: wgStart,
    end: wgEnd,
    label: "Wochengeld",
    class: "bg-wochengeld",
  });

  // Block 1: KBG Mutter (ab Tag 56)
  const b1Start = addDays(wgEnd, 1);
  let m1End = addDays(p.switchDate1, -1);
  if (m1End < b1Start) m1End = b1Start;
  if (m1End > maxKbgEnd) m1End = new Date(maxKbgEnd);
  blocks.push({
    type: "kbg",
    who: "Mutter",
    start: b1Start,
    end: m1End,
    label: lbl + " Mutter",
    class: "bg-mutter-kbg",
  });

  // Optional: Überschneidung
  let b2Start = new Date(p.switchDate1);
  if (b2Start < b1Start) b2Start = new Date(b1Start);
  if (p.useOverlap) {
    const oStart = new Date(b2Start);
    const oEnd = addDays(oStart, p.overlapDays - 1);
    blocks.push({
      type: "overlap",
      finance: p.overlapFin,
      start: oStart,
      end: oEnd,
      label: "Überschneidung",
    });
    b2Start = addDays(oEnd, 1);
  }

  // Block 2: KBG Vater
  let b2End = p.useSwitch2 ? addDays(p.switchDate2, -1) : new Date(maxKbgEnd);
  if (b2End > maxKbgEnd) b2End = new Date(maxKbgEnd);
  if (b2End >= b2Start) {
    blocks.push({
      type: "kbg",
      who: "Vater",
      start: b2Start,
      end: b2End,
      label: lbl + " Vater",
      class: "bg-vater-kbg",
    });
  }

  // Block 3: KBG Mutter (2. Phase)
  if (p.useSwitch2) {
    const b3Start = new Date(p.switchDate2);
    const b3End = new Date(maxKbgEnd);
    if (b3Start <= b3End) {
      blocks.push({
        type: "kbg",
        who: "Mutter",
        start: b3Start,
        end: b3End,
        label: lbl + " Mutter (2)",
        class: "bg-mutter-kbg-2",
      });
    }
  }

  // Unbezahlte Karenz
  const lastEnd = blocks[blocks.length - 1].end;
  if (p.extendedWho !== "Niemand") {
    const e1Start = addDays(lastEnd, 1);
    const e1End = new Date(p.extendedEndDate);
    if (e1End >= e1Start) {
      blocks.push({
        type: "ext",
        who: p.extendedWho,
        start: e1Start,
        end: e1End,
        label: "Karenz " + p.extendedWho,
        class: p.extendedWho === "Mutter" ? "bg-ext-m" : "bg-ext-v",
      });
      if (p.useExtSwitch) {
        const e2Start = addDays(e1End, 1);
        const e2End = new Date(p.extendedEndDate2);
        if (e2End >= e2Start) {
          blocks.push({
            type: "ext",
            who: p.extendedWho2,
            start: e2Start,
            end: e2End,
            label: "Karenz " + p.extendedWho2,
            class: p.extendedWho2 === "Mutter" ? "bg-ext-m" : "bg-ext-v",
          });
        }
      }
    }
  }

  return { blocks, maxKbgEnd };
}

// ----------------------------------------------------------
// 3) Tagesschleife: dynamischer Simulationszeitraum
//    eaKBG:    730 Tage (2 Jahre)
//    Pauschal: pauschalDays (bis zu 1063), aber mind. 730 Tage,
//              und mindestens bis zum Ende der unbezahlten Karenz.
// ----------------------------------------------------------
function simulate(p, blocks) {
  const wgDaily = calcWochengeldDaily(p.incM);

  // Tagsatz je nach Variante
  let kbgDailyM, kbgDailyV;
  if (p.variant === "pauschal") {
    const pauschalRate = calcPauschalDaily(p.pauschalDays, true);
    kbgDailyM = pauschalRate;
    kbgDailyV = pauschalRate;
  } else {
    kbgDailyM = calcEaKbgDaily(p.incM);
    kbgDailyV = calcEaKbgDaily(p.incV);
  }

  const gfDailyM = p.gfM / 30.4;
  const gfDailyV = p.gfV / 30.4;

  // Sim-Horizont: mindestens 2 Jahre, mindestens KBG-Anspruchsdauer,
  // und mindestens bis Ende des letzten Blocks (z.B. unbezahlte Karenz).
  const variantMaxDays =
    p.variant === "pauschal" ? p.pauschalDays : KBG_LAW.MAX_TOTAL_DAYS;
  let horizonDays = Math.max(730, variantMaxDays);
  if (blocks.length) {
    const lastEnd = blocks[blocks.length - 1].end;
    const lastDays = dayDiff(p.birthDate, lastEnd) + 1;
    if (lastDays > horizonDays) horizonDays = lastDays;
  }
  const simEnd = addDays(p.birthDate, horizonDays - 1);

  const result = {
    wgDaily,
    kbgDailyM,
    kbgDailyV,
    totalStateMoney: 0,
    totalHouseholdMoney: 0,
    mutterKbgDays: 0,
    vaterKbgDays: 0,
    zuverdienstM: {}, // pro Jahr
    zuverdienstV: {},
    monthsData: {},
    simEnd,
    horizonDays,
  };

  let loopDate = normalizeDate(p.birthDate);
  while (loopDate <= simEnd) {
    const k = getYearMonthKey(loopDate);
    if (!result.monthsData[k]) {
      result.monthsData[k] = { statesM: {}, statesV: {}, monM: 0, monV: 0 };
    }
    const year = loopDate.getFullYear();
    if (!result.zuverdienstM[year]) result.zuverdienstM[year] = 0;
    if (!result.zuverdienstV[year]) result.zuverdienstV[year] = 0;

    const block = blocks.find((b) => loopDate >= b.start && loopDate <= b.end);

    let activeM = { label: "Vollzeit Arbeiten", class: "bg-arbeiten" };
    let activeV = { label: "Vollzeit Arbeiten", class: "bg-arbeiten" };
    let mMoney = 0,
      vMoney = 0;

    const daysInMonth = new Date(
      loopDate.getFullYear(),
      loopDate.getMonth() + 1,
      0,
    ).getDate();
    const dailyWorkM = p.incM / daysInMonth;
    const dailyWorkV = p.incV / daysInMonth;

    if (block) {
      if (block.type === "wG") {
        activeM = { label: "Wochengeld", class: "bg-wochengeld" };
        mMoney = wgDaily;
        vMoney = dailyWorkV;
        result.totalStateMoney += wgDaily;
      } else if (block.type === "kbg") {
        if (block.who === "Mutter") {
          activeM = { label: block.label, class: block.class };
          mMoney = kbgDailyM + gfDailyM;
          vMoney = dailyWorkV;
          result.totalStateMoney += kbgDailyM;
          result.zuverdienstM[year] += gfDailyM;
          result.mutterKbgDays++;
        } else {
          activeV = { label: block.label, class: block.class };
          vMoney = kbgDailyV + gfDailyV;
          mMoney = dailyWorkM;
          result.totalStateMoney += kbgDailyV;
          result.zuverdienstV[year] += gfDailyV;
          result.vaterKbgDays++;
        }
      } else if (block.type === "overlap") {
        const lbl = kbgLabel(p.variant);
        if (block.finance === "beide") {
          activeM = { label: lbl + " Mutter", class: "bg-mutter-kbg" };
          activeV = { label: lbl + " Vater", class: "bg-vater-kbg" };
          mMoney = kbgDailyM + gfDailyM;
          vMoney = kbgDailyV + gfDailyV;
          result.totalStateMoney += kbgDailyM + kbgDailyV;
          result.zuverdienstM[year] += gfDailyM;
          result.zuverdienstV[year] += gfDailyV;
          result.mutterKbgDays++;
          result.vaterKbgDays++;
        } else if (block.finance === "mutter") {
          activeM = { label: lbl + " Mutter", class: "bg-mutter-kbg" };
          activeV = { label: "Karenz Vater (unbezahlt)", class: "bg-ext-v" };
          mMoney = kbgDailyM + gfDailyM;
          // Vater: Geringfügigkeit zählt weiter (kein KBG-Bezug → keine Zuverdienst-Grenze)
          vMoney = gfDailyV;
          result.totalStateMoney += kbgDailyM;
          result.zuverdienstM[year] += gfDailyM;
          result.mutterKbgDays++;
        } else {
          activeM = { label: "Karenz Mutter (unbezahlt)", class: "bg-ext-m" };
          activeV = { label: lbl + " Vater", class: "bg-vater-kbg" };
          mMoney = gfDailyM;
          vMoney = kbgDailyV + gfDailyV;
          result.totalStateMoney += kbgDailyV;
          result.zuverdienstV[year] += gfDailyV;
          result.vaterKbgDays++;
        }
      } else if (block.type === "ext") {
        if (block.who === "Mutter") {
          activeM = { label: "Karenz Mutter (unbezahlt)", class: "bg-ext-m" };
          mMoney = gfDailyM; // Geringfügigkeit auch in unbezahlter Karenz
          vMoney = dailyWorkV;
        } else {
          activeV = { label: "Karenz Vater (unbezahlt)", class: "bg-ext-v" };
          vMoney = gfDailyV;
          mMoney = dailyWorkM;
        }
      }
    } else {
      mMoney = dailyWorkM;
      vMoney = dailyWorkV;
    }

    const md = result.monthsData[k];
    if (!md.statesM[activeM.label])
      md.statesM[activeM.label] = { class: activeM.class, days: 0 };
    md.statesM[activeM.label].days++;
    if (!md.statesV[activeV.label])
      md.statesV[activeV.label] = { class: activeV.class, days: 0 };
    md.statesV[activeV.label].days++;
    md.monM += mMoney;
    md.monV += vMoney;
    result.totalHouseholdMoney += mMoney + vMoney;

    loopDate.setDate(loopDate.getDate() + 1);
    loopDate.setHours(12, 0, 0, 0); // DST-sicher: immer auf 12:00 normalisieren
  }

  return result;
}

// ----------------------------------------------------------
// 4) Compliance- und Bonus-Prüfung
// ----------------------------------------------------------
function evaluateCompliance(p, blocks, sim) {
  const totalKbgDays = sim.mutterKbgDays + sim.vaterKbgDays;
  const mRatio = totalKbgDays > 0 ? sim.mutterKbgDays / totalKbgDays : 0;
  const vRatio = totalKbgDays > 0 ? sim.vaterKbgDays / totalKbgDays : 0;

  // 61-Tage-Block-Regel
  const kbgBlocks = blocks.filter((b) => b.type === "kbg");
  let blockRuleViolated = false;
  kbgBlocks.forEach((b) => {
    const days = dayDiff(b.start, b.end) + 1;
    if (days < KBG_LAW.MIN_BLOCK_DAYS) blockRuleViolated = true;
  });

  // Max 2 Wechsel = max 3 KBG-Blöcke (whose).
  // Wir zählen jeden Übergang zwischen unterschiedlichen "who"-Werten,
  // und behandeln overlap-Phasen mit Finanzierung "beide" als Wechselpunkt
  // (gleichzeitiger Bezug ⇒ ein zusätzlicher Wechsel auf Vater).
  const flow = blocks.filter((b) => b.type === "kbg" || b.type === "overlap");
  let switches = 0;
  let prev = null;
  flow.forEach((b) => {
    const who = b.type === "overlap" ? "beide" : b.who;
    if (prev !== null && prev !== who) switches++;
    prev = who;
  });

  // Zusätzlicher Logik-Check: Wechseldaten in falscher Reihenfolge
  // (würde unsichtbar zu einem leeren oder negativen Block führen).
  const dateOrderViolated =
    p.useSwitch2 && dayDiff(p.switchDate1, p.switchDate2) <= 0;

  const switchRuleViolated =
    switches > KBG_LAW.MAX_SWITCHES || dateOrderViolated;

  // Partnerschaftsbonus
  const validRatio =
    mRatio >= KBG_LAW.PARTNERBONUS_MIN_RATIO &&
    vRatio >= KBG_LAW.PARTNERBONUS_MIN_RATIO;
  const validDays =
    sim.mutterKbgDays >= KBG_LAW.PARTNERBONUS_MIN_DAYS &&
    sim.vaterKbgDays >= KBG_LAW.PARTNERBONUS_MIN_DAYS;
  const bonusEligible =
    validRatio && validDays && !blockRuleViolated && !switchRuleViolated;

  // Zuverdienst-Grenze: variantenabhängig
  // eaKBG:    € 8.600/Jahr (§ 24 Abs. 1 Z 3)
  // Pauschal: € 18.000/Jahr (§ 8 Abs. 1)
  const zuverdienstLimit =
    p.variant === "pauschal"
      ? KBG_LAW.PAUSCHAL_ZUVERDIENST_LIMIT
      : KBG_LAW.ZUVERDIENST_LIMIT;
  let zuverdienstViolated = false;
  Object.values(sim.zuverdienstM).forEach((v) => {
    if (v > zuverdienstLimit) zuverdienstViolated = true;
  });
  Object.values(sim.zuverdienstV).forEach((v) => {
    if (v > zuverdienstLimit) zuverdienstViolated = true;
  });

  // Ungenutzte KBG-Tage (Österreich verfällt der Anspruch —
  // wird vom Optimizer als Hinweis angezeigt).
  const variantMaxDays =
    p.variant === "pauschal" ? p.pauschalDays : KBG_LAW.MAX_TOTAL_DAYS;
  const usedKbgDays = sim.mutterKbgDays + sim.vaterKbgDays;
  // Wochengeld-Tage zählen für 426/x mit — daher + tatsächliche Wochengeld-Tage
  const unusedDays = Math.max(
    0,
    variantMaxDays - usedKbgDays - (p.wochengeldDays || KBG_LAW.WOCHENGELD_DAYS),
  );

  return {
    mRatio,
    vRatio,
    blockRuleViolated,
    switchRuleViolated,
    switches,
    dateOrderViolated,
    bonusEligible,
    zuverdienstViolated,
    zuverdienstLimit,
    unusedDays,
  };
}

// ----------------------------------------------------------
// 5) Pure Calculation Pipeline – nutzt der Optimizer ebenfalls
// ----------------------------------------------------------
function calculateScenario(p) {
  const { blocks, maxKbgEnd } = buildBlocks(p);
  const sim = simulate(p, blocks);
  const comp = evaluateCompliance(p, blocks, sim);

  // Bonus / EKP-Strafe
  let stateMoney = sim.totalStateMoney;
  let householdMoney = sim.totalHouseholdMoney;
  if (comp.bonusEligible) {
    stateMoney += KBG_LAW.PARTNERBONUS_TOTAL;
    householdMoney += KBG_LAW.PARTNERBONUS_TOTAL;
  }
  if (!p.ekpDone) {
    stateMoney -= 2 * KBG_LAW.EKP_PENALTY;
    householdMoney -= 2 * KBG_LAW.EKP_PENALTY;
  }

  return { p, blocks, maxKbgEnd, sim, comp, stateMoney, householdMoney };
}

// ----------------------------------------------------------
// 6) DOM-Rendering
// ----------------------------------------------------------
function calculateTimeline() {
  const p = readInputs();
  const r = calculateScenario(p);
  const { blocks, sim, comp, stateMoney, householdMoney } = r;

  // Berechnungsweg
  const variantHtml =
    p.variant === "pauschal"
      ? `
        <b>Variante: Pauschales KBG (KBG-Konto)</b><br>
        Gesamttopf bei Aufteilung ≈ ${formatEur.format(KBG_LAW.PAUSCHAL_TOTAL_BUDGET_SPLIT)} verteilt auf
        ${p.pauschalDays} Tage:<br>
        <i>= <span style="color:var(--mutter-kbg-color);font-weight:bold;">${formatEurCents.format(sim.kbgDailyM)} / Tag</span>
        (gilt für beide Eltern, einheitlicher Tagsatz)</i><br>
        <span class="field-desc">Zuverdienstgrenze pauschal: € 18.000/Jahr.</span>
        ${!p.ekpDone ? '<br><br><b style="color:var(--danger);">Eltern-Kind-Pass-Strafe: −€ 2.600 (2 × € 1.300)</b>' : ""}
      `
      : `
        <b>1. Wochengeld (Mutter):</b> Anrechenbares Netto: ${formatEur.format(Math.min(p.incM, KBG_LAW.MAX_NETTO_SV))}.<br>
        <i>(${formatEur.format(Math.min(p.incM, KBG_LAW.MAX_NETTO_SV))} / 30) × 1,17 =
        <span style="color:var(--danger);font-weight:bold;">${formatEurCents.format(sim.wgDaily)} / Tag</span></i><br><br>
        <b>2. eaKBG Mutter:</b> 80 % des Wochengelds, gedeckelt auf ${formatEurCents.format(KBG_LAW.EAKBG_MAX_DAILY)}.<br>
        <i>= <span style="color:var(--mutter-kbg-color);font-weight:bold;">${formatEurCents.format(sim.kbgDailyM)} / Tag</span></i><br><br>
        <b>3. eaKBG Vater:</b> 80 % des fiktiven Wochengelds (Frau an seiner Stelle), gedeckelt auf ${formatEurCents.format(KBG_LAW.EAKBG_MAX_DAILY)}.<br>
        <i>= <span style="color:var(--vater-kbg-color);font-weight:bold;">${formatEurCents.format(sim.kbgDailyV)} / Tag</span></i>
        ${!p.ekpDone ? '<br><br><b style="color:var(--danger);">Eltern-Kind-Pass-Strafe: −€ 2.600 (2 × € 1.300)</b>' : ""}
      `;
  document.getElementById("calcDetailsText").innerHTML = variantHtml;

  // Variant-Label überall in der UI aktualisieren
  const labelText = kbgLabel(p.variant);
  document.querySelectorAll("[data-kbg-label]").forEach((el) => {
    el.textContent = labelText;
  });

  // Alerts
  document.getElementById("blockAlertBox").style.display =
    comp.blockRuleViolated ? "block" : "none";
  document.getElementById("switchAlertBox").style.display =
    comp.switchRuleViolated ? "block" : "none";
  document.getElementById("switchCount").innerText = comp.switches;
  document.getElementById("zuverdienstAlertBox").style.display =
    comp.zuverdienstViolated ? "block" : "none";

  // KPI-Karten
  document.getElementById("grandTotalHtml").innerText =
    formatEur.format(stateMoney);
  document.getElementById("householdTotalHtml").innerText =
    formatEur.format(householdMoney);
  document.getElementById("mutterDaysHtml").innerText =
    `${sim.mutterKbgDays} Tage`;
  document.getElementById("vaterDaysHtml").innerText =
    `${sim.vaterKbgDays} Tage`;
  document.getElementById("ratioHtml").innerText =
    `${Math.round(comp.mRatio * 100)}% : ${Math.round(comp.vRatio * 100)}%`;

  const switchesCard = document.getElementById("switchesCard");
  document.getElementById("switchesHtml").innerText =
    `${comp.switches} / ${KBG_LAW.MAX_SWITCHES}`;
  switchesCard.className = comp.switchRuleViolated
    ? "card danger"
    : "card success";

  const bonusCard = document.getElementById("bonusCard");
  const ratioCard = document.getElementById("ratioCard");
  if (comp.bonusEligible) {
    document.getElementById("bonusHtml").innerText = "JA (€ 1.000)";
    bonusCard.className = "card success";
    ratioCard.className = "card success";
  } else {
    document.getElementById("bonusHtml").innerText = "NEIN (€ 0)";
    bonusCard.className = "card danger";
    ratioCard.className = "card danger";
  }

  renderTimeline(blocks, r.maxKbgEnd, sim.simEnd, sim.horizonDays);
  renderCalendar(sim.monthsData);
  renderChart(sim.monthsData);
}

function renderTimeline(blocks, maxKbgEnd, simEnd, horizonDays) {
  const tBar = document.getElementById("timelineBar");
  tBar.innerHTML = "";
  let html = "";
  blocks.forEach((b) => {
    const days = dayDiff(b.start, b.end) + 1;
    if (days <= 0) return;
    let visualClass = b.class;
    let textLabel = b.label;
    if (b.type === "overlap") {
      if (b.finance === "beide") {
        textLabel = "Überschneidung (beide eaKBG)";
        visualClass = "bg-mutter-kbg";
      } else if (b.finance === "mutter") {
        textLabel = "Überschneidung (Mutter eaKBG, Vater unbezahlt)";
        visualClass = "bg-mutter-kbg";
      } else {
        textLabel = "Überschneidung (Vater eaKBG, Mutter unbezahlt)";
        visualClass = "bg-vater-kbg";
      }
    }
    const widthPct = (days / horizonDays) * 100;
    const div = document.createElement("div");
    div.className = `timeline-segment ${visualClass}`;
    div.style.width = `${widthPct}%`;
    div.innerText =
      widthPct > 6 ? (b.type === "overlap" ? "Überschnitt" : b.label) : "";
    tBar.appendChild(div);
    html += `<p style="margin:4px 0;">• <b>${formatDateStr(b.start)} – ${formatDateStr(b.end)}</b>: ${textLabel} (${days} Tage)</p>`;
  });
  const lastEnd = blocks.length ? blocks[blocks.length - 1].end : null;
  if (lastEnd && lastEnd < simEnd) {
    const days = dayDiff(lastEnd, simEnd);
    html += `<p style="margin:4px 0;color:#6c757d;">• <b>${formatDateStr(addDays(lastEnd, 1))} – ${formatDateStr(simEnd)}</b>: Beide arbeiten Vollzeit (${days} Tage)</p>`;
  }
  document.getElementById("textTimeline").innerHTML = html;
}

function renderCalendar(monthsData) {
  const c = document.getElementById("calendarView");
  c.innerHTML = "";
  for (const key in monthsData) {
    const m = monthsData[key];
    const box = document.createElement("div");
    box.className = "month-box";
    let badgesM = "",
      badgesV = "";
    for (const l in m.statesM)
      badgesM += `<div class="phase-badge ${m.statesM[l].class}">${l} <span>${m.statesM[l].days} T</span></div>`;
    for (const l in m.statesV)
      badgesV += `<div class="phase-badge ${m.statesV[l].class}">${l} <span>${m.statesV[l].days} T</span></div>`;
    box.innerHTML = `
            <div>
                <div class="month-title">${getMonthName(key)}</div>
                <div class="person-strip">
                    <div class="person-name color-mutter">Mutter</div>
                    <div class="day-strip">${badgesM}</div>
                </div>
                <div class="person-strip">
                    <div class="person-name color-vater">Vater</div>
                    <div class="day-strip">${badgesV}</div>
                </div>
            </div>
            <div class="finance-footer">
                <div class="finance-row color-mutter"><span>Netto Mutter:</span><span>${formatEur.format(m.monM)}</span></div>
                <div class="finance-row color-vater"><span>Netto Vater:</span><span>${formatEur.format(m.monV)}</span></div>
                <div class="finance-row" style="font-weight:bold;margin-top:4px;font-size:13px;border-top:1px dashed #ccc;padding-top:4px;">
                    <span>Haushalt:</span><span>${formatEur.format(m.monM + m.monV)}</span>
                </div>
            </div>`;
    c.appendChild(box);
  }
}

function renderChart(monthsData) {
  const ctx = document.getElementById("incomeChart").getContext("2d");
  const labels = Object.keys(monthsData).map(getMonthName);
  const dataM = Object.values(monthsData).map((m) => Math.round(m.monM));
  const dataV = Object.values(monthsData).map((m) => Math.round(m.monV));
  if (incomeChartInstance) incomeChartInstance.destroy();
  incomeChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Mutter", data: dataM, backgroundColor: "#457b9d" },
        { label: "Vater", data: dataV, backgroundColor: "#2a9d8f" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { callback: (v) => formatEur.format(v) } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatEur.format(ctx.parsed.y)}`,
            footer: (items) =>
              "Summe: " +
              formatEur.format(items.reduce((s, i) => s + i.parsed.y, 0)),
          },
        },
      },
    },
  });
}

// ----------------------------------------------------------
// 7) UI-Bindings
// ----------------------------------------------------------
function bindUI() {
  document.getElementById("useOverlap").addEventListener("change", (e) => {
    document.getElementById("overlapControls").style.display = e.target.checked
      ? "block"
      : "none";
    calculateTimeline();
  });
  document.getElementById("useSwitch2").addEventListener("change", (e) => {
    document.getElementById("switchDate2").style.display = e.target.checked
      ? "block"
      : "none";
    calculateTimeline();
  });
  document.getElementById("extendedWho").addEventListener("change", (e) => {
    document.getElementById("extendedControls").style.display =
      e.target.value === "Niemand" ? "none" : "block";
    document.getElementById("extendedWho2").value =
      e.target.value === "Mutter" ? "Vater" : "Mutter";
    calculateTimeline();
  });
  document.getElementById("useExtSwitch").addEventListener("change", (e) => {
    document.getElementById("extSwitchControls").style.display = e.target
      .checked
      ? "block"
      : "none";
    calculateTimeline();
  });

  const inputs = [
    "birthDate",
    "switchDate",
    "switchDate2",
    "incomeMutter",
    "incomeVater",
    "gfMutter",
    "gfVater",
    "extendedEndDate",
    "extendedEndDate2",
    "extendedWho2",
    "overlapDays",
    "overlapFinancing",
    "ekpDone",
    "kbgVariant",
    "pauschalDays",
  ];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(evt, calculateTimeline);
  });

  // Pauschal-Tage-Eingabe nur bei pauschaler Variante einblenden
  const variantSel = document.getElementById("kbgVariant");
  const pauschalWrap = document.getElementById("pauschalDaysWrap");
  const togglePauschal = () => {
    pauschalWrap.style.display =
      variantSel.value === "pauschal" ? "block" : "none";
  };
  variantSel.addEventListener("change", togglePauschal);
  togglePauschal();
}

document.addEventListener("DOMContentLoaded", () => {
  bindUI();
  calculateTimeline();
});
