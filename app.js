// =======================
// CONFIGURAZIONE BASE
// =======================

const coeffZona = {
  A: 0.6,
  B: 0.75,
  C: 0.9,
  D: 1.0,
  E: 1.2,
  F: 1.4
};

const Ce = 0.18; // €/kWh incentivo CT (tarabile)
const CO2gas = 0.2;

const tasso = 0.05;
const anni = 10;


// =======================
// FUNZIONI CORE
// =======================

// Energia termica incentivata
function energiaTermica(potenza, ore, zona) {
  const k = coeffZona[zona] || 1;
  return potenza * ore * k;
}


// Incentivo Conto Termico
function incentivoCT(Q, cop) {
  const fp = Math.min(cop / 2.5, 1.2);
  return Q * Ce * fp;
}


// Consumi post intervento PDC
function calcolaConsumi(gas, cop) {

  const quotaSostituita = 0.8;

  const gasPost = gas * (1 - quotaSostituita);

  const energiaTermica = gas * quotaSostituita;

  const consumoElettrico = energiaTermica / cop;

  return {
    gasPost: gasPost,
    ele: consumoElettrico
  };
}


// VAN
function calcolaVAN(investimento, risparmio) {

  let van = -investimento;

  for (let t = 1; t <= anni; t++) {
    van += risparmio / Math.pow(1 + tasso, t);
  }

  return van;
}


// =======================
// MAIN
// =======================

function calcola() {

  const potenza = parseFloat(document.getElementById("potenza").value);
  const cop = parseFloat(document.getElementById("cop").value);
  const zona = document.getElementById("zona").value;
  const ore = parseFloat(document.getElementById("ore").value);

  const gas = parseFloat(document.getElementById("gas").value);
  const cgas = parseFloat(document.getElementById("cgas").value);
  const cele = parseFloat(document.getElementById("cele").value);

  // Validazione base
  if (!potenza || !cop || !gas) {
    document.getElementById("out").innerHTML =
      "⚠️ Inserisci tutti i dati obbligatori";
    return;
  }

  // Energia incentivata
  const Q = energiaTermica(potenza, ore, zona);

  // Incentivo CT
  const incentivo = incentivoCT(Q, cop);

  // Consumi post intervento
  const post = calcolaConsumi(gas, cop);

  // Costi
  const costoPre = gas * cgas;
  const costoPost = post.gasPost * cgas + post.ele * cele;

  const risparmio = costoPre - costoPost;

  // Investimento stimato
  const investimento = potenza * 1000;

  const investimentoNetto = investimento - incentivo;

  const payback = investimentoNetto / risparmio;

  const van = calcolaVAN(investimentoNetto, risparmio);

  // CO2 evitata
  const co2 = (gas - post.gasPost) * CO2gas;

  // OUTPUT
  document.getElementById("out").innerHTML = `
    <b>Energia incentivata:</b> ${Q.toFixed(0)} kWh<br><br>

    <b>Incentivo Conto Termico:</b> € ${incentivo.toFixed(0)}<br>
    <b>Investimento stimato:</b> € ${investimento.toFixed(0)}<br>
    <b>Investimento netto:</b> € ${investimentoNetto.toFixed(0)}<br><br>

    <b>Risparmio annuo:</b> € ${risparmio.toFixed(0)}<br>
    <b>Payback:</b> ${payback.toFixed(1)} anni<br>
    <b>VAN (10 anni):</b> € ${van.toFixed(0)}<br><br>

    <b>CO₂ evitata:</b> ${co2.toFixed(0)} kg/anno
  `;
}