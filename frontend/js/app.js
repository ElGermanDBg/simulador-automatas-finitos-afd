/* ============================================================================
 * Simulador de Autómatas Finitos (AFD) - Interfaz web simple de 3 módulos
 * Conectado a src/servidor_web.py (clase Automata en src/simulador_afd.py).
 * ============================================================================ */

const $ = (id) => document.getElementById(id);

const OFFICIAL_PRESETS = {
  A1: {
    label: "A1: Par de ceros (ε)",
    states: ["q0", "q1"],
    alphabet: ["0", "1"],
    initial: "q0",
    finals: ["q0"],
    transitions: { q0: { 0: "q1", 1: "q0" }, q1: { 0: "q0", 1: "q1" } },
  },
  A2: {
    label: "A2: Terminan en ab",
    states: ["s0", "s1", "s2"],
    alphabet: ["a", "b"],
    initial: "s0",
    finals: ["s2"],
    transitions: {
      s0: { a: "s1", b: "s0" },
      s1: { a: "s1", b: "s2" },
      s2: { a: "s1", b: "s0" },
    },
  },
  A3: {
    label: "A3: Solo ab y ba",
    states: ["p0", "p1", "p2", "p3", "m"],
    alphabet: ["a", "b"],
    initial: "p0",
    finals: ["p3"],
    transitions: {
      p0: { a: "p1", b: "p2" },
      p1: { a: "m", b: "p3" },
      p2: { a: "p3", b: "m" },
      p3: { a: "m", b: "m" },
      m: { a: "m", b: "m" },
    },
  },
  A4: {
    label: "A4: Ninguna palabra",
    states: ["q0", "q1"],
    alphabet: ["a"],
    initial: "q0",
    finals: ["q1"],
    transitions: { q0: { a: "q0" }, q1: { a: "q1" } },
  },
};

const emptyAfd = () => ({ states: [], alphabet: [], initial: "", finals: [], transitions: {} });

let afd = emptyAfd();
let draftFinals = [];
let draftTransitions = {};
let isBuilt = false;
let useBackend = false;
let nodePositions = {};
let draggingNode = null;

let animState = {
  active: false,
  word: "",
  steps: [],
  step: 0,
  valid: true,
  accepted: false,
  errorSymbol: null,
  errorPos: null,
  timer: null,
};

const hasAutomaton = () => isBuilt && afd.states.length > 0 && afd.alphabet.length > 0;
const setText = (list) => (list.length ? `{${list.join(", ")}}` : "∅");
const parseRawList = (value) => value.split(",").map((x) => x.trim()).filter(Boolean);

const escapeXml = (s) =>
  String(s).replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

function findDuplicates(list) {
  const seen = new Set();
  const dups = [];
  for (const item of list) {
    if (seen.has(item) && !dups.includes(item)) dups.push(item);
    seen.add(item);
  }
  return dups;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function showConfigError(msg) {
  $("configError").textContent = msg;
  $("configError").classList.remove("hidden");
}

function clearConfigMessages() {
  $("configError").classList.add("hidden");
  $("configWarning").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Conexión opcional con el servidor Python
// ---------------------------------------------------------------------------
async function detectBackend() {
  if (!window.location.protocol.startsWith("http")) {
    $("engineStatus").textContent = "Modo local";
    return;
  }
  try {
    const resp = await fetch("/api/status");
    if (resp.ok) {
      const data = await resp.json();
      if (data.ok && data.motor === "python") {
        useBackend = true;
        $("engineStatus").textContent = "Motor Python activo";
        if (data.tiene_automata && data.automata) {
          syncFromBackendData(data.automata, []);
        }
        return;
      }
    }
  } catch {
    // Fallback local
  }
  $("engineStatus").textContent = "Modo local";
}

function normalizeData(data) {
  return {
    states: data.Q || data.states || [],
    alphabet: data.Sigma || data.alphabet || [],
    initial: data.q0 ?? data.initial ?? "",
    finals: data.F || data.finals || [],
    transitions: data.delta || data.transitions || {},
  };
}

// ---------------------------------------------------------------------------
// Navegación entre los 3 módulos (pestañas)
// ---------------------------------------------------------------------------
function switchTab(tabId) {
  if ((tabId === "mod2" || tabId === "mod3") && !hasAutomaton()) {
    showToast("Primero construye un autómata en el Módulo 1.");
    return;
  }

  ["mod1", "mod2", "mod3"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== tabId);
  });
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  if (tabId === "mod2") {
    generateWords();
  } else if (tabId === "mod3") {
    $("wordInput").focus();
  }
}

