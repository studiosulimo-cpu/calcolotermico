// ============================================================
// ENERGY TOOL PRO – app.js
// Analisi multi-scenario efficienza energetica edifici
// Riferimenti normativi:
//   - D.M. 16/02/2016 (Conto Termico 2.0 – GSE)
//   - D.P.R. 412/1993 (Zone climatiche)
//   - D.Lgs. 102/2014 (Diagnosi energetica)
//   - EN 14511 (COP pompe di calore)
// ============================================================


// ============================================================
// COSTANTI E CONFIGURAZIONE
// ============================================================

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// Coefficienti zona climatica (D.P.R. 412/1993)
const COEFF_ZONA = { A: 0.6, B: 0.75, C: 0.9, D: 1.0, E: 1.2, F: 1.4 };

// Tariffa incentivo Conto Termico (€/kWh termico) – D.M. 16/02/2016, Tabella 6
const CE = 0.18;

// Consumi mensili precaricati (esempio edificio residenziale zona D)
const GAS_DEFAULT = [3200, 2800, 2100, 1200, 600, 200, 100, 100, 400, 1100, 2400, 3000];
const ELE_DEFAULT = [350, 310, 280, 260, 240, 310, 380, 370, 270, 260, 310, 340];

let chartConsumi = null;


// ============================================================
// INIZIALIZZAZIONE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  buildGrid('consumi-gas-grid', 'gas', GAS_DEFAULT);
  buildGrid('consumi-ele-grid', 'ele', ELE_DEFAULT);
  setTimeout(aggiornaConsumi, 150);
});


// ============================================================
// GESTIONE TAB
// ============================================================

function showTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const tabs = ['edificio', 'consumi', 'impianti', 'risultati'];
  const idx = tabs.indexOf(name);
  if (idx >= 0) document.querySelectorAll('.tab')[idx].classList.add('active');
  if (name === 'consumi') setTimeout(aggiornaConsumi, 50);
}


// ============================================================
// GRIGLIA CONSUMI MENSILI
// ============================================================

function buildGrid(containerId, prefix, defaults) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  MESI.forEach((mese, i) => {
    const col = document.createElement('div');
    col.className = 'mese-col';
    col.innerHTML = `
      <label for="${prefix}-${i}">${mese}</label>
      <input type="number" id="${prefix}-${i}" value="${defaults[i]}" min="0"
             oninput="aggiornaConsumi()" aria-label="Consumo ${prefix} ${mese}">
    `;
    container.appendChild(col);
  });
}

function getConsumi(prefix) {
  return MESI.map((_, i) => {
    const el = document.getElementById(`${prefix}-${i}`);
    return el ? (parseFloat(el.value) || 0) : 0;
  });
}


// ============================================================
// AGGIORNAMENTO TOTALI E GRAFICO CONSUMI
// ============================================================

function aggiornaConsumi() {
  const gas  = getConsumi('gas');
  const ele  = getConsumi('ele');
  const cgas = parseFloat(document.getElementById('cgas')?.value) || 0;
  const cele = parseFloat(document.getElementById('cele')?.value) || 0;

  const totG = gas.reduce((a, b) => a + b, 0);
  const totE = ele.reduce((a, b) => a + b, 0);
  const sg   = totG * cgas;
  const se   = totE * cele;

  setTxt('tot-gas',   totG.toLocaleString('it-IT') + ' kWh');
  setTxt('tot-ele',   totE.toLocaleString('it-IT') + ' kWh');
  setTxt('spesa-gas', '€ ' + sg.toFixed(0));
  setTxt('spesa-ele', '€ ' + se.toFixed(0));
  setTxt('spesa-tot', '€ ' + (sg + se).toFixed(0));

  aggiornaChartConsumi(gas, ele);
}

function aggiornaChartConsumi(gas, ele) {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById('chartConsumi');
  if (!ctx) return;
  if (chartConsumi) { chartConsumi.destroy(); chartConsumi = null; }

  chartConsumi = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MESI,
      datasets: [
        {
          label: 'Gas (kWh)',
          data: gas,
          borderColor: '#1F4E79',
          backgroundColor: 'rgba(31,78,121,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#1F4E79',
          borderWidth: 2,
        },
        {
          label: 'Elettricità (kWh)',
          data: ele,
          borderDash: [5, 4],
          borderColor: '#EF9F27',
          backgroundColor: 'rgba(239,159,39,0.07)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#EF9F27',
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` ${c.dataset.label}: ${c.parsed.y.toLocaleString('it-IT')} kWh`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 }, callback: v => v.toLocaleString('it-IT') },
          beginAtZero: true
        }
      }
    }
  });
}


