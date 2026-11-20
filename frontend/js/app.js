const $ = (id) => document.getElementById(id);

const defaultAfd = {
  states: ["s0", "s1", "s2"],
  alphabet: ["a", "b"],
  initial: "s0",
  finals: ["s2"],
  transitions: {
    s0: { a: "s1", b: "s0" },
    s1: { a: "s1", b: "s2" },
    s2: { a: "s1", b: "s0" },
  },
};

// Estado inicial: el programa arranca vacío. El ejemplo A2 solo se carga
// cuando el usuario pulsa «Cargar ejemplo A2».
const emptyAfd = {
  states: [],
  alphabet: [],
  initial: "",
  finals: [],
  transitions: {},
};

let afd = structuredClone(emptyAfd);
let lastTrace = [];

const hasAutomaton = () => afd.states.length > 0 && afd.alphabet.length > 0;
const setText = (list) => (list.length ? `{${list.join(", ")}}` : "∅");

const parseList = (value) => [
  ...new Set(value.split(",").map((x) => x.trim()).filter(Boolean)),
];

const showToast = (message) => {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2300);
};

const escapeXml = (s) =>
  String(s).replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

function configError(msg) {
  $("configError").textContent = msg;
  $("configError").classList.remove("hidden");
}

function loadForm() {
  $("statesInput").value = afd.states.join(", ");
  $("alphabetInput").value = afd.alphabet.join(", ");

  $("initialSelect").innerHTML = afd.states
    .map((s) => `<option ${s === afd.initial ? "selected" : ""}>${escapeXml(s)}</option>`)
    .join("");

  $("finalSelect").innerHTML = afd.states
    .map(
      (s) =>
        `<option value="${escapeXml(s)}" ${afd.finals.includes(s) ? "selected" : ""}>${escapeXml(s)}</option>`
    )
    .join("");

  renderTransitionTable();
  renderAll();
}

function renderTransitionTable() {
  const [a = "—", b = "—"] = afd.alphabet;
  $("symbolHeadA").textContent = a;
  $("symbolHeadB").textContent = b;

  $("transitionBody").innerHTML = afd.states
    .map(
      (s) => `
      <tr>
        <td>${escapeXml(s)}</td>
        ${[a, b]
          .map(
            (sym) => `
          <td>
            <select data-state="${escapeXml(s)}" data-symbol="${escapeXml(sym)}">
              ${afd.states
                .map(
                  (target) =>
                    `<option ${afd.transitions[s]?.[sym] === target ? "selected" : ""}>${escapeXml(target)}</option>`
                )
                .join("")}
            </select>
          </td>`
          )
          .join("")}
      </tr>`
    )
    .join("");

  $("transitionCount").textContent = `${afd.states.length * afd.alphabet.length} TRANSICIONES`;
}

function applyChanges() {
  const states = parseList($("statesInput").value);
  const alphabet = parseList($("alphabetInput").value);

  if (!states.length || !alphabet.length) {
    return configError("Debes definir al menos un estado y un símbolo.");
  }

  if (states.some((s) => /\s/.test(s)) || alphabet.some((s) => s.length !== 1)) {
    return configError("Usa nombres de estado sin espacios y símbolos de un solo carácter.");
  }

  if (alphabet.length !== 2) {
    return configError(
      "Esta primera versión visual admite dos símbolos en la tabla. Define exactamente dos símbolos."
    );
  }

  const initial = $("initialSelect").value;
  const finals = [...$("finalSelect").selectedOptions].map((o) => o.value);
  const transitions = {};

  for (const s of states) {
    transitions[s] = {};
    for (const sym of alphabet) {
      const select = document.querySelector(`select[data-state="${s}"][data-symbol="${sym}"]`);
      transitions[s][sym] = select?.value || states[0];
    }
  }

  afd = {
    states,
    alphabet,
    initial: states.includes(initial) ? initial : states[0],
    finals: finals.filter((s) => states.includes(s)),
    transitions,
  };

  $("configError").classList.add("hidden");
  renderTransitionTable();
  renderAll();
  showToast("Autómata actualizado correctamente.");
}

function renderAll() {
  renderGraph();
  renderTuple();
  renderMetrics();
  $("projectName").textContent = !afd.states.length
    ? "AFD · Sin autómata"
    : `AFD · ${afd.finals.join(", ") || "Sin estados finales"}`;
}