// ---------------------------------------------------------------------------
// Módulo 1: Validación y construcción paso a paso
// ---------------------------------------------------------------------------
function validateDefinition(states, alphabet, initial, finals, transitions) {
  const errors = [];
  const warnings = [];

  if (!states.length) {
    errors.push("Debes ingresar al menos un estado en Q.");
    return { errors, warnings };
  }
  const repStates = findDuplicates(states);
  if (repStates.length) {
    errors.push(`Estados repetidos en Q: ${repStates.join(", ")}.`);
  }
  if (states.some((s) => /\s/.test(s))) {
    errors.push("Los nombres de estado no deben contener espacios.");
  }

  if (!alphabet.length) {
    errors.push("Debes ingresar al menos un símbolo en Σ.");
    return { errors, warnings };
  }
  const longSymbols = alphabet.filter((s) => s.length !== 1);
  if (longSymbols.length) {
    errors.push(`Cada símbolo de Σ debe ser de un único carácter. Inválidos: ${longSymbols.join(", ")}.`);
  }
  const repSymbols = findDuplicates(alphabet);
  if (repSymbols.length) {
    errors.push(`Símbolos repetidos en Σ: ${repSymbols.join(", ")}.`);
  }

  if (!initial || !states.includes(initial)) {
    errors.push("El estado inicial q₀ debe pertenecer a Q.");
  }
  for (const f of finals) {
    if (!states.includes(f)) errors.push(`El estado final '${f}' no pertenece a Q.`);
  }
  if (!errors.length && finals.length === 0) {
    warnings.push("Advertencia: no marcaste ningún estado final (F = ∅). El autómata no reconocerá ninguna palabra.");
  }

  if (!errors.length) {
    for (const s of states) {
      for (const sym of alphabet) {
        const dest = transitions[s]?.[sym];
        if (!dest || !states.includes(dest)) {
          errors.push(`La transición δ(${s}, ${sym}) debe ir a un estado de Q.`);
        }
      }
    }
  }
  return { errors, warnings };
}

function readDraftFromInputs() {
  const rawStates = parseRawList($("statesInput").value);
  const rawAlpha = parseRawList($("alphabetInput").value);
  return {
    rawStates,
    rawAlpha,
    uniqueStates: [...new Set(rawStates)],
    uniqueAlpha: [...new Set(rawAlpha.filter((s) => s.length === 1))],
  };
}

function captureTableSelections() {
  document.querySelectorAll("#transitionBody select[data-state]").forEach((sel) => {
    const s = sel.dataset.state;
    const sym = sel.dataset.symbol;
    if (!draftTransitions[s]) draftTransitions[s] = {};
    draftTransitions[s][sym] = sel.value;
  });
}

function renderBuilderControls() {
  const { uniqueStates, uniqueAlpha } = readDraftFromInputs();
  const prevInitial = $("initialSelect").value;
  const activeInitial = uniqueStates.includes(prevInitial)
    ? prevInitial
    : uniqueStates.includes(afd.initial)
      ? afd.initial
      : uniqueStates[0] || "";

  $("initialSelect").innerHTML = uniqueStates.length
    ? uniqueStates
        .map((s) => `<option value="${escapeXml(s)}" ${s === activeInitial ? "selected" : ""}>${escapeXml(s)}</option>`)
        .join("")
    : `<option value="">Define Q primero</option>`;

  draftFinals = draftFinals.filter((f) => uniqueStates.includes(f));
  $("finalChips").innerHTML = uniqueStates.length
    ? uniqueStates
        .map((s) => {
          const sel = draftFinals.includes(s) ? "selected" : "";
          return `<button type="button" class="chip ${sel}" data-final="${escapeXml(s)}">${escapeXml(s)}</button>`;
        })
        .join("")
    : `<span class="empty-text">Define Q primero</span>`;

  $("finalChips").querySelectorAll("button[data-final]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const st = btn.dataset.final;
      draftFinals = draftFinals.includes(st) ? draftFinals.filter((x) => x !== st) : [...draftFinals, st];
      renderBuilderControls();
    });
  });

  renderTransitionInputs(uniqueStates, uniqueAlpha, activeInitial, draftFinals);
}