// ============================================================
// UTILITY
// ============================================================

function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function readNum(id, fallback) {
  const v = parseFloat(document.getElementById(id)?.value);
  return isNaN(v) ? fallback : v;
}

function readStr(id, fallback) {
  return document.getElementById(id)?.value || fallback;
}

function aggiornaCliente() {
  const v = document.getElementById('nome-cliente')?.value.trim() || '';
  setTxt('cliente-label', v ? '📋 ' + v : '');
}


// ============================================================
// CALCOLI FINANZIARI
// ============================================================

/**
 * Valore Attuale Netto (VAN) su n anni al tasso r%.
 * VAN = -I + Σ [CF / (1+r)^t] per t = 1..n
 */
function calcolaVAN(investimento, risparmioAnnuo, tasso, anni) {
  let v = -investimento;
  for (let t = 1; t <= anni; t++) {
    v += risparmioAnnuo / Math.pow(1 + tasso / 100, t);
  }
  return v;
}

/**
 * Payback semplice (anni) = Investimento netto / Risparmio annuo.
 */
function calcolaPayback(investimentoNetto, risparmioAnnuo) {
  if (risparmioAnnuo <= 0) return Infinity;
  return investimentoNetto / risparmioAnnuo;
}

/**
 * Incentivo Conto Termico attualizzato (D.M. 16/02/2016).
 * Erogazione: 5 rate annuali uguali.
 * Fattore prestazionale fp = min(COP/2,5 ; 1,2) – All. II, Tab. 3.
 * Requisito ammissibilità: COP ≥ 2,6 (pompe di calore elettriche).
 */
function calcolaIncentivoCT(potenza, ore, coeffZ, cop, tasso) {
  const Q        = potenza * ore * coeffZ;
  const fp       = Math.min(cop / 2.5, 1.2);
  const incAnnuo = Q * CE * fp;
  let totale = 0;
  for (let t = 1; t <= 5; t++) {
    totale += incAnnuo / Math.pow(1 + tasso / 100, t);
  }
  return totale;
}


// ============================================================
// SCENARI
// ============================================================

/**
 * Caldaia a condensazione.
 * Recupero calore latente fumi: η_s tipico 96-100% su PCI.
 * Si confronta con η stimato impianto esistente (78%).
 */
function scenarioCaldaia(gas, ele, cgas, cele, etaCald, investimento) {
  const ETA_VECCHIA = 0.78;
  const gasPost     = gas * (ETA_VECCHIA / etaCald);
  const costo       = gasPost * cgas + ele * cele;
  const riduzioneGas = (1 - gasPost / gas) * 100;
  return { costo, investimento, incentivo: 0, riduzioneGas };
}

/**
 * Pompa di calore aria-acqua.
 * Quota (quotaPDC) del fabbisogno termico gas → coperta da PDC.
 * Usa SCOP stagionale per il calcolo dei consumi elettrici annui.
 * COP nominale A7W35 (EN 14511) usato solo per calcolo incentivo CT (come richiesto GSE).
 */
function scenarioPDC(gas, ele, cgas, cele, cop, scop, potenza, ore, quota, zona, tasso, investimento) {
  const coeffZ    = COEFF_ZONA[zona] || 1.0;
  const gasPost   = gas * (1 - quota);
  const elePost   = (gas * quota) / scop;
  const costo     = gasPost * cgas + (ele + elePost) * cele;
  const incentivo = calcolaIncentivoCT(potenza, ore, coeffZ, cop, tasso);
  const riduzioneGas = quota * 100;
  return { costo, investimento, incentivo, riduzioneGas };
}

/**
 * Caldaia a biomassa (pellet).
 * Sostituzione integrale del gas con pellet.
 * η tipico caldaia a pellet automatica: 85-92%.
 * CO2: convenzionalmente neutro (ciclo chiuso biomassa).
 */
function scenarioBiomassa(gas, ele, cgas, cele, etaBio, costoPellet, investimento) {
  const consumoBio = gas / etaBio;
  const costo      = consumoBio * costoPellet + ele * cele;
  return { costo, investimento, incentivo: 0, riduzioneGas: 100 };
}


// ============================================================
// CALCOLA – funzione principale (chiamata dal bottone)
// ============================================================

