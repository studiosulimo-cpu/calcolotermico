// =======================
// CONFIG
// =======================

const coeffZona = { A:0.6,B:0.75,C:0.9,D:1,E:1.2,F:1.4 };
const Ce = 0.18;


// =======================
// SCENARI
// =======================

function scenarioBaseline(gas, ele, cgas, cele) {
  return gas*cgas + ele*cele;
}

function scenarioCaldaia(gas, cgas) {
  const consumo = gas * 0.8;
  return consumo * cgas;
}

function scenarioPDC(gas, cgas, cele, cop, potenza, ore, zona) {

  const quota = 0.8;

  const gasPost = gas*(1-quota);
  const elePost = (gas*quota)/cop;

  const costo = gasPost*cgas + elePost*cele;

  // incentivo
  const Q = potenza * ore * coeffZona[zona];
  const incentivo = Q * Ce * Math.min(cop/2.5,1.2);

  const investimento = potenza * 1000;

  return { costo, incentivo, investimento };
}

function scenarioBiomassa(gas) {
  return gas * 0.3 * 0.08;
}


// =======================
// MAIN
// =======================

function calcola() {

  const gas = parseFloat(document.getElementById("gas").value);
  const ele = parseFloat(document.getElementById("ele").value);

  const cgas = parseFloat(document.getElementById("cgas").value);
  const cele = parseFloat(document.getElementById("cele").value);

  const potenza = parseFloat(document.getElementById("potenza").value);
  const cop = parseFloat(document.getElementById("cop").value);
  const ore = parseFloat(document.getElementById("ore").value);
  const zona = document.getElementById("zona").value;

  let risultati = [];

  // baseline
  const base = scenarioBaseline(gas, ele, cgas, cele);

  // caldaia
  const caldaia = scenarioCaldaia(gas, cgas);

  risultati.push({
    nome: "Caldaia condensazione",
    costo: caldaia,
    risparmio: base - caldaia,
    payback: 2 // placeholder
  });

  // PDC
  const pdc = scenarioPDC(gas, cgas, cele, cop, potenza, ore, zona);

  const risparmioPDC = base - pdc.costo;
  const netto = pdc.investimento - pdc.incentivo;
  const paybackPDC = netto / risparmioPDC;

  risultati.push({
    nome: "Pompa di Calore",
    costo: pdc.costo,
    risparmio: risparmioPDC,
    payback: paybackPDC,
    incentivo: pdc.incentivo
  });

  // biomassa
  const bio = scenarioBiomassa(gas);

  risultati.push({
    nome: "Biomassa",
    costo: bio,
    risparmio: base - bio,
    payback: 4 // placeholder
  });

  // RANKING (miglior payback)
  risultati.sort((a,b) => a.payback - b.payback);

  // OUTPUT
  let html = "";

  html += `<div class="best"><b>MIGLIOR SOLUZIONE: ${risultati[0].nome}</b></div>`;

  risultati.forEach(r => {
    html += `
      <p>
        <b>${r.nome}</b><br>
        Costo: € ${r.costo.toFixed(0)}<br>
        Risparmio: € ${r.risparmio.toFixed(0)}<br>
        Payback: ${r.payback.toFixed(1)} anni<br>
        ${r.incentivo ? "Incentivo: € "+r.incentivo.toFixed(0) : ""}
      </p>
      <hr>
    `;
  });

  document.getElementById("out").innerHTML = html;
}