function renderTransitionInputs(statesList, alphaList, initialState, finalsList) {
  const head = $("transitionHead");
  const body = $("transitionBody");

  if (!statesList.length || !alphaList.length) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td style="color:#475569; text-align:center;">Ingresa estados en Q y símbolos en Σ para definir δ.</td></tr>`;
    return;
  }

  head.innerHTML = `
    <tr>
      <th>Estado</th>
      ${alphaList.map((sym) => `<th>${escapeXml(sym)}</th>`).join("")}
    </tr>
  `;

  body.innerHTML = statesList
    .map((s) => {
      const mark = s === initialState && finalsList.includes(s)
        ? "→* "
        : s === initialState
          ? "→ "
          : finalsList.includes(s)
            ? "* "
            : "";
      return `
        <tr>
          <td>${escapeXml(mark + s)}</td>
          ${alphaList
            .map((sym) => {
              const saved = draftTransitions[s]?.[sym] ?? afd.transitions[s]?.[sym];
              const chosen = statesList.includes(saved) ? saved : statesList[0];
              return `
                <td>
                  <select data-state="${escapeXml(s)}" data-symbol="${escapeXml(sym)}">
                    ${statesList
                      .map((t) => `<option value="${escapeXml(t)}" ${t === chosen ? "selected" : ""}>${escapeXml(t)}</option>`)
                      .join("")}
                  </select>
                </td>
              `;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");
}

async function applyChanges() {
  clearConfigMessages();
  captureTableSelections();

  const { rawStates, rawAlpha } = readDraftFromInputs();
  const initial = $("initialSelect").value;
  const finals = [...draftFinals];
  const transitions = {};

  for (const s of rawStates) {
    transitions[s] = {};
    for (const sym of rawAlpha) {
      transitions[s][sym] = draftTransitions[s]?.[sym] ?? rawStates[0];
    }
  }

  const { errors, warnings } = validateDefinition(rawStates, rawAlpha, initial, finals, transitions);
  if (errors.length) {
    showConfigError(errors[0]);
    return;
  }

  if (useBackend) {
    try {
      const resp = await fetch("/api/automata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Q: rawStates, Sigma: rawAlpha, delta: transitions, q0: initial, F: finals }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        showConfigError(data.error || "Error al validar el autómata.");
        return;
      }
      syncFromBackendData(data.automata, data.advertencias || []);
      showToast("Autómata construido.");
      return;
    } catch {
      useBackend = false;
      $("engineStatus").textContent = "Modo local";
    }
  }

  commitAutomaton({ states: rawStates, alphabet: rawAlpha, initial, finals, transitions }, warnings);
  showToast("Autómata construido.");
}

function syncFromBackendData(data, warnings) {
  const norm = normalizeData(data);
  $("statesInput").value = norm.states.join(", ");
  $("alphabetInput").value = norm.alphabet.join(", ");
  draftFinals = [...norm.finals];
  draftTransitions = structuredClone(norm.transitions);
  renderBuilderControls();
  commitAutomaton(norm, warnings);
}

function commitAutomaton(newAfd, warnings) {
  afd = structuredClone(newAfd);
  isBuilt = true;
  nodePositions = {};
  stopAnimation(false);

  if (warnings.length) {
    $("configWarning").textContent = warnings[0];
    $("configWarning").classList.remove("hidden");
  }

  renderFormalSection();
  renderGraph();
  renderQuickSigma();
  clearModuleOutputs();
}

// ---------------------------------------------------------------------------
// 5-tupla y Tabla formal
// ---------------------------------------------------------------------------
function renderFormalSection() {
  if (!hasAutomaton()) {
    $("tupleDisplay").textContent = "M = (∅, ∅, δ, —, ∅)";
    $("formalTableWrap").innerHTML = "";
    return;
  }

  $("tupleDisplay").textContent = `M = (${setText(afd.states)}, ${setText(afd.alphabet)}, δ, ${afd.initial}, ${setText(afd.finals)})`;
  $("formalTableWrap").innerHTML = `
    <table class="formal-table">
      <thead>
        <tr>
          <th>Estado</th>
          ${afd.alphabet.map((sym) => `<th>${escapeXml(sym)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${afd.states
          .map((s) => {
            const isIni = s === afd.initial;
            const isFin = afd.finals.includes(s);
            const mark = isIni && isFin ? "→* " : isIni ? "→  " : isFin ? "*  " : "   ";
            return `
              <tr>
                <td>${escapeXml(mark + s)}</td>
                ${afd.alphabet.map((sym) => `<td>${escapeXml(afd.transitions[s]?.[sym] || "—")}</td>`).join("")}
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Gráfica SVG (Figura 2 y Figura 3 sobre tema claro legible)
// ---------------------------------------------------------------------------
function computeNodePositions(force = false) {
  const n = afd.states.length;
  if (!n) return;

  afd.states.forEach((s, i) => {
    if (!force && nodePositions[s]) return;
    if (n === 1) {
      nodePositions[s] = { x: 360, y: 195 };
    } else if (n <= 4) {
      const marginX = 145;
      const span = 720 - 2 * marginX;
      nodePositions[s] = { x: marginX + (i * span) / (n - 1), y: 195 };
    } else {
      const angle = Math.PI + (2 * Math.PI * i) / n;
      nodePositions[s] = {
        x: 375 + 230 * Math.cos(angle),
        y: 195 + 95 * Math.sin(angle),
      };
    }
  });
}

function renderGraph() {
  const svg = $("automatonSvg");
  if (!hasAutomaton()) {
    svg.innerHTML = `<text x="360" y="175" text-anchor="middle" fill="#64748b" font-size="14">Construye un autómata en el Módulo 1 (o elige un ejemplo) para ver la gráfica.</text>`;
    return;
  }

  computeNodePositions(false);
  const R = 25;

  // Agrupar símbolos que van del mismo origen al mismo destino ("a, b")
  const grouped = {};
  for (const s of afd.states) {
    for (const sym of afd.alphabet) {
      const t = afd.transitions[s]?.[sym];
      if (!t || !nodePositions[t]) continue;
      const key = `${s}-->${t}`;
      if (!grouped[key]) grouped[key] = { origin: s, target: t, symbols: [] };
      grouped[key].symbols.push(sym);
    }
  }

  const activeEdges = {};
  let activeNode = null;
  if (animState.active) {
    activeNode = afd.initial;
    const limit = Math.min(animState.step, animState.steps.length);
    for (let i = 0; i < limit; i++) {
      const [u, , v] = animState.steps[i];
      const key = `${u}-->${v}`;
      if (!activeEdges[key]) activeEdges[key] = [];
      activeEdges[key].push(i + 1);
      activeNode = v;
    }
  }

  let out = `
    <defs>
      <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="#334155"/>
      </marker>
      <marker id="arrowActive" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6" fill="#ea580c"/>
      </marker>
    </defs>
  `;

  // Flecha inicial hacia q0
  const p0 = nodePositions[afd.initial];
  if (p0) {
    out += `<path d="M ${p0.x - R - 45} ${p0.y} L ${p0.x - R - 4} ${p0.y}" stroke="#1e3a8a" stroke-width="2.2" fill="none" marker-end="url(#arrow)"/>`;
  }

  let badgesSvg = "";

  for (const key of Object.keys(grouped)) {
    const { origin: u, target: v, symbols } = grouped[key];
    const label = symbols.join(", ");
    const p = nodePositions[u];
    const q = nodePositions[v];
    const stepNums = activeEdges[key] || [];
    const highlighted = stepNums.length > 0;
    const stroke = highlighted ? "#ea580c" : "#334155";
    const sw = highlighted ? "2.8" : "1.7";
    const marker = highlighted ? "url(#arrowActive)" : "url(#arrow)";
    const textFill = highlighted ? "#c2410c" : "#0f172a";

    if (u === v) {
      const x1 = p.x - 11;
      const y1 = p.y - R + 2;
      const x2 = p.x + 11;
      const y2 = p.y - R + 2;
      const cx1 = p.x - 38;
      const cy1 = p.y - R - 58;
      const cx2 = p.x + 38;
      const cy2 = p.y - R - 58;
      out += `
        <path d="M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" stroke="${stroke}" stroke-width="${sw}" fill="none" marker-end="${marker}"/>
        <text x="${p.x}" y="${p.y - R - 48}" text-anchor="middle" fill="${textFill}" font-family="monospace" font-size="13" font-weight="700">${escapeXml(label)}</text>
      `;
      stepNums.forEach((num, idx) => {
        badgesSvg += renderStepBadge(p.x + 22 + idx * 19, p.y - R - 52, num);
      });
    } else {
      const hasReverse = Boolean(grouped[`${v}-->${u}`]);
      const idxU = afd.states.indexOf(u);
      const idxV = afd.states.indexOf(v);
      const jumpsMid = afd.states.length <= 4 && Math.abs(idxU - idxV) > 1;

      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;

      let curve = 0;
      if (hasReverse) curve = 30;
      else if (jumpsMid) curve = idxU > idxV ? 92 : -92;

      if (curve === 0) {
        const sx = p.x + ux * R;
        const sy = p.y + uy * R;
        const ex = q.x - ux * (R + 4);
        const ey = q.y - uy * (R + 4);
        const lx = (sx + ex) / 2 + nx * 14;
        const ly = (sy + ey) / 2 + ny * 14;

        out += `
          <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${stroke}" stroke-width="${sw}" marker-end="${marker}"/>
          <text x="${lx}" y="${ly}" text-anchor="middle" fill="${textFill}" font-family="monospace" font-size="13" font-weight="700">${escapeXml(label)}</text>
        `;
        stepNums.forEach((num, idx) => {
          badgesSvg += renderStepBadge((sx + ex) / 2 - nx * 16 + idx * 19, (sy + ey) / 2 - ny * 16, num);
        });
      } else {
        const mx = (p.x + q.x) / 2 + nx * curve;
        const my = (p.y + q.y) / 2 + ny * curve;
        const d1x = mx - p.x;
        const d1y = my - p.y;
        const l1 = Math.hypot(d1x, d1y) || 1;
        const sx = p.x + (d1x / l1) * R;
        const sy = p.y + (d1y / l1) * R;

        const d2x = q.x - mx;
        const d2y = q.y - my;
        const l2 = Math.hypot(d2x, d2y) || 1;
        const ex = q.x - (d2x / l2) * (R + 4);
        const ey = q.y - (d2y / l2) * (R + 4);

        const bx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
        const by = 0.25 * sy + 0.5 * my + 0.25 * ey;
        const off = curve > 0 ? 14 : -11;
        const lx = bx + nx * off;
        const ly = by + ny * off;

        out += `
          <path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="${stroke}" stroke-width="${sw}" fill="none" marker-end="${marker}"/>
          <text x="${lx}" y="${ly}" text-anchor="middle" fill="${textFill}" font-family="monospace" font-size="13" font-weight="700">${escapeXml(label)}</text>
        `;
        stepNums.forEach((num, idx) => {
          const bOff = off + (curve > 0 ? 15 : -15);
          badgesSvg += renderStepBadge(bx + nx * bOff + idx * 19, by + ny * bOff, num);
        });
      }
    }
  }

  const finishedValid = animState.active && animState.valid && animState.step === animState.steps.length;
  for (const s of afd.states) {
    const p = nodePositions[s];
    const isFinal = afd.finals.includes(s);
    const isActive = animState.active && activeNode === s;

    let fill = "#ffffff";
    let stroke = "#1e3a8a";
    let sw = "2";

    if (isActive && finishedValid) {
      fill = animState.accepted ? "#dcfce7" : "#fee2e2";
      stroke = animState.accepted ? "#15803d" : "#b91c1c";
      sw = "2.8";
    } else if (isActive) {
      fill = "#ffedd5";
      stroke = "#ea580c";
      sw = "2.8";
    }

    out += `<g class="svg-node" data-node="${escapeXml(s)}">`;
    out += `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (isFinal) {
      out += `<circle cx="${p.x}" cy="${p.y}" r="${R - 5}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    out += `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="13" font-weight="700" pointer-events="none">${escapeXml(s)}</text>`;
    out += `</g>`;
  }

  svg.innerHTML = out + badgesSvg;

  svg.querySelectorAll(".svg-node").forEach((g) => {
    g.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      draggingNode = g.dataset.node;
    });
  });
}

function renderStepBadge(x, y, num) {
  return `
    <g>
      <circle cx="${x}" cy="${y}" r="9" fill="#ea580c" stroke="#ffffff" stroke-width="1.3"/>
      <text x="${x}" y="${y + 3.5}" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="10" font-weight="700">${num}</text>
    </g>
  `;
}

window.addEventListener("mousemove", (e) => {
  if (!draggingNode) return;
  const svg = $("automatonSvg");
  if (!svg.createSVGPoint || !svg.getScreenCTM) return;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const loc = pt.matrixTransform(ctm.inverse());
  nodePositions[draggingNode] = {
    x: Math.max(40, Math.min(680, loc.x)),
    y: Math.max(40, Math.min(300, loc.y)),
  };
  renderGraph();
});

window.addEventListener("mouseup", () => {
  draggingNode = null;
});

// ---------------------------------------------------------------------------
// Lógica de evaluación y orden canónico (respaldo local equivalente a Python)
// ---------------------------------------------------------------------------
function formatTraceStr(steps, initial) {
  if (!steps.length) return initial;
  return initial + steps.map(([, sym, dest]) => ` -${sym}→ ${dest}`).join("");
}

function evaluateLocal(word) {
  if (word === "") {
    const esFinal = afd.finals.includes(afd.initial);
    return {
      valida: true,
      error_simbolo: null,
      error_posicion: null,
      recorrido_pasos: [],
      estado_final: afd.initial,
      es_final: esFinal,
      aceptada: esFinal,
      recorrido_str: afd.initial,
    };
  }

  let current = afd.initial;
  const steps = [];

  for (let i = 0; i < word.length; i++) {
    const sym = word[i];
    if (!afd.alphabet.includes(sym)) {
      return {
        valida: false,
        error_simbolo: sym,
        error_posicion: i + 1,
        recorrido_pasos: steps,
        estado_final: current,
        es_final: afd.finals.includes(current),
        aceptada: false,
        recorrido_str: formatTraceStr(steps, afd.initial),
      };
    }
    const next = afd.transitions[current]?.[sym];
    steps.push([current, sym, next]);
    current = next;
  }

  const esFinal = afd.finals.includes(current);
  return {
    valida: true,
    error_simbolo: null,
    error_posicion: null,
    recorrido_pasos: steps,
    estado_final: current,
    es_final: esFinal,
    aceptada: esFinal,
    recorrido_str: formatTraceStr(steps, afd.initial),
  };
}

function generateWordsLocal(wanted = 5, maxLen = 10) {
  const found = [];
  if (!afd.finals.length) {
    return {
      tupla_str: `M = (${setText(afd.states)}, ${setText(afd.alphabet)}, δ, ${afd.initial}, ∅)`,
      palabras: [],
      mensaje: `Este autómata no reconoce ninguna palabra de longitud menor o igual que ${maxLen}. (El conjunto de estados finales F está vacío).`,
    };
  }

  let level = [""];
  for (let len = 0; len <= maxLen && found.length < wanted; len++) {
    for (const w of level) {
      const res = evaluateLocal(w);
      if (res.valida && res.aceptada) {
        found.push({
          palabra: w,
          palabra_repr: w === "" ? "ε" : w,
          recorrido_str: res.recorrido_str,
          longitud: len,
        });
        if (found.length >= wanted) break;
      }
    }
    if (len < maxLen && found.length < wanted) {
      level = level.flatMap((w) => afd.alphabet.map((a) => w + a));
    }
  }

  let mensaje = "";
  if (found.length === 0) {
    mensaje = `Este autómata no reconoce ninguna palabra de longitud menor o igual que ${maxLen}.`;
  } else if (found.length < wanted) {
    const lbl = found.length === 1 ? "palabra" : "palabras";
    mensaje = `Este autómata solo reconoce ${found.length} ${lbl} de longitud menor o igual que ${maxLen}.`;
  }

  return {
    tupla_str: `M = (${setText(afd.states)}, ${setText(afd.alphabet)}, δ, ${afd.initial}, ${setText(afd.finals)})`,
    palabras: found,
    mensaje,
  };
}

// ---------------------------------------------------------------------------
// Módulo 2: Cinco palabras reconocidas (fijo: 5 palabras, longitud <= 10)
// ---------------------------------------------------------------------------
async function generateWords() {
  if (!hasAutomaton()) return;

  let data;
  if (useBackend) {
    try {
      const resp = await fetch("/api/modulo2?cantidad=5&max_longitud=10");
      if (resp.ok) data = await resp.json();
    } catch {
      useBackend = false;
    }
  }
  if (!data) data = generateWordsLocal(5, 10);

  $("generatedTuple").textContent = `Autómata: ${data.tupla_str}`;
  $("generatedTuple").classList.remove("hidden");

  if (!data.palabras.length) {
    $("generatedList").innerHTML = "";
    $("generatedMessage").textContent = data.mensaje;
    $("generatedMessage").classList.remove("hidden");
    return;
  }

  $("generatedList").innerHTML = data.palabras
    .map(
      (item, i) => `
      <div class="word-row">
        <div>
          <span>${i + 1}.</span>
          <span class="word-badge">${escapeXml(item.palabra_repr)}</span>
          <span class="word-trace">recorrido: ${escapeXml(item.recorrido_str)}</span>
        </div>
        <button type="button" class="btn btn-sm" data-play-word="${escapeXml(item.palabra)}">Ver en gráfica</button>
      </div>
    `
    )
    .join("");

  $("generatedList").querySelectorAll("button[data-play-word]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("wordInput").value = btn.dataset.playWord;
      runEvaluation(false);
    });
  });

  if (data.mensaje) {
    $("generatedMessage").textContent = data.mensaje;
    $("generatedMessage").classList.remove("hidden");
  } else {
    $("generatedMessage").classList.add("hidden");
  }
}

// ---------------------------------------------------------------------------
// Módulo 3: Probar palabras + Animación Figura 3
// ---------------------------------------------------------------------------
function renderQuickSigma() {
  $("quickSigma").innerHTML = hasAutomaton()
    ? afd.alphabet
        .map((sym) => `<button type="button" class="chip" data-ins="${escapeXml(sym)}">${escapeXml(sym)}</button>`)
        .join("")
    : `<span class="empty-text">—</span>`;

  $("quickSigma").querySelectorAll("button[data-ins]").forEach((b) => {
    b.addEventListener("click", () => {
      $("wordInput").value += b.dataset.ins;
      $("wordInput").focus();
    });
  });
}

async function runEvaluation(recordHistory = true) {
  if (!hasAutomaton()) {
    showToast("Primero construye un autómata en el Módulo 1.");
    return;
  }

  // No hacer .trim(): un espacio es un símbolo inválido si no está en Σ
  const word = $("wordInput").value;

  let res;
  if (useBackend) {
    try {
      const resp = await fetch("/api/modulo3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadena: word }),
      });
      if (resp.ok) res = await resp.json();
    } catch {
      useBackend = false;
    }
  }
  if (!res) res = evaluateLocal(word);

  const area = $("resultArea");
  const traceArea = $("traceArea");
  const wordLabel = word === "" ? "ε (palabra vacía)" : `"${escapeXml(word)}"`;

  area.classList.remove("hidden");
  if (!res.valida) {
    area.className = "result no";
    area.innerHTML = `<strong>La palabra ${wordLabel} NO es reconocida:</strong> el símbolo "${escapeXml(res.error_simbolo)}" (posición ${res.error_posicion}) no pertenece al alfabeto Σ = {${escapeXml(afd.alphabet.join(", "))}}.`;
    traceArea.classList.add("hidden");
  } else {
    area.className = `result ${res.aceptada ? "ok" : "no"}`;
    area.innerHTML = `
      <strong>La palabra ${wordLabel} ${res.aceptada ? "SÍ" : "NO"} es reconocida.</strong>
      Estado final: <b>${escapeXml(res.estado_final)}</b> (${res.es_final ? "pertenece a F" : "no pertenece a F"}).
    `;

    traceArea.classList.remove("hidden");
    const nodes = [{ state: afd.initial, symbol: "" }].concat(
      res.recorrido_pasos.map(([, sym, dest]) => ({ state: dest, symbol: sym }))
    );
    $("traceSteps").innerHTML = nodes
      .map(
        (st, i) => `
        ${i ? `<span>-${escapeXml(st.symbol)}→</span>` : ""}
        <span class="trace-node ${i === nodes.length - 1 ? "current" : ""}">${escapeXml(st.state)}</span>
      `
      )
      .join("");
  }

  if (recordHistory) addHistoryItem(word, res);
  startAnimation(word, res);
}

function addHistoryItem(word, res) {
  $("historyWrap").classList.remove("hidden");
  const item = document.createElement("div");
  item.className = "history-item";
  const label = word === "" ? "ε" : `"${word}"`;
  item.innerHTML = `
    <span>${escapeXml(label)} → ${escapeXml(res.recorrido_str)}</span>
    <span class="${res.aceptada ? "badge-ok" : "badge-no"}">${res.aceptada ? "RECONOCIDA" : "RECHAZADA"}</span>
  `;
  item.addEventListener("click", () => {
    $("wordInput").value = word;
    runEvaluation(false);
  });
  $("testHistory").prepend(item);
}

function startAnimation(word, res) {
  stopAnimTimer();
  animState = {
    active: true,
    word,
    steps: res.recorrido_pasos || [],
    step: 0,
    valid: res.valida,
    accepted: res.aceptada,
    errorSymbol: res.error_simbolo,
    errorPos: res.error_posicion,
    timer: null,
  };
  $("traceAnimBar").classList.remove("hidden");
  updateAnimUI();

  const maxStep = animState.valid ? animState.steps.length : animState.steps.length + 1;
  if (maxStep > 0) playAnimation();
}

function stopAnimTimer() {
  if (animState.timer) clearInterval(animState.timer);
  animState.timer = null;
}

function playAnimation() {
  stopAnimTimer();
  const maxStep = animState.valid ? animState.steps.length : animState.steps.length + 1;
  if (animState.step >= maxStep) animState.step = 0;
  updateAnimUI();
  $("animPlayBtn").textContent = "⏸ Pausar";

  animState.timer = setInterval(() => {
    if (animState.step < maxStep) {
      animState.step++;
      updateAnimUI();
    } else {
      stopAnimTimer();
      $("animPlayBtn").textContent = "▶ Animar";
    }
  }, 850);
}

function stopAnimation(redraw = true) {
  stopAnimTimer();
  animState.active = false;
  $("traceAnimBar").classList.add("hidden");
  $("animPlayBtn").textContent = "▶ Animar";
  if (redraw) renderGraph();
}

function updateAnimUI() {
  const maxValid = animState.steps.length;
  let txt = "";
  if (animState.word === "") {
    txt = animState.accepted
      ? `Palabra vacía ε: se queda en ${afd.initial} (∈ F) → RECONOCIDA.`
      : `Palabra vacía ε: se queda en ${afd.initial} (∉ F) → RECHAZADA.`;
  } else if (animState.step === 0) {
    txt = `Inicio (Paso 0): comienza en ${afd.initial}.`;
  } else if (animState.step <= maxValid) {
    const [u, sym, v] = animState.steps[animState.step - 1];
    txt = `Paso ${animState.step}/${animState.word.length}: en ${u} lee '${sym}' → pasa a ${v}.`;
    if (animState.step === maxValid && animState.valid) {
      txt += animState.accepted ? " (Estado final: RECONOCIDA)" : " (No es final: RECHAZADA)";
    }
  } else {
    txt = `Error en posición ${animState.errorPos}: '${animState.errorSymbol}' no pertenece a Σ.`;
  }
  $("animStepText").textContent = txt;
  renderGraph();
}

// ---------------------------------------------------------------------------
// Reiniciar, Ejemplos bajo demanda y Exportar/Importar JSON
// ---------------------------------------------------------------------------
function clearModuleOutputs() {
  $("generatedTuple").classList.add("hidden");
  $("generatedMessage").classList.add("hidden");
  $("generatedList").innerHTML = "";
  $("resultArea").classList.add("hidden");
  $("traceArea").classList.add("hidden");
  $("testHistory").innerHTML = "";
  $("historyWrap").classList.add("hidden");
}

async function resetAll() {
  afd = emptyAfd();
  draftFinals = [];
  draftTransitions = {};
  isBuilt = false;
  nodePositions = {};
  stopAnimation(false);
  clearConfigMessages();

  $("statesInput").value = "";
  $("alphabetInput").value = "";
  $("wordInput").value = "";
  $("presetSelect").value = "";

  if (useBackend) {
    try {
      await fetch("/api/automata", { method: "DELETE" });
    } catch {
      // ignore
    }
  }

  renderBuilderControls();
  renderFormalSection();
  renderGraph();
  renderQuickSigma();
  clearModuleOutputs();
  switchTab("mod1");
  showToast("Simulador reiniciado.");
}

async function loadOfficialPreset(code) {
  const preset = OFFICIAL_PRESETS[code];
  if (!preset) return;
  $("statesInput").value = preset.states.join(", ");
  $("alphabetInput").value = preset.alphabet.join(", ");
  draftFinals = [...preset.finals];
  draftTransitions = structuredClone(preset.transitions);
  renderBuilderControls();
  $("initialSelect").value = preset.initial;
  await applyChanges();
  $("presetSelect").value = "";
  showToast(`Cargado ${preset.label}`);
}

function exportJson() {
  if (!hasAutomaton()) {
    showToast("Primero construye un autómata para poder exportarlo.");
    return;
  }
  const payload = { Q: afd.states, Sigma: afd.alphabet, delta: afd.transitions, q0: afd.initial, F: afd.finals };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "automata_afd.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Guardado en automata_afd.json.");
}

function importJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const raw = JSON.parse(e.target.result);
      const norm = normalizeData(raw);
      const { errors } = validateDefinition(norm.states, norm.alphabet, norm.initial, norm.finals, norm.transitions);
      if (errors.length) {
        showConfigError(errors[0]);
        return;
      }
      $("statesInput").value = norm.states.join(", ");
      $("alphabetInput").value = norm.alphabet.join(", ");
      draftFinals = [...norm.finals];
      draftTransitions = structuredClone(norm.transitions);
      renderBuilderControls();
      $("initialSelect").value = norm.initial;
      await applyChanges();
      showToast(`Importado desde ${file.name}.`);
    } catch (err) {
      showConfigError(`Archivo JSON inválido: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

$("statesInput").addEventListener("input", () => {
  captureTableSelections();
  renderBuilderControls();
});
$("alphabetInput").addEventListener("input", () => {
  captureTableSelections();
  renderBuilderControls();
});
$("initialSelect").addEventListener("change", () => {
  captureTableSelections();
  const { uniqueStates, uniqueAlpha } = readDraftFromInputs();
  renderTransitionInputs(uniqueStates, uniqueAlpha, $("initialSelect").value, draftFinals);
});
$("presetSelect").addEventListener("change", (e) => {
  if (e.target.value) loadOfficialPreset(e.target.value);
});

$("applyBtn").addEventListener("click", applyChanges);
$("resetBtn").addEventListener("click", resetAll);
$("exportBtn").addEventListener("click", exportJson);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (e) => {
  importJsonFile(e.target.files[0]);
  e.target.value = "";
});

$("fitGraph").addEventListener("click", () => {
  computeNodePositions(true);
  renderGraph();
});
$("evaluateBtn").addEventListener("click", () => runEvaluation(true));
$("testEmptyBtn").addEventListener("click", () => {
  $("wordInput").value = "";
  runEvaluation(true);
});
$("wordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runEvaluation(true);
});
$("clearHistoryBtn").addEventListener("click", () => {
  $("testHistory").innerHTML = "";
  $("historyWrap").classList.add("hidden");
});

$("animFirstBtn").addEventListener("click", () => {
  stopAnimTimer();
  $("animPlayBtn").textContent = "▶ Animar";
  animState.step = 0;
  updateAnimUI();
});
$("animPrevBtn").addEventListener("click", () => {
  stopAnimTimer();
  $("animPlayBtn").textContent = "▶ Animar";
  animState.step = Math.max(0, animState.step - 1);
  updateAnimUI();
});
$("animNextBtn").addEventListener("click", () => {
  stopAnimTimer();
  $("animPlayBtn").textContent = "▶ Animar";
  const maxStep = animState.valid ? animState.steps.length : animState.steps.length + 1;
  animState.step = Math.min(maxStep, animState.step + 1);
  updateAnimUI();
});
$("animPlayBtn").addEventListener("click", () => {
  if (animState.timer) {
    stopAnimTimer();
    $("animPlayBtn").textContent = "▶ Animar";
  } else {
    playAnimation();
  }
});
$("animClearBtn").addEventListener("click", () => stopAnimation(true));

// Inicialización en blanco
renderBuilderControls();
renderFormalSection();
renderGraph();
renderQuickSigma();
detectBackend();