function calcola() {
  const zona = readStr('zona', 'D');

  const gasArr = getConsumi('gas');
  const eleArr = getConsumi('ele');
  const gas    = gasArr.reduce((a, b) => a + b, 0);
  const ele    = eleArr.reduce((a, b) => a + b, 0);

  const cgas = readNum('cgas', 0.10);
  const cele = readNum('cele', 0.25);

  const potenza  = readNum('potenza', 30);
  const cop      = readNum('cop', 3.8);
  const scop     = readNum('scop', 3.2);
  const ore      = readNum('ore', 1400);
  const quota    = readNum('quota-pdc', 80) / 100;
  const invPDC   = readNum('inv-pdc', 30000);

  const etaCald = readNum('eta-cald', 96) / 100;
  const invCald = readNum('inv-cald', 6000);

  const etaBio      = readNum('eta-bio', 88) / 100;
  const costoPellet = readNum('costo-pellet', 0.07);
  const invBio      = readNum('inv-bio', 12000);

  const tasso = readNum('tasso', 5);
  const anni  = readNum('anni', 15);

  const base = gas * cgas + ele * cele;

  const resCald = scenarioCaldaia(gas, ele, cgas, cele, etaCald, invCald);
  const resPDC  = scenarioPDC(gas, ele, cgas, cele, cop, scop, potenza, ore, quota, zona, tasso, invPDC);
  const resBio  = scenarioBiomassa(gas, ele, cgas, cele, etaBio, costoPellet, invBio);

  const scenari = [
    buildScenario('Pompa di calore',       resPDC,  base, tasso, anni, '#1D9E75', 'badge-verde'),
    buildScenario('Caldaia condensazione', resCald, base, tasso, anni, '#2E75B6', 'badge-teal'),
    buildScenario('Biomassa (pellet)',     resBio,  base, tasso, anni, '#BA7517', 'badge-amber'),
  ].sort((a, b) => b.van - a.van);

  renderRisultati(scenari, base, gas, ele, tasso, anni);
  renderChartBar(scenari, base);
  showTab('risultati');
}

function buildScenario(nome, res, base, tasso, anni, colore, badge) {
  const { costo, investimento, incentivo, riduzioneGas } = res;
  const risparmio = base - costo;
  const invNetto  = Math.max(0, investimento - incentivo);
  const payback   = calcolaPayback(invNetto, risparmio);
  const van       = calcolaVAN(invNetto, risparmio, tasso, anni);
  return { nome, costo, risparmio, investimento, invNetto, incentivo, payback, van, riduzioneGas, colore, badge };
}


// ============================================================
// RENDERING RISULTATI
// ============================================================