function renderTuple() {
  $("tupleDisplay").textContent = `M = (${setText(afd.states)}, ${setText(afd.alphabet)}, δ, ${afd.initial || "—"}, ${setText(afd.finals)})`;

  const pills = [
    `Q = ${setText(afd.states)}`,
    `Σ = ${setText(afd.alphabet)}`,
    `q₀ = ${afd.initial || "—"}`,
    `F = ${setText(afd.finals)}`,
  ];

  $("tupleDetails").innerHTML = pills
    .map((x) => `<span class="tuple-pill">${escapeXml(x)}</span>`)
    .join("");
}

function renderMetrics() {
  $("metricStates").textContent = afd.states.length;
  $("metricSymbols").textContent = afd.alphabet.length;
  $("metricTransitions").textContent = afd.states.length * afd.alphabet.length;
  $("metricFinals").textContent = afd.finals.length;
}

function renderGraph() {
  const svg = $("automatonSvg");
  const n = afd.states.length;

  if (!n) {
    svg.innerHTML = `<text x="340" y="130" text-anchor="middle" fill="#9db4ce" font-size="13">Define los estados y el alfabeto, o carga el ejemplo A2, para ver la gráfica.</text>`;
    return;
  }
  const cx = 340;
  const cy = 125;
  const rx = Math.min(235, 70 + n * 38);
  const ry = 75;

  const pos = {};
  afd.states.forEach((s, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    pos[s] = {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  });

  const p0 = pos[afd.initial];
  let out = `
    <defs>
      <marker id="arrowBlue" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="#48c8ed"/>
      </marker>
      <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="#6685a9"/>
      </marker>
    </defs>
    <path d="M ${p0.x - 58} ${p0.y} L ${p0.x - 31} ${p0.y}" stroke="#48c8ed" stroke-width="1.8" fill="none" marker-end="url(#arrowBlue)"/>
  `;

  for (const s of afd.states) {
    for (const sym of afd.alphabet) {
      const t = afd.transitions[s]?.[sym];
      if (!t || !pos[t]) continue;

      const p = pos[s];
      const q = pos[t];

      if (s === t) {
        out += `
          <path d="M ${p.x - 12} ${p.y - 20} C ${p.x - 42} ${p.y - 68}, ${p.x + 42} ${p.y - 68}, ${p.x + 12} ${p.y - 20}" stroke="#6685a9" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
          <text x="${p.x}" y="${p.y - 61}" text-anchor="middle" fill="#9db4ce" font-size="11">${escapeXml(sym)}</text>
        `;
      } else {
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const sx = p.x + ux * 24 - uy * 8;
        const sy = p.y + uy * 24 + ux * 8;
        const ex = q.x - ux * 26 - uy * 8;
        const ey = q.y - uy * 26 + ux * 8;
        const mx = (sx + ex) / 2 - uy * 13;
        const my = (sy + ey) / 2 + ux * 13;

        out += `
          <path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="#6685a9" stroke-width="1.4" fill="none" marker-end="url(#arrow)"/>
          <text x="${mx}" y="${my - 5}" text-anchor="middle" fill="#a8bdd5" font-size="11">${escapeXml(sym)}</text>
        `;
      }
    }
  }

  for (const s of afd.states) {
    const p = pos[s];
    const isFinal = afd.finals.includes(s);
    const isInitial = s === afd.initial;
    const strokeColor = isInitial ? "#45c8ec" : isFinal ? "#a58bff" : "#54718f";

    out += `<circle cx="${p.x}" cy="${p.y}" r="22" fill="${isInitial ? "#123b51" : "#172b43"}" stroke="${strokeColor}" stroke-width="1.8"/>`;
    if (isFinal) {
      out += `<circle cx="${p.x}" cy="${p.y}" r="17" fill="none" stroke="#a58bff" stroke-width="1.2"/>`;
    }
    out += `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" fill="#eaf5ff" font-family="DM Mono" font-size="11">${escapeXml(s)}</text>`;
  }

  svg.innerHTML = out;
}

function evaluate(word) {
  let state = afd.initial;
  const trace = [{ state, symbol: "Inicio" }];

  for (let i = 0; i < word.length; i++) {
    const sym = word[i];
    if (!afd.alphabet.includes(sym)) {
      return { valid: false, invalid: sym, index: i + 1, trace };
    }

    const next = afd.transitions[state]?.[sym];
    if (!next) {
      return { valid: false, invalid: sym, index: i + 1, trace };
    }

    state = next;
    trace.push({ state, symbol: sym });
  }

  return {
    valid: true,
    accepted: afd.finals.includes(state),
    state,
    trace,
  };
}

function runEvaluation() {
  if (!hasAutomaton()) {
    $("resultArea").className = "result-area empty-result";
    $("resultArea").innerHTML =
      '<span class="result-symbol">⌁</span><span>Primero define un autómata o carga el ejemplo A2.</span>';
    $("traceArea").classList.add("hidden");
    return;
  }
  const word = $("wordInput").value.trim();
  const result = evaluate(word);
  lastTrace = result.trace;

  const area = $("resultArea");
  const traceArea = $("traceArea");

  if (!result.valid) {
    area.className = "result-area invalid";
    area.innerHTML = `<span class="result-symbol">!</span><span><strong>Cadena no válida.</strong> El símbolo «${escapeXml(result.invalid)}» en la posición ${result.index} no pertenece al alfabeto Σ.</span>`;
    traceArea.classList.add("hidden");
    return;
  }

  area.className = `result-area ${result.accepted ? "accepted" : "rejected"}`;
  area.innerHTML = `
    <span class="result-symbol">${result.accepted ? "✓" : "×"}</span>
    <span>
      <strong>${result.accepted ? "Cadena aceptada" : "Cadena rechazada"}.</strong>
      ${word ? `La cadena «${escapeXml(word)}»` : "La palabra vacía"} terminó en el estado <b>${escapeXml(result.state)}</b>,
      ${result.accepted ? "que pertenece" : "que no pertenece"} a F.
    </span>
  `;

  traceArea.classList.remove("hidden");
  $("traceSummary").textContent = `${result.trace.length - 1} TRANSICIONES`;
  $("traceSteps").innerHTML = result.trace
    .map(
      (step, i) => `
      ${i ? `<span class="trace-arrow">—${escapeXml(step.symbol)}→</span>` : ""}
      <span class="trace-node ${i === result.trace.length - 1 ? "current" : ""} ${afd.finals.includes(step.state) ? "final" : ""}">
        ${escapeXml(step.state)}
      </span>`
    )
    .join("");
}

function generateWords() {
  if (!hasAutomaton()) {
    $("generatedList").innerHTML =
      '<div class="empty-list">Primero define un autómata o carga el ejemplo A2.</div>';
    return;
  }
  const wanted = Number($("wordCount").value);
  const max = Number($("maxLength").value);
  const found = [];
  let level = [""];

  for (let len = 0; len <= max && found.length < wanted; len++) {
    for (const w of level) {
      const res = evaluate(w);
      if (res.valid && res.accepted) {
        found.push(w || "ε");
        if (found.length >= wanted) break;
      }
    }
    level = level.flatMap((w) => afd.alphabet.map((a) => w + a));
  }

  $("generatedList").innerHTML = found.length
    ? found.map((w) => `<span class="generated-word">${escapeXml(w)}</span>`).join("")
    : `<div class="empty-list">No se encontraron palabras aceptadas con esa longitud máxima.</div>`;
}

function loadExample() {
  afd = structuredClone(defaultAfd);
  loadForm();
  $("wordInput").value = "abab";
  runEvaluation();
  showToast("Ejemplo A2 cargado.");
}

function resetAll() {
  afd = structuredClone(emptyAfd);
  loadForm();
  $("configError").classList.add("hidden");
  $("wordInput").value = "";
  $("resultArea").className = "result-area empty-result";
  $("resultArea").innerHTML =
    '<span class="result-symbol">⌁</span><span>Esperando una cadena para evaluar...</span>';
  $("traceArea").classList.add("hidden");
  $("generatedList").innerHTML =
    '<div class="empty-list">Pulsa «Generar» para encontrar palabras aceptadas.</div>';
}

function exportJson() {
  const payload = {
    states: afd.states,
    alphabet: afd.alphabet,
    initial: afd.initial,
    finals: afd.finals,
    transitions: afd.transitions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mi-automata-afd.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Archivo JSON exportado.");
}

const navTargets = {
  simulator: "testSection",
  generator: "generatedList",
  theory: "tupleDisplay",
};

document.querySelectorAll(".nav-item").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const targetId = navTargets[btn.dataset.view] || "statesInput";
    $(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  })
);

$("applyBtn").addEventListener("click", applyChanges);
$("loadExample").addEventListener("click", loadExample);
$("evaluateBtn").addEventListener("click", runEvaluation);
$("wordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runEvaluation();
});
$("generateBtn").addEventListener("click", generateWords);
$("resetBtn").addEventListener("click", resetAll);
$("exportBtn").addEventListener("click", exportJson);
$("fitGraph").addEventListener("click", renderGraph);

loadForm();
runEvaluation();
generateWords();