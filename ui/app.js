/* eslint-disable no-alert */
const apostasTextEl = document.getElementById("apostasText");
const resultadoTextEl = document.getElementById("resultadoText");
const apostasFileEl = document.getElementById("apostasFile");
const resultadoFileEl = document.getElementById("resultadoFile");
const outputEl = document.getElementById("output");
const alertsEl = document.getElementById("alerts");
const resultadoHeaderEl = document.getElementById("resultadoHeader");

const compareBtn = document.getElementById("compareBtn");
const resetBtn = document.getElementById("resetBtn");
const apostasSampleBtn = document.getElementById("apostasSample");
const resultadoSampleBtn = document.getElementById("resultadoSample");
const apostasClearBtn = document.getElementById("apostasClear");
const resultadoClearBtn = document.getElementById("resultadoClear");

const SAMPLE_APOSTAS = `# Exemplos de apostas (uma por linha)
05 12 23 34 45 56
01, 02, 03, 04, 05, 06
07 12 13 14 15 16
`;

const SAMPLE_RESULTADO = `# Resultado oficial (uma linha válida)
05 12 23 34 45 56
`;

function setAlerts(alerts) {
  alertsEl.innerHTML = "";
  for (const a of alerts) {
    const div = document.createElement("div");
    div.className = `alert ${a.kind === "danger" ? "alert-danger" : "alert-ok"}`;
    div.textContent = a.message;
    alertsEl.appendChild(div);
  }
}

function clearOutput() {
  outputEl.innerHTML = "";
  resultadoHeaderEl.textContent = "Ainda não comparado.";
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

function splitOnDelims(s) {
  // separa por espaço, tab, vírgula e ponto-e-vírgula
  return s.split(/[,\s;]+/g).filter((p) => p.trim() !== "");
}

function parseNumbers(s) {
  const parts = splitOnDelims(s);
  const nums = [];
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (!Number.isFinite(n) || String(n) !== String(Number.parseInt(p, 10))) {
      // fallback: valida token original (ex.: "05" deve ser válido)
      if (!/^-?\d+$/.test(p)) {
        throw new Error(`número "${p}" não é um inteiro válido`);
      }
    }
    if (!/^-?\d+$/.test(p)) {
      throw new Error(`número "${p}" não é um inteiro válido`);
    }
    nums.push(Number.parseInt(p, 10));
  }
  return nums;
}

function validateUniquePositive(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (n <= 0) throw new Error(`número ${n} inválido (esperado > 0)`);
    if (seen.has(n)) throw new Error(`número ${n} repetido`);
    seen.add(n);
  }
}

function formatNums(nums) {
  const cp = [...nums].sort((a, b) => a - b);
  return cp.map((n) => String(n).padStart(2, "0")).join(" ");
}

function normalizeLines(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
}

function readApostasFromText(text) {
  const lines = normalizeLines(text);
  const apostas = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trim = raw.trim();
    if (trim === "" || trim.startsWith("#")) continue;

    let nums;
    try {
      nums = parseNumbers(trim);
    } catch (e) {
      throw new Error(`linha ${i + 1} inválida: ${e.message} (conteúdo: "${raw}")`);
    }
    if (nums.length === 0) {
      throw new Error(`linha ${i + 1} inválida: nenhum número encontrado (conteúdo: "${raw}")`);
    }
    try {
      validateUniquePositive(nums);
    } catch (e) {
      throw new Error(`linha ${i + 1} inválida: ${e.message} (conteúdo: "${raw}")`);
    }

    apostas.push({ lineNo: i + 1, raw, nums });
  }

  if (apostas.length === 0) {
    throw new Error("arquivo de apostas não contém apostas válidas (linhas vazias/comentários não contam)");
  }
  return apostas;
}

function readResultadoFromText(text) {
  const lines = normalizeLines(text);
  const valid = [];
  for (const raw0 of lines) {
    const raw = raw0.trim();
    if (raw === "" || raw.startsWith("#")) continue;
    valid.push(raw);
  }

  if (valid.length === 0) {
    throw new Error("arquivo de resultado não contém números válidos (linhas vazias/comentários não contam)");
  }
  if (valid.length > 1) {
    throw new Error(`arquivo de resultado possui ${valid.length} linhas válidas; esperado apenas 1`);
  }

  const line = valid[0];
  const nums = parseNumbers(line);
  if (nums.length === 0) throw new Error("resultado inválido: nenhum número encontrado");
  validateUniquePositive(nums);
  return nums;
}

function compareAll(apostas, resultado) {
  const set = new Set(resultado);
  return apostas.map((a) => a.nums.reduce((acc, n) => acc + (set.has(n) ? 1 : 0), 0));
}

function formatAcertos(n) {
  return n === 1 ? "1 acerto" : `${n} acertos`;
}

function renderResults(apostas, resultado, acertos) {
  resultadoHeaderEl.textContent = `Resultado: ${formatNums(resultado)}`;
  outputEl.innerHTML = "";

  for (let i = 0; i < apostas.length; i++) {
    const row = document.createElement("div");
    row.className = "result-row";

    const left = document.createElement("div");
    left.innerHTML = `<strong>Aposta ${i + 1}:</strong> ${formatAcertos(acertos[i])}`;

    const right = document.createElement("div");
    right.className = "badge";
    right.innerHTML = `linha <code>${apostas[i].lineNo}</code>`;

    row.appendChild(left);
    row.appendChild(right);
    outputEl.appendChild(row);
  }
}

async function onFileChosen(fileEl, targetTextEl) {
  const file = fileEl.files && fileEl.files[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    targetTextEl.value = text;
    setAlerts([{ kind: "ok", message: `Arquivo carregado: ${file.name}` }]);
  } catch (e) {
    setAlerts([{ kind: "danger", message: e.message || String(e) }]);
  } finally {
    // permite escolher o mesmo arquivo novamente
    fileEl.value = "";
  }
}

apostasFileEl.addEventListener("change", () => onFileChosen(apostasFileEl, apostasTextEl));
resultadoFileEl.addEventListener("change", () => onFileChosen(resultadoFileEl, resultadoTextEl));

apostasSampleBtn.addEventListener("click", () => {
  apostasTextEl.value = SAMPLE_APOSTAS;
});
resultadoSampleBtn.addEventListener("click", () => {
  resultadoTextEl.value = SAMPLE_RESULTADO;
});
apostasClearBtn.addEventListener("click", () => {
  apostasTextEl.value = "";
});
resultadoClearBtn.addEventListener("click", () => {
  resultadoTextEl.value = "";
});

resetBtn.addEventListener("click", () => {
  apostasTextEl.value = "";
  resultadoTextEl.value = "";
  setAlerts([]);
  clearOutput();
});

compareBtn.addEventListener("click", () => {
  setAlerts([]);
  clearOutput();

  try {
    const apostas = readApostasFromText(apostasTextEl.value);
    const resultado = readResultadoFromText(resultadoTextEl.value);
    const acertos = compareAll(apostas, resultado);
    renderResults(apostas, resultado, acertos);
    setAlerts([{ kind: "ok", message: "Comparação concluída." }]);
  } catch (e) {
    setAlerts([{ kind: "danger", message: e.message || String(e) }]);
  }
});