function renderRisultati(scenari, base, gas, ele, tasso, anni) {
  const maxPB = Math.max(...scenari.filter(s => isFinite(s.payback)).map(s => s.payback), 1);
  const rkcol = ['rk1', 'rk2', 'rk3'];
  let html = '';

  // Baseline
  html += `
  <div class="baseline-card">
    <div class="metric-label">Situazione attuale (baseline)</div>
    <div class="baseline-kpi">
      <div>
        <div class="metric-value">€ ${Math.round(base).toLocaleString('it-IT')}</div>
        <div class="metric-sub">Spesa energetica totale/anno</div>
      </div>
      <div>
        <div class="metric-value mid">${Math.round(gas).toLocaleString('it-IT')} kWh</div>
        <div class="metric-sub">Gas annuo</div>
      </div>
      <div>
        <div class="metric-value mid">${Math.round(ele).toLocaleString('it-IT')} kWh</div>
        <div class="metric-sub">Elettricità annua</div>
      </div>
    </div>
  </div>`;

  // Ranking
  html += `<div class="card" style="margin-bottom:16px;"><h3>Ranking investimenti — VAN ${anni} anni, tasso ${tasso}%</h3>`;
  scenari.forEach((s, i) => {
    const vanStr = isFinite(s.van)
      ? (s.van >= 0 ? '+ ' : '') + '€ ' + Math.round(s.van).toLocaleString('it-IT')
      : 'N/D';
    const pbStr = isFinite(s.payback) ? s.payback.toFixed(1) + 'a' : 'N/D';
    html += `
    <div class="ranking-row">
      <div class="ranking-num ${rkcol[i]}">${i + 1}</div>
      <div class="ranking-nome">${s.nome}</div>
      <span class="badge ${s.badge}" style="margin-right:6px;">PB ${pbStr}</span>
      <div class="ranking-van" style="color:${s.van >= 0 ? '#27500A' : '#A32D2D'}">${vanStr}</div>
    </div>`;
  });
  html += `</div>`;

  // Schede dettaglio scenari
  scenari.forEach((s, i) => {
    const isBest = i === 0;
    const pbStr  = isFinite(s.payback) ? s.payback.toFixed(1) + ' anni' : 'N/D';
    const pbPerc = isFinite(s.payback) ? Math.min((s.payback / maxPB) * 100, 100) : 100;
    const vanStr = (s.van >= 0 ? '+' : '') + '€ ' + Math.round(s.van).toLocaleString('it-IT');

    html += `
    <div class="scenario-card ${isBest ? 'best' : ''}">
      <div class="scenario-header">
        <h4>${isBest ? '⭐ ' : ''}${s.nome}</h4>
        ${isBest ? `<span class="badge badge-verde">Soluzione consigliata</span>` : ''}
      </div>
      <div class="kpi-row">
        <div class="kpi">
          <div class="kl">Spesa post-intervento</div>
          <div class="kv">€ ${Math.round(s.costo).toLocaleString('it-IT')}</div>
          <div class="ks">/anno</div>
        </div>
        <div class="kpi">
          <div class="kl">Risparmio annuo</div>
          <div class="kv" style="color:${s.risparmio >= 0 ? '#27500A' : '#A32D2D'}">
            € ${Math.round(s.risparmio).toLocaleString('it-IT')}
          </div>
          <div class="ks">vs baseline</div>
        </div>
        <div class="kpi">
          <div class="kl">Payback semplice</div>
          <div class="kv">${pbStr}</div>
          <div class="ks">recupero invest.</div>
        </div>
        <div class="kpi">
          <div class="kl">VAN ${anni}a</div>
          <div class="kv" style="color:${s.van >= 0 ? '#27500A' : '#A32D2D'}">${vanStr}</div>
          <div class="ks">tasso ${tasso}%</div>
        </div>
      </div>
      <div class="detail-rows">
        <div class="row-detail"><span class="dk">Investimento lordo</span><span class="dv">€ ${Math.round(s.investimento).toLocaleString('it-IT')}</span></div>
        ${s.incentivo > 0 ? `<div class="row-detail"><span class="dk">Incentivo Conto Termico (attualizzato 5 anni)</span><span class="dv" style="color:#27500A;">− € ${Math.round(s.incentivo).toLocaleString('it-IT')}</span></div>` : ''}
        <div class="row-detail"><span class="dk">Investimento netto</span><span class="dv">€ ${Math.round(s.invNetto).toLocaleString('it-IT')}</span></div>
        <div class="row-detail"><span class="dk">Riduzione consumo gas</span><span class="dv">${s.riduzioneGas.toFixed(0)}%</span></div>
      </div>
      <div style="margin-top:10px;">
        <div style="font-size:11px; color:#666; margin-bottom:4px;">Payback: ${pbStr}</div>
        <div class="payback-bar"><div class="payback-fill" style="width:${pbPerc.toFixed(1)}%; background:${s.colore};"></div></div>
      </div>
    </div>`;
  });

  // Grafico barre (placeholder canvas)
  html += `
  <div class="card chart-card">
    <h3>Confronto spesa energetica annua (€)</h3>
    <div class="chart-legend" id="legend-bar"></div>
    <div style="position:relative; width:100%; height:240px;">
      <canvas id="chartBar" role="img"
        aria-label="Grafico a barre confronto spesa energetica annua per scenario">
        Dati comparativi spesa energetica annua.
      </canvas>
    </div>
  </div>`;

  html += `
  <p class="note-norm">
    Calcoli indicativi a uso professionale. VAN calcolato al netto dell'incentivo Conto Termico
    (D.M. 16/02/2016, GSE). Zone climatiche: D.P.R. 412/1993. Non sostituisce perizia tecnica o
    diagnosi energetica certificata ai sensi del D.Lgs. 102/2014.
  </p>`;

  document.getElementById('risultati-content').innerHTML = html;

  // Legend
  const legBar = document.getElementById('legend-bar');
  if (legBar) {
    legBar.innerHTML =
      `<span class="leg-item"><span class="leg-sq" style="background:#888780;"></span>Baseline</span>` +
      scenari.map(s =>
        `<span class="leg-item"><span class="leg-sq" style="background:${s.colore};"></span>${s.nome}</span>`
      ).join('');
  }
}

function renderChartBar(scenari, base) {
  setTimeout(() => {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('chartBar');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Baseline', ...scenari.map(s => s.nome)],
        datasets: [{
          data:            [base, ...scenari.map(s => s.costo)],
          backgroundColor: ['#888780', ...scenari.map(s => s.colore)],
          borderRadius: 4,
          barThickness: 48,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => ' € ' + Math.round(c.parsed.y).toLocaleString('it-IT')
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 }, callback: v => '€ ' + v.toLocaleString('it-IT') },
            beginAtZero: true
          }
        }
      }
    });
  }, 120);
}
