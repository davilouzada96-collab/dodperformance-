(() => {
  const params = new URLSearchParams(window.location.search);
  const API_BASE = params.get("apiBase") || "";
  const BUILD_ID = "20260316-1345";

  const canvas = document.getElementById("holoCanvas");
  const sceneSelect = document.getElementById("sceneSelect");
  const dataModeSelect = document.getElementById("dataModeSelect");
  const brainKindFilter = document.getElementById("brainKindFilter");
  const brainSearchInput = document.getElementById("brainSearchInput");
  const rebuildBtn = document.getElementById("rebuildBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  const statusScene = document.getElementById("statusScene");
  const statusMode = document.getElementById("statusMode");
  const statusLoss = document.getElementById("statusLoss");
  const statusSteps = document.getElementById("statusSteps");
  const statusPredictions = document.getElementById("statusPredictions");
  const statusInfo = document.getElementById("statusInfo");
  const brainDetail = document.getElementById("brainDetail");
  const brainSelectionMode = document.getElementById("brainSelectionMode");
  const brainRegionName = document.getElementById("brainRegionName");
  const brainRegionType = document.getElementById("brainRegionType");
  const brainRegionRole = document.getElementById("brainRegionRole");
  const brainRegionNotes = document.getElementById("brainRegionNotes");
  const brainRegionBName = document.getElementById("brainRegionBName");
  const brainRegionBType = document.getElementById("brainRegionBType");
  const brainRegionBRole = document.getElementById("brainRegionBRole");
  const brainRegionBNotes = document.getElementById("brainRegionBNotes");
  const brainCompareToggle = document.getElementById("brainCompareToggle");
  const brainClearSelection = document.getElementById("brainClearSelection");
  const brainExportJson = document.getElementById("brainExportJson");
  const brainExportMd = document.getElementById("brainExportMd");

  const state = {
    sceneName: params.get("scene") || "brain",
    dataMode: params.get("mode") || "api",
    running: true,
    group: null,
    update: null,
    buildToken: 0,
    xorRefreshBusy: false,
    xorTrainer: null,
    brainEntries: [],
    brainPickables: [],
    brainSelections: [],
    brainHighlights: [],
    brainCompareMode: params.get("compare") === "1",
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    brainFilterKind: params.get("brainKind") || "all",
    brainSearchQuery: params.get("brainSearch") || "",
  };

  sceneSelect.value = state.sceneName;
  dataModeSelect.value = state.dataMode;
  if (brainKindFilter) brainKindFilter.value = state.brainFilterKind;
  if (brainSearchInput) brainSearchInput.value = state.brainSearchQuery;
  if (brainCompareToggle) {
    brainCompareToggle.textContent = `comparar: ${state.brainCompareMode ? "on" : "off"}`;
  }
  state.raycaster.params.Points.threshold = 0.3;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1200);
  camera.position.set(0, 0.8, 15);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 45;

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const keyLight = new THREE.PointLight(0x9fc4ff, 0.85, 200, 2);
  keyLight.position.set(6, 10, 8);
  scene.add(keyLight);

  const stars = buildStars(1500, 80);
  scene.add(stars);

  function setInfo(text) {
    statusInfo.textContent = `${text} | build ${BUILD_ID}`;
  }

  function clearBrainDetail() {
    if (brainDetail) brainDetail.hidden = true;
    if (brainSelectionMode) brainSelectionMode.textContent = "Modo simples";
    if (brainRegionName) brainRegionName.textContent = "-";
    if (brainRegionType) brainRegionType.textContent = "-";
    if (brainRegionRole) brainRegionRole.textContent = "-";
    if (brainRegionNotes) brainRegionNotes.textContent = "-";
    if (brainRegionBName) brainRegionBName.textContent = "-";
    if (brainRegionBType) brainRegionBType.textContent = "-";
    if (brainRegionBRole) brainRegionBRole.textContent = "-";
    if (brainRegionBNotes) brainRegionBNotes.textContent = "-";
  }

  function setBrainCompareToggleLabel() {
    if (!brainCompareToggle) return;
    brainCompareToggle.textContent = `comparar: ${state.brainCompareMode ? "on" : "off"}`;
  }

  function describeBrainRegion(region) {
    const id = String(region?.id || "").toLowerCase();
    const isDiencephalon = String(region?.kind || "") === "diencephalon";
    const macro = String(region?.parent || "").toLowerCase();

    let dominantFunction = "Integracao de sinais neurais em rede.";
    let associatedSystem = "Rede cortico-subcortical integrada.";
    let clinicalApplications = "Mapeamento funcional geral, monitoramento cognitivo e planejamento de reabilitacao.";

    if (id.includes("frontal") || macro === "frontal") {
      dominantFunction = "Planejamento, controle executivo, decisao e programacao motora.";
      associatedSystem = "Sistema executivo fronto-estriatal e controle motor voluntario.";
      clinicalApplications = "Apoio a triagem de TDAH, funcoes executivas, sequelas frontais e reabilitacao cognitiva.";
    } else if (id.includes("parietal") || macro === "parietal") {
      dominantFunction = "Integracao somatossensorial, atencao espacial e esquema corporal.";
      associatedSystem = "Sistema somatossensorial dorsal e rede de orientacao visuoespacial.";
      clinicalApplications = "Analise de negligencia espacial, parestesias, apraxias e treino de propriocepcao.";
    } else if (id.includes("temporal") || macro === "temporal") {
      dominantFunction = "Processamento auditivo, memoria e reconhecimento de padroes.";
      associatedSystem = "Sistema auditivo-temporal e memoria medial temporal.";
      clinicalApplications = "Investigacao de linguagem, memoria episodica, epilepsia temporal e neuroreabilitacao.";
    } else if (id.includes("occipital") || macro === "occipital") {
      dominantFunction = "Processamento visual primario e associativo.";
      associatedSystem = "Sistema visual occipital e vias ventral/dorsal.";
      clinicalApplications = "Correlacao com alteracoes visuais corticais, agnosias e treinamento visuoperceptivo.";
    } else if (id.includes("insula") || macro === "insula") {
      dominantFunction = "Interocepcao, saliencia e integracao autonoma-emocional.";
      associatedSystem = "Rede de saliencia e regulacao neurovegetativa.";
      clinicalApplications = "Estudos de dor cronica, ansiedade, disfuncao autonoma e biofeedback.";
    } else if (id.includes("limbic") || macro === "limbic") {
      dominantFunction = "Memoria emocional, motivacao e consolidacao de experiencias.";
      associatedSystem = "Sistema limbico (cingulado-hipocampal-amigdalar).";
      clinicalApplications = "Avaliacao de transtornos do humor, trauma, memoria e modulacao emocional.";
    } else if (id.includes("thalamus") || macro === "thalamus") {
      dominantFunction = "Retransmissao sensorial e modulacao cortico-subcortical.";
      associatedSystem = "Sistema talamocortical de gating de informacao.";
      clinicalApplications = "Correlacao com alteracoes de consciencia, dor central e integracao sensorial.";
    } else if (id.includes("hypothalamus") || macro === "hypothalamus") {
      dominantFunction = "Homeostase, controle endocrino e regulacao autonoma.";
      associatedSystem = "Sistema neuroendocrino e eixo hipotalamo-hipofise.";
      clinicalApplications = "Mapeamento para disturbios hormonais, sono, apetite e termorregulacao.";
    } else if (id.includes("epithalamus") || macro === "epithalamus") {
      dominantFunction = "Ritmo circadiano e modulacao neuroendocrina.";
      associatedSystem = "Sistema pineal-habenular e regulacao cronobiologica.";
      clinicalApplications = "Suporte a analise de sono, cronodisrupcao e variacoes de humor sazonais.";
    } else if (id.includes("subthalamus") || macro === "subthalamus") {
      dominantFunction = "Ajuste fino do circuito motor dos ganglios da base.";
      associatedSystem = "Sistema cortico-basal com modulacao subtalamica.";
      clinicalApplications = "Estudos de Parkinson, tremor e planejamento de alvos para DBS.";
    }

    return {
      typeLabel: isDiencephalon ? "Tipo: Diencefalo" : "Tipo: Lobo cortical",
      dominantFunction,
      associatedSystem,
      clinicalApplications,
      role: dominantFunction,
      notes: clinicalApplications,
    };
  }

  function fillBrainSlot(region, nameEl, typeEl, roleEl, notesEl, slotLabel) {
    if (!nameEl || !typeEl || !roleEl || !notesEl) return;

    if (!region) {
      nameEl.textContent = `${slotLabel}: -`;
      typeEl.textContent = "-";
      roleEl.textContent = "-";
      notesEl.textContent = "-";
      return;
    }

    const info = describeBrainRegion(region);
    const subregions = Array.isArray(region.subregions) ? region.subregions : [];
    const parent = region.parent ? ` | Macro: ${region.parent}` : "";

    nameEl.textContent = `${slotLabel}: ${region.label || region.id || "desconhecida"}`;
    typeEl.textContent = `${info.typeLabel}${parent}`;
    roleEl.textContent = `Funcao dominante: ${info.dominantFunction} | Sistema associado: ${info.associatedSystem}`;
    notesEl.textContent = `Aplicacoes clinicas: ${info.clinicalApplications} | Sub-regioes: ${subregions.join(", ") || "sem definicao"}`;
  }

  function renderBrainDetail(regionA, regionB = null) {
    if ((!regionA && !regionB) || !brainDetail) {
      clearBrainDetail();
      return;
    }

    brainDetail.hidden = false;
    if (brainSelectionMode) {
      brainSelectionMode.textContent = state.brainCompareMode
        ? "Modo comparacao ativo (A + B)."
        : "Modo simples (A). Use comparar ou Shift+clique para adicionar B.";
    }

    fillBrainSlot(regionA, brainRegionName, brainRegionType, brainRegionRole, brainRegionNotes, "Regiao A");
    fillBrainSlot(regionB, brainRegionBName, brainRegionBType, brainRegionBRole, brainRegionBNotes, "Regiao B");
  }

  function regionToExportPayload(region, slot) {
    const info = describeBrainRegion(region || {});
    return {
      slot,
      id: region?.id || "",
      label: region?.label || "",
      kind: region?.kind || "",
      parent: region?.parent || "",
      center: region?.center || [],
      subregions: Array.isArray(region?.subregions) ? region.subregions : [],
      dominant_function: info.dominantFunction,
      associated_system: info.associatedSystem,
      clinical_applications: info.clinicalApplications,
      role: info.role,
      notes: info.notes,
    };
  }

  function downloadTextFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportBrainSelectionAsJson() {
    if (state.sceneName !== "brain_map") {
      setInfo("Exportacao disponivel na cena Mapa cortical.");
      return;
    }

    const regions = state.brainSelections.map((entry, index) => regionToExportPayload(entry?.region, index === 0 ? "A" : "B"));
    if (regions.length === 0) {
      setInfo("Selecione ao menos uma regiao para exportar.");
      return;
    }

    const payload = {
      exported_at: new Date().toISOString(),
      compare_mode: state.brainCompareMode,
      filter_kind: state.brainFilterKind,
      search_query: state.brainSearchQuery,
      regions,
    };
    downloadTextFile("cortex_ficha_regioes.json", `${JSON.stringify(payload, null, 2)}\n`, "application/json");
    setInfo("Ficha JSON exportada.");
  }

  function exportBrainSelectionAsMarkdown() {
    if (state.sceneName !== "brain_map") {
      setInfo("Exportacao disponivel na cena Mapa cortical.");
      return;
    }

    const regions = state.brainSelections.map((entry, index) => regionToExportPayload(entry?.region, index === 0 ? "A" : "B"));
    if (regions.length === 0) {
      setInfo("Selecione ao menos uma regiao para exportar.");
      return;
    }

    const lines = [
      "# Ficha Cortex",
      "",
      `- Exportado em: ${new Date().toISOString()}`,
      `- Modo comparacao: ${state.brainCompareMode ? "ON" : "OFF"}`,
      `- Filtro: ${state.brainFilterKind}`,
      `- Busca: ${state.brainSearchQuery || "(vazia)"}`,
      "",
    ];

    regions.forEach((region) => {
      lines.push(`## Regiao ${region.slot}: ${region.label || region.id}`);
      lines.push(`- Tipo: ${region.kind}`);
      lines.push(`- Macro: ${region.parent || "-"}`);
      lines.push(`- Funcao dominante: ${region.dominant_function || region.role}`);
      lines.push(`- Sistema associado: ${region.associated_system || "-"}`);
      lines.push(`- Aplicacoes clinicas: ${region.clinical_applications || region.notes}`);
      lines.push(`- Sub-regioes: ${region.subregions.join(", ") || "-"}`);
      lines.push(`- Notas: ${region.notes}`);
      lines.push("");
    });

    downloadTextFile("cortex_ficha_regioes.md", `${lines.join("\n")}\n`, "text/markdown");
    setInfo("Ficha Markdown exportada.");
  }

  function resetStatusXor() {
    statusLoss.textContent = "-";
    statusSteps.textContent = "-";
    statusPredictions.textContent = "predicoes: -";
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  function clearGroup() {
    state.brainHighlights.forEach((halo) => {
      scene.remove(halo);
      disposeObject(halo);
    });
    state.brainHighlights = [];
    state.brainEntries = [];
    state.brainPickables = [];
    state.brainSelections = [];
    clearBrainDetail();

    if (!state.group) return;
    scene.remove(state.group);
    disposeObject(state.group);
    state.group = null;
    state.update = null;
  }

  function disposeObject(object) {
    object.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach((mat) => mat.dispose());
        else node.material.dispose();
      }
    });
  }

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} em ${path}`);
    }
    return response.json();
  }

  function buildStars(count, spread) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      pos[idx] = (Math.random() - 0.5) * spread;
      pos[idx + 1] = (Math.random() - 0.5) * spread;
      pos[idx + 2] = (Math.random() - 0.5) * spread;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.PointsMaterial({ color: 0x5d7ebf, size: 0.04, transparent: true, opacity: 0.6 });
    return new THREE.Points(geometry, material);
  }

  function generateSphereData(radius = 6.0, latLines = 24, lonLines = 28) {
    const nodes = [];
    const edges = [];

    for (let i = 0; i < latLines; i += 1) {
      const lat = Math.PI * (-0.5 + i / (latLines - 1));
      for (let j = 0; j < lonLines; j += 1) {
        const lon = 2 * Math.PI * (j / lonLines);
        const x = radius * Math.cos(lat) * Math.cos(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.sin(lon);
        nodes.push([x, y, z]);
      }
    }

    for (let i = 0; i < latLines; i += 1) {
      for (let j = 0; j < lonLines; j += 1) {
        const p1 = i * lonLines + j;
        const p2 = i * lonLines + ((j + 1) % lonLines);
        edges.push([p1, p2]);
        if (i < latLines - 1) {
          edges.push([p1, (i + 1) * lonLines + j]);
        }
      }
    }

    return { nodes, edges, radius };
  }

  function defaultPulseNamedTopology() {
    const namedRegions = [
      { id: "frontal", label: "Frontal", color: "#6bc7ff", position: [0.0, 3.2, 2.1] },
      { id: "parietal", label: "Parietal", color: "#8ea8ff", position: [0.0, 4.2, -0.1] },
      { id: "temporal", label: "Temporal", color: "#5b93ff", position: [0.0, 1.1, 2.9] },
      { id: "occipital", label: "Occipital", color: "#8a7fff", position: [0.0, 2.5, -3.1] },
      { id: "thalamus", label: "Talamo", color: "#ff8973", position: [0.0, 1.8, 0.6] },
    ];

    const namedConnectors = [
      ["thalamus", "frontal"],
      ["thalamus", "parietal"],
      ["thalamus", "temporal"],
      ["thalamus", "occipital"],
    ];

    return { namedRegions, namedConnectors };
  }

  function buildTextSprite(label, color = "#e5efff") {
    const canvasEl = document.createElement("canvas");
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return null;

    const fontSize = 44;
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const padding = 18;
    const textWidth = Math.ceil(ctx.measureText(label).width);
    canvasEl.width = textWidth + (padding * 2);
    canvasEl.height = fontSize + (padding * 2);

    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(label, padding, canvasEl.height / 2);

    const texture = new THREE.CanvasTexture(canvasEl);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    const ratio = canvasEl.width / Math.max(canvasEl.height, 1);
    sprite.scale.set(1.4 * ratio, 1.4, 1);
    return sprite;
  }

  function generatePulseNetwork(neuronCount = 140, connectionDistance = 2.7) {
    const { namedRegions, namedConnectors } = defaultPulseNamedTopology();
    const regionCenters = namedRegions.map((region) => region.position);
    const nodes = [];
    for (let i = 0; i < neuronCount; i += 1) {
      const center = regionCenters[Math.floor(Math.random() * regionCenters.length)];
      nodes.push([
        center[0] + ((Math.random() - 0.5) * 2.3),
        center[1] + ((Math.random() - 0.5) * 2.1),
        center[2] + ((Math.random() - 0.5) * 2.5),
      ]);
    }

    const edges = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[i][0] - nodes[j][0];
        const dy = nodes[i][1] - nodes[j][1];
        const dz = nodes[i][2] - nodes[j][2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < connectionDistance && Math.random() < 0.33) {
          edges.push([i, j]);
        }
      }
    }

    if (edges.length === 0) edges.push([0, 1]);
    return { nodes, edges, named_regions: namedRegions, named_connectors: namedConnectors };
  }

  function gaussianRandom() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function generateBrainAnatomyData(density = 1.0) {
    const safeDensity = Math.min(Math.max(density, 0.45), 2.0);
    const lobeLeftDefs = [
      { key: "frontal", label: "Lobo frontal", color: "#5CCBFF", center: [-3.75, 2.35, 1.35], radii: [2.05, 1.25, 1.45], count: 300 },
      { key: "parietal", label: "Lobo parietal", color: "#7EA9FF", center: [-3.15, 3.28, -0.35], radii: [1.75, 1.18, 1.45], count: 255 },
      { key: "temporal", label: "Lobo temporal", color: "#4D8FFF", center: [-3.9, 1.05, 2.55], radii: [1.85, 0.96, 1.45], count: 240 },
      { key: "occipital", label: "Lobo occipital", color: "#7A7BFF", center: [-5.15, 2.28, -2.55], radii: [1.45, 1.06, 1.18], count: 220 },
      { key: "insula", label: "Insula", color: "#55C1A7", center: [-2.35, 1.95, 1.3], radii: [0.8, 0.62, 0.64], count: 120 },
      { key: "limbic", label: "Lobo limbico", color: "#41D9C4", center: [-2.55, 1.45, 0.35], radii: [1.15, 0.68, 0.78], count: 160 },
    ];

    const defs = [];
    lobeLeftDefs.forEach((base) => {
      defs.push({
        id: `${base.key}_left`,
        label: `${base.label} (E)`,
        kind: "lobe",
        color: base.color,
        center: base.center.slice(),
        radii: base.radii.slice(),
        count: base.count,
      });
      defs.push({
        id: `${base.key}_right`,
        label: `${base.label} (D)`,
        kind: "lobe",
        color: base.color,
        center: [Math.abs(base.center[0]), base.center[1], base.center[2]],
        radii: base.radii.slice(),
        count: base.count,
      });
    });

    defs.push(
      { id: "thalamus_left", label: "Talamo (E)", kind: "diencephalon", color: "#FF7E6D", center: [-0.72, 1.45, 0.62], radii: [0.56, 0.46, 0.42], count: 110 },
      { id: "thalamus_right", label: "Talamo (D)", kind: "diencephalon", color: "#FF7E6D", center: [0.72, 1.45, 0.62], radii: [0.56, 0.46, 0.42], count: 110 },
      { id: "hypothalamus", label: "Hipotalamo", kind: "diencephalon", color: "#FF4E68", center: [0.0, 0.55, 1.05], radii: [0.45, 0.29, 0.34], count: 95 },
      { id: "epithalamus", label: "Epitalamo", kind: "diencephalon", color: "#FFAA64", center: [0.0, 2.05, 0.2], radii: [0.35, 0.26, 0.29], count: 80 },
      { id: "subthalamus_left", label: "Subtalamo (E)", kind: "diencephalon", color: "#FF9360", center: [-0.48, 0.95, 0.86], radii: [0.3, 0.23, 0.24], count: 75 },
      { id: "subthalamus_right", label: "Subtalamo (D)", kind: "diencephalon", color: "#FF9360", center: [0.48, 0.95, 0.86], radii: [0.3, 0.23, 0.24], count: 75 },
    );

    const subregionCatalog = {
      frontal: ["Pre-frontal dorsolateral", "Premotor", "Motor primario"],
      parietal: ["Somatossensorial primaria", "Associacao parietal posterior"],
      temporal: ["Cortex auditivo", "Temporal medial (memoria)"],
      occipital: ["Visual primaria (V1)", "Visual associativa"],
      insula: ["Insula anterior", "Insula posterior"],
      limbic: ["Cingulado", "Hipocampal"],
      thalamus: ["Nucleo anterior", "Nucleo ventral lateral", "Pulvinar"],
      hypothalamus: ["Area pre-optica", "Regiao tuberal", "Corpo mamilar"],
      epithalamus: ["Habenula", "Glandula pineal"],
      subthalamus: ["Nucleo subtalamico"],
    };

    function parentRegion(regionId) {
      if (regionId.startsWith("subthalamus")) return "subthalamus";
      if (regionId.startsWith("thalamus")) return "thalamus";
      if (regionId.startsWith("hypothalamus")) return "hypothalamus";
      if (regionId.startsWith("epithalamus")) return "epithalamus";
      return regionId.split("_")[0];
    }

    const centers = {};
    const regions = defs.map((item) => {
      const parent = parentRegion(item.id);
      const count = Math.max(45, Math.floor(item.count * safeDensity));
      const nodes = [];
      for (let i = 0; i < count; i += 1) {
        const px = item.center[0] + gaussianRandom() * item.radii[0] * 0.52;
        const py = item.center[1] + gaussianRandom() * item.radii[1] * 0.52;
        let pz = item.center[2] + gaussianRandom() * item.radii[2] * 0.52;
        pz += 0.15 * Math.sin(py * 1.15);
        nodes.push([px, py, pz]);
      }
      centers[item.id] = item.center.slice();
      return {
        id: item.id,
        label: item.label,
        kind: item.kind,
        parent,
        subregions: subregionCatalog[parent] || [],
        color: item.color,
        center: item.center.slice(),
        radii: item.radii.slice(),
        nodes,
      };
    });

    const connectorPairs = [
      ["thalamus_left", "frontal_left"],
      ["thalamus_left", "parietal_left"],
      ["thalamus_left", "temporal_left"],
      ["thalamus_left", "occipital_left"],
      ["thalamus_right", "frontal_right"],
      ["thalamus_right", "parietal_right"],
      ["thalamus_right", "temporal_right"],
      ["thalamus_right", "occipital_right"],
      ["hypothalamus", "thalamus_left"],
      ["hypothalamus", "thalamus_right"],
      ["epithalamus", "thalamus_left"],
      ["epithalamus", "thalamus_right"],
      ["subthalamus_left", "thalamus_left"],
      ["subthalamus_right", "thalamus_right"],
    ];

    const connectors = connectorPairs.map(([a, b]) => ({
      from_id: a,
      to_id: b,
      from: centers[a],
      to: centers[b],
    }));
    return {
      regions,
      connectors,
      meta: {
        lobe_regions: 12,
        diencephalon_components: ["Talamo", "Hipotalamo", "Epitalamo", "Subtalamo"],
        subregion_catalog: subregionCatalog,
      },
    };
  }

  function createXorTrainer() {
    const X = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const y = [0, 1, 1, 0];
    const lr = 0.25;
    const W1 = randomMatrix(2, 4, 0.8);
    const W2 = randomMatrix(4, 1, 0.8);
    let steps = 0;

    function sigmoid(x) {
      return 1 / (1 + Math.exp(-x));
    }

    function trainEpochs(epochs) {
      for (let epoch = 0; epoch < epochs; epoch += 1) {
        const hidden = [];
        const out = [];

        for (let i = 0; i < X.length; i += 1) {
          const h = [];
          for (let j = 0; j < 4; j += 1) {
            h.push(sigmoid(X[i][0] * W1[0][j] + X[i][1] * W1[1][j]));
          }
          hidden.push(h);
          out.push(sigmoid(h[0] * W2[0][0] + h[1] * W2[1][0] + h[2] * W2[2][0] + h[3] * W2[3][0]));
        }

        const dOut = [];
        for (let i = 0; i < out.length; i += 1) {
          const err = y[i] - out[i];
          dOut.push(err * out[i] * (1 - out[i]));
        }

        const dHidden = [];
        for (let i = 0; i < hidden.length; i += 1) {
          const row = [];
          for (let j = 0; j < 4; j += 1) {
            row.push(dOut[i] * W2[j][0] * hidden[i][j] * (1 - hidden[i][j]));
          }
          dHidden.push(row);
        }

        for (let j = 0; j < 4; j += 1) {
          let grad = 0;
          for (let i = 0; i < hidden.length; i += 1) grad += hidden[i][j] * dOut[i];
          W2[j][0] += lr * grad;
        }

        for (let inIdx = 0; inIdx < 2; inIdx += 1) {
          for (let hIdx = 0; hIdx < 4; hIdx += 1) {
            let grad = 0;
            for (let sample = 0; sample < X.length; sample += 1) {
              grad += X[sample][inIdx] * dHidden[sample][hIdx];
            }
            W1[inIdx][hIdx] += lr * grad;
          }
        }

        steps += 1;
      }
    }

    function snapshot() {
      const predictions = [];
      let loss = 0;
      for (let i = 0; i < X.length; i += 1) {
        const h = [];
        for (let j = 0; j < 4; j += 1) {
          h.push(sigmoid(X[i][0] * W1[0][j] + X[i][1] * W1[1][j]));
        }
        const out = sigmoid(h[0] * W2[0][0] + h[1] * W2[1][0] + h[2] * W2[2][0] + h[3] * W2[3][0]);
        predictions.push(out);
        const err = y[i] - out;
        loss += err * err;
      }

      return {
        W1: W1.map((row) => row.slice()),
        W2: W2.map((row) => row.slice()),
        predictions,
        loss: loss / X.length,
        steps,
      };
    }

    return {
      trainEpochs,
      snapshot,
    };
  }

  function randomMatrix(rows, cols, scale) {
    const matrix = [];
    for (let i = 0; i < rows; i += 1) {
      const row = [];
      for (let j = 0; j < cols; j += 1) {
        row.push((Math.random() * 2 - 1) * scale);
      }
      matrix.push(row);
    }
    return matrix;
  }

  function buildEdgeLines(nodes, edges, color, opacity = 0.75) {
    const data = new Float32Array(edges.length * 6);
    for (let i = 0; i < edges.length; i += 1) {
      const [a, b] = edges[i];
      const p1 = nodes[a];
      const p2 = nodes[b];
      const idx = i * 6;
      data[idx] = p1[0];
      data[idx + 1] = p1[1];
      data[idx + 2] = p1[2];
      data[idx + 3] = p2[0];
      data[idx + 4] = p2[1];
      data[idx + 5] = p2[2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.LineSegments(geometry, material);
  }

  function buildNodePoints(nodes, color, size = 0.09, opacity = 0.95) {
    const data = new Float32Array(nodes.length * 3);
    for (let i = 0; i < nodes.length; i += 1) {
      const idx = i * 3;
      data[idx] = nodes[i][0];
      data[idx + 1] = nodes[i][1];
      data[idx + 2] = nodes[i][2];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data, 3));
    const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity });
    return new THREE.Points(geometry, material);
  }

  function hashString(value) {
    const str = String(value || "");
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  let cortexVeinTexture = null;

  function getCortexVeinTexture() {
    if (cortexVeinTexture) return cortexVeinTexture;
    const canvasEl = document.createElement("canvas");
    canvasEl.width = 512;
    canvasEl.height = 512;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#f5d5d1";
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    for (let i = 0; i < 190; i += 1) {
      const x = Math.random() * canvasEl.width;
      const y = Math.random() * canvasEl.height;
      const len = 12 + Math.random() * 48;
      const ang = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(205, 122, 132, ${0.12 + (Math.random() * 0.18)})`;
      ctx.lineWidth = 0.6 + (Math.random() * 1.1);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + (Math.cos(ang) * len * 0.45),
        y + (Math.sin(ang) * len * 0.45),
        x + (Math.cos(ang) * len),
        y + (Math.sin(ang) * len),
      );
      ctx.stroke();
    }

    cortexVeinTexture = new THREE.CanvasTexture(canvasEl);
    cortexVeinTexture.wrapS = THREE.RepeatWrapping;
    cortexVeinTexture.wrapT = THREE.RepeatWrapping;
    cortexVeinTexture.repeat.set(1.4, 1.4);
    cortexVeinTexture.anisotropy = 4;
    return cortexVeinTexture;
  }

  function cortexBaseColor(macro) {
    const c = new THREE.Color("#f1cfcb");
    if (macro === "frontal") c.offsetHSL(0.005, 0.03, 0.01);
    else if (macro === "parietal") c.offsetHSL(-0.004, 0.02, 0.008);
    else if (macro === "temporal") c.offsetHSL(0.01, 0.04, -0.008);
    else if (macro === "occipital") c.offsetHSL(-0.01, 0.03, -0.01);
    else if (macro === "insula") c.offsetHSL(0.013, 0.03, -0.02);
    else if (macro === "limbic") c.offsetHSL(0.02, 0.04, -0.03);
    return c;
  }

  function buildRegionSurfaceMesh(region, options = {}) {
    const isCortical = Boolean(options.isCortical);
    const geometry = new THREE.SphereGeometry(1, isCortical ? 56 : 38, isCortical ? 40 : 24);
    const attr = geometry.attributes.position;
    const center = region.center || [0, 0, 0];
    const radii = region.radii || [1, 1, 1];
    const regionId = String(region.id || region.label || "").toLowerCase();
    const macro = String(region.parent || "").toLowerCase() || (regionId.split("_")[0] || "");
    const hemisphereSign = regionId.includes("_left") ? -1 : (regionId.includes("_right") ? 1 : 0);
    const phase = (hashString(region.id || region.label || "region") % 360) * Math.PI / 180;
    const foldGain = ({
      frontal: 1.18,
      parietal: 1.14,
      temporal: 1.08,
      occipital: 0.98,
      insula: 0.88,
      limbic: 0.84,
    }[macro]) || 1.0;

    for (let i = 0; i < attr.count; i += 1) {
      const x = attr.getX(i);
      const y = attr.getY(i);
      const z = attr.getZ(i);
      const len = Math.sqrt((x * x) + (y * y) + (z * z)) || 1;
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      // Procedural cortical folding (gyri/sulci-like displacement).
      let fold = 0;
      if (isCortical) {
        const g1 = Math.sin((nx * 9.4) + (ny * 6.8) + (nz * 7.7) + phase);
        const g2 = Math.sin((nx * 18.2) - (ny * 13.5) + (nz * 11.7) + (phase * 0.76));
        const g3 = Math.sin((nx * 26.0) + (ny * 21.0) - (nz * 14.0) + (phase * 0.48));
        const ridge = Math.sin((ny * 28.0) + (nz * 8.2) + phase);
        const sulcus = Math.abs(Math.sin((nx * 11.0) - (ny * 9.6) + (nz * 3.3) + phase));
        fold = ((g1 * 0.1) + (g2 * 0.06) + (g3 * 0.03) + (ridge * 0.06) - (sulcus * 0.1)) * foldGain;
      }

      const anterior = Math.max(0, nz);
      const posterior = Math.max(0, -nz);
      const superior = Math.max(0, ny);
      const inferior = Math.max(0, -ny);
      const medial = hemisphereSign === 0 ? 0 : Math.max(0, -hemisphereSign * nx);
      const lateral = hemisphereSign === 0 ? 0 : Math.max(0, hemisphereSign * nx);

      let anatomyWarp = 0;
      if (isCortical) {
        // Keep hemispheres visually cleaner by flattening the medial side a bit.
        anatomyWarp += (lateral * lateral * 0.07) - (medial * medial * 0.13);

        if (macro === "frontal") {
          anatomyWarp += (anterior * anterior * 0.22) + (superior * 0.08);
          anatomyWarp -= posterior * 0.1;
        } else if (macro === "parietal") {
          anatomyWarp += (superior * superior * 0.18) + (posterior * 0.08);
          anatomyWarp -= inferior * 0.06;
        } else if (macro === "temporal") {
          anatomyWarp += (inferior * inferior * 0.23) + (anterior * 0.1);
          anatomyWarp -= superior * 0.11;
        } else if (macro === "occipital") {
          anatomyWarp += (posterior * posterior * 0.26) + (superior * 0.05);
          anatomyWarp -= anterior * 0.12;
        } else if (macro === "insula") {
          anatomyWarp += (inferior * 0.07) + (medial * 0.04);
        } else if (macro === "limbic") {
          anatomyWarp += (inferior * 0.09) + (medial * 0.05);
        }
      } else if (macro === "thalamus") {
        anatomyWarp += (posterior * 0.04) + (superior * 0.03);
      } else if (macro === "hypothalamus") {
        anatomyWarp += (inferior * 0.09) + (anterior * 0.04);
      } else if (macro === "epithalamus") {
        anatomyWarp += superior * 0.1;
      } else if (macro === "subthalamus") {
        anatomyWarp += inferior * 0.06;
      }

      const scale = 1 + fold + anatomyWarp;
      const ex = (nx * radii[0] * scale) + center[0];
      const ey = (ny * radii[1] * scale) + center[1];
      const ez = (nz * radii[2] * scale) + center[2];

      attr.setXYZ(i, ex, ey, ez);
    }

    attr.needsUpdate = true;
    geometry.computeVertexNormals();

    const baseColor = isCortical ? cortexBaseColor(macro) : new THREE.Color(region.color || "#7aa7ff");
    const material = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      transparent: true,
      opacity: isCortical ? 0.82 : 0.74,
      roughness: isCortical ? 0.58 : 0.66,
      metalness: 0,
      clearcoat: isCortical ? 0.28 : 0.12,
      clearcoatRoughness: isCortical ? 0.48 : 0.56,
      transmission: isCortical ? 0.015 : 0,
      thickness: isCortical ? 0.2 : 0,
      emissive: isCortical ? new THREE.Color("#cda3a1") : new THREE.Color(region.color || "#7aa7ff"),
      emissiveIntensity: isCortical ? 0.04 : 0.08,
    });
    if (isCortical) {
      const map = getCortexVeinTexture();
      if (map) {
        material.map = map;
        material.map.needsUpdate = true;
      }
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.region = region;
    return mesh;
  }

  function buildConnectorLines(connectors, color = 0x9cb6ff, opacity = 0.25) {
    const data = new Float32Array(connectors.length * 6);
    for (let i = 0; i < connectors.length; i += 1) {
      const idx = i * 6;
      const from = connectors[i].from;
      const to = connectors[i].to;
      data[idx] = from[0];
      data[idx + 1] = from[1];
      data[idx + 2] = from[2];
      data[idx + 3] = to[0];
      data[idx + 4] = to[1];
      data[idx + 5] = to[2];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.LineSegments(geometry, material);
  }

  function ensureBrainHighlights() {
    if (state.brainHighlights.length === 2) return;
    if (state.brainHighlights.length > 0) return;

    const haloGeometry = new THREE.SphereGeometry(0.28, 16, 16);
    const haloA = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })
    );
    const haloB = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffd768, transparent: true, opacity: 0.24 })
    );
    haloA.visible = false;
    haloB.visible = false;
    state.brainHighlights.push(haloA, haloB);
    scene.add(haloA);
    scene.add(haloB);
  }

  function getBrainEntryFromObject(object) {
    if (!object) return null;
    return state.brainEntries.find((entry) => (
      entry.points === object || entry.shell === object || entry.marker === object
    )) || null;
  }

  function resetBrainEntryVisual(entry) {
    if (!entry) return;
    if (entry.points?.material) {
      entry.points.material.size = entry.points.userData.baseSize;
      entry.points.material.opacity = entry.points.userData.baseOpacity;
    }
    if (entry.shell?.material) {
      entry.shell.material.opacity = entry.shell.userData.baseOpacity;
      entry.shell.material.emissiveIntensity = entry.shell.userData.baseEmissiveIntensity;
    }
  }

  function applyBrainEntrySelectionVisual(entry, slotIndex) {
    if (!entry) return;
    if (entry.points?.material) {
      entry.points.material.size = entry.points.userData.baseSize * (slotIndex === 0 ? 1.24 : 1.17);
      entry.points.material.opacity = 1;
    }
    if (entry.shell?.material) {
      entry.shell.material.opacity = Math.min(1, entry.shell.userData.baseOpacity + (slotIndex === 0 ? 0.16 : 0.11));
      entry.shell.material.emissiveIntensity = Math.min(1, entry.shell.userData.baseEmissiveIntensity + (slotIndex === 0 ? 0.2 : 0.14));
    }
  }

  function setBrainSelections(selectionEntries) {
    state.brainSelections.forEach((entry) => resetBrainEntryVisual(entry));

    const unique = [];
    selectionEntries.forEach((entry) => {
      if (!entry) return;
      if (entry.points?.visible === false) return;
      if (unique.includes(entry)) return;
      unique.push(entry);
    });

    const limit = state.brainCompareMode ? 2 : 1;
    state.brainSelections = unique.slice(0, limit);
    state.brainSelections.forEach((entry, index) => applyBrainEntrySelectionVisual(entry, index));

    ensureBrainHighlights();
    state.brainHighlights.forEach((halo, index) => {
      const selected = state.brainSelections[index];
      if (!selected) {
        halo.visible = false;
        return;
      }

      const region = selected.region || {};
      halo.visible = true;
      halo.position.set(region.center[0], region.center[1], region.center[2]);
      if (index === 0) halo.material.color.set(region.color || "#ffffff");
      else halo.material.color.set("#ffd768");
    });

    const regionA = state.brainSelections[0]?.region || null;
    const regionB = state.brainSelections[1]?.region || null;
    renderBrainDetail(regionA, regionB);

    if (regionA && regionB) {
      setInfo(`Comparando: ${regionA.label} <-> ${regionB.label}`);
    } else if (regionA) {
      setInfo(`Regiao selecionada: ${regionA.label || regionA.id}`);
    }
  }

  function pickBrainSelection(object, compareRequest = false) {
    const entry = getBrainEntryFromObject(object);
    if (!entry) {
      setBrainSelections([]);
      return;
    }

    const current = [...state.brainSelections];
    const existingIndex = current.indexOf(entry);
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
      setBrainSelections(current);
      return;
    }

    if (compareRequest) {
      if (current.length === 0) current.push(entry);
      else if (current.length === 1) current.push(entry);
      else current[1] = entry;
      setBrainSelections(current);
      return;
    }

    setBrainSelections([entry]);
  }

  function setBrainFilterControlsEnabled(enabled) {
    if (brainKindFilter) brainKindFilter.disabled = !enabled;
    if (brainSearchInput) brainSearchInput.disabled = !enabled;
    if (brainCompareToggle) brainCompareToggle.disabled = !enabled;
    if (brainClearSelection) brainClearSelection.disabled = !enabled;
    if (brainExportJson) brainExportJson.disabled = !enabled;
    if (brainExportMd) brainExportMd.disabled = !enabled;
  }

  function applyBrainFilters() {
    if (state.sceneName !== "brain_map") return;
    const query = String(state.brainSearchQuery || "").trim().toLowerCase();
    const visibleSelections = [];
    let firstVisibleEntry = null;
    state.brainPickables = [];

    state.brainEntries.forEach((entry) => {
      const region = entry.region || {};
      const kindMatch = state.brainFilterKind === "all" || region.kind === state.brainFilterKind;
      const searchable = [
        region.id || "",
        region.label || "",
        region.parent || "",
        ...(Array.isArray(region.subregions) ? region.subregions : []),
      ]
        .join(" ")
        .toLowerCase();
      const queryMatch = !query || searchable.includes(query);
      const visible = kindMatch && queryMatch;

      if (entry.points) entry.points.visible = visible;
      if (entry.shell) entry.shell.visible = visible;
      if (entry.marker) entry.marker.visible = visible;

      if (visible) {
        if (entry.points) state.brainPickables.push(entry.points);
        if (entry.shell) state.brainPickables.push(entry.shell);
        if (!firstVisibleEntry) firstVisibleEntry = entry;
      }
    });

    state.brainSelections.forEach((selected) => {
      if (!selected) return;
      const stillVisible = Boolean(selected.points?.visible || selected.shell?.visible || selected.marker?.visible);
      if (stillVisible) visibleSelections.push(selected);
    });

    if (visibleSelections.length > 0) {
      setBrainSelections(visibleSelections);
    } else if (firstVisibleEntry) {
      setBrainSelections([firstVisibleEntry]);
    } else {
      setBrainSelections([]);
    }

    if (state.brainSelections.length === 0) {
      const visibleCount = state.brainEntries.filter((entry) => (
        entry.points?.visible || entry.shell?.visible || entry.marker?.visible
      )).length;
      setInfo(`Filtro ativo: ${visibleCount} regioes visiveis no mapa cortical.`);
    }
  }

  function setTopStatus() {
    statusScene.textContent = state.sceneName;
    statusMode.textContent = state.dataMode;
  }

  function buildSphereScene(data) {
    const group = new THREE.Group();
    group.add(buildEdgeLines(data.nodes, data.edges, 0x35d6ff, 0.65));
    group.add(buildNodePoints(data.nodes, 0xd7f0ff, 0.035, 0.9));
    scene.add(group);
    state.group = group;

    state.update = (dt, elapsed) => {
      group.rotation.y += dt * 0.35;
      group.rotation.x = Math.sin(elapsed * 0.4) * 0.09;
    };

    setInfo("Esfera 3D ativa. Base para malha espacial e interface holografica.");
    resetStatusXor();
  }

  function buildPulseScene(data) {
    const group = new THREE.Group();
    const lines = buildEdgeLines(data.nodes, data.edges, 0x4f88ff, 0.45);
    const points = buildNodePoints(data.nodes, 0xffffff, 0.055, 0.95);
    group.add(lines);
    group.add(points);

    const fallbackTopology = defaultPulseNamedTopology();
    const namedRegions = Array.isArray(data.named_regions) && data.named_regions.length > 0
      ? data.named_regions
      : fallbackTopology.namedRegions;
    const namedConnectorDefs = Array.isArray(data.named_connectors) && data.named_connectors.length > 0
      ? data.named_connectors
      : fallbackTopology.namedConnectors;

    const namedRegionMap = new Map();
    namedRegions.forEach((region) => {
      if (!Array.isArray(region.position) || region.position.length < 3) return;
      const anchor = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 14, 14),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(region.color || "#c6d8ff"),
          transparent: true,
          opacity: 0.95,
        })
      );
      anchor.position.set(region.position[0], region.position[1], region.position[2]);
      group.add(anchor);
      namedRegionMap.set(region.id, anchor.position.clone());

      const label = buildTextSprite(region.label || region.id || "regiao", "#dce9ff");
      if (label) {
        label.position.set(region.position[0], region.position[1] + 0.35, region.position[2]);
        group.add(label);
      }
    });

    const namedConnectors = [];
    namedConnectorDefs.forEach((pair) => {
      const fromId = Array.isArray(pair) ? pair[0] : null;
      const toId = Array.isArray(pair) ? pair[1] : null;
      if (!fromId || !toId) return;
      const fromPos = namedRegionMap.get(fromId);
      const toPos = namedRegionMap.get(toId);
      if (!fromPos || !toPos) return;
      namedConnectors.push({
        fromId,
        toId,
        from: [fromPos.x, fromPos.y, fromPos.z],
        to: [toPos.x, toPos.y, toPos.z],
      });
    });

    if (namedConnectors.length > 0) {
      group.add(buildConnectorLines(namedConnectors, 0xffbe74, 0.55));
    }

    scene.add(group);
    state.group = group;

    const pulses = [];
    const macroPulses = [];
    const pulseGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffda72 });
    const macroPulseGeo = new THREE.SphereGeometry(0.085, 10, 10);
    const macroPulseMat = new THREE.MeshBasicMaterial({ color: 0xffbe74 });
    let spawnCooldown = 0;
    let macroSpawnCooldown = 0;

    function spawnPulse() {
      const edgeIndex = Math.floor(Math.random() * data.edges.length);
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.userData = {
        edge: data.edges[edgeIndex],
        t: 0,
        speed: 0.55 + Math.random() * 0.95,
      };
      group.add(pulse);
      pulses.push(pulse);
    }

    function spawnMacroPulse() {
      if (namedConnectors.length === 0) return;
      const connector = namedConnectors[Math.floor(Math.random() * namedConnectors.length)];
      const pulse = new THREE.Mesh(macroPulseGeo, macroPulseMat);
      pulse.userData = {
        from: connector.from,
        to: connector.to,
        t: 0,
        speed: 0.42 + Math.random() * 0.5,
      };
      group.add(pulse);
      macroPulses.push(pulse);
    }

    state.update = (dt) => {
      group.rotation.y += dt * 0.2;
      group.rotation.x += dt * 0.08;

      spawnCooldown += dt;
      if (spawnCooldown > 0.07 && pulses.length < 200) {
        spawnPulse();
        spawnCooldown = 0;
      }

      macroSpawnCooldown += dt;
      if (macroSpawnCooldown > 0.18 && macroPulses.length < 42) {
        spawnMacroPulse();
        macroSpawnCooldown = 0;
      }

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.userData.t += pulse.userData.speed * dt;
        const t = pulse.userData.t;
        if (t > 1) {
          group.remove(pulse);
          pulses.splice(i, 1);
          continue;
        }

        const [a, b] = pulse.userData.edge;
        const p1 = data.nodes[a];
        const p2 = data.nodes[b];
        pulse.position.set(
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t,
          p1[2] + (p2[2] - p1[2]) * t
        );
      }

      for (let i = macroPulses.length - 1; i >= 0; i -= 1) {
        const pulse = macroPulses[i];
        pulse.userData.t += pulse.userData.speed * dt;
        const t = pulse.userData.t;
        if (t > 1) {
          group.remove(pulse);
          macroPulses.splice(i, 1);
          continue;
        }

        const p1 = pulse.userData.from;
        const p2 = pulse.userData.to;
        pulse.position.set(
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t,
          p1[2] + (p2[2] - p1[2]) * t
        );
      }
    };

    statusLoss.textContent = "-";
    statusSteps.textContent = "-";
    statusPredictions.textContent = [
      "conexoes nomeadas:",
      "Talamo -> Frontal",
      "Talamo -> Parietal",
      "Talamo -> Temporal",
      "Talamo -> Occipital",
    ].join("\n");
    setInfo("Rede com pulsos ativa. Sinapses locais e vias nomeadas do talamo para os lobos.");
  }

  function loadGlbModel(url) {
    return new Promise((resolve, reject) => {
      if (!THREE.GLTFLoader) {
        reject(new Error("GLTFLoader indisponivel."));
        return;
      }
      const loader = new THREE.GLTFLoader();
      loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error || new Error("Falha ao carregar GLB.")),
      );
    });
  }

  async function buildRealisticBrainScene() {
    const gltf = await loadGlbModel("./models/brain-human.glb");
    const source = gltf.scene || (Array.isArray(gltf.scenes) ? gltf.scenes[0] : null);
    if (!source) throw new Error("Modelo GLB sem cena principal.");

    const model = source.clone(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 13.2 / maxDim;
    model.scale.setScalar(scale);

    const recenteredBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    recenteredBox.getCenter(center);
    model.position.sub(center);
    model.position.y -= 0.8;

    model.traverse((node) => {
      if (!node.isMesh) return;
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#f0c8c2"),
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.34,
        clearcoatRoughness: 0.44,
        transmission: 0.02,
        thickness: 0.24,
        emissive: new THREE.Color("#bf9b97"),
        emissiveIntensity: 0.04,
      });
      node.material = mat;
      node.castShadow = false;
      node.receiveShadow = true;
    });

    const group = new THREE.Group();
    group.add(model);
    scene.add(group);
    state.group = group;
    state.brainEntries = [];
    state.brainPickables = [];
    state.brainSelections = [];
    clearBrainDetail();
    setBrainFilterControlsEnabled(false);

    statusLoss.textContent = "-";
    statusSteps.textContent = "-";
    statusPredictions.textContent = [
      "modelo: NIH 3D (GLB)",
      "fonte: dgallichan/Sketchfab (CC-BY 4.0)",
      "estrutura: cortex com giros/sulcos",
      "modo: visual anatomico realista",
    ].join("\n");

    state.update = (dt, elapsed) => {
      group.rotation.y += dt * 0.09;
      group.rotation.x = Math.sin(elapsed * 0.2) * 0.03;
    };

    setInfo("Cerebro realista ativo. Modelo anatomico com giros e lobos.");
  }

  function buildBrainScene(data) {
    const group = new THREE.Group();
    const cortexRegions = data.regions.filter((region) => region.kind === "lobe");
    const diencephalonRegions = data.regions.filter((region) => region.kind === "diencephalon");

    state.brainEntries = [];
    state.brainPickables = [];

    cortexRegions.forEach((region) => {
      const shell = buildRegionSurfaceMesh(region, { isCortical: true });
      shell.userData.baseOpacity = shell.material.opacity;
      shell.userData.baseEmissiveIntensity = shell.material.emissiveIntensity;
      shell.renderOrder = 1;
      const points = buildNodePoints(region.nodes, region.color, 0.022, 0.22);
      points.userData = {
        region,
        baseSize: 0.022,
        baseOpacity: 0.22,
      };
      state.brainEntries.push({ region, points, shell, marker: null });
      group.add(shell);
      group.add(points);
    });

    diencephalonRegions.forEach((region) => {
      const shell = buildRegionSurfaceMesh(region, { isCortical: false });
      shell.userData.baseOpacity = shell.material.opacity;
      shell.userData.baseEmissiveIntensity = shell.material.emissiveIntensity;
      shell.renderOrder = 1;
      const points = buildNodePoints(region.nodes, region.color, 0.03, 0.42);
      points.userData = {
        region,
        baseSize: 0.03,
        baseOpacity: 0.42,
      };
      group.add(shell);
      group.add(points);
      const centerGeo = new THREE.SphereGeometry(0.085, 10, 10);
      const centerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(region.color),
        transparent: true,
        opacity: 0.95,
      });
      const marker = new THREE.Mesh(centerGeo, centerMat);
      marker.position.set(region.center[0], region.center[1], region.center[2]);
      group.add(marker);
      state.brainEntries.push({ region, points, shell, marker });
    });

    if (Array.isArray(data.connectors) && data.connectors.length > 0) {
      group.add(buildConnectorLines(data.connectors, 0xc8d5ff, 0.28));
    }

    scene.add(group);
    state.group = group;

    state.update = (dt, elapsed) => {
      group.rotation.y += dt * 0.12;
      group.rotation.x = Math.sin(elapsed * 0.28) * 0.06;
    };

    statusLoss.textContent = "-";
    statusSteps.textContent = "-";
    statusPredictions.textContent = [
      `lobos (regioes): ${cortexRegions.length}`,
      `diencefalo (regioes): ${diencephalonRegions.length}`,
      `componentes: ${(data.meta?.diencephalon_components || []).join(", ") || "Talamo, Hipotalamo, Epitalamo, Subtalamo"}`,
    ].join("\n");
    setBrainFilterControlsEnabled(true);
    state.brainSelections = [];
    setBrainCompareToggleLabel();
    applyBrainFilters();
    setInfo("Mapa cortical ativo. Use filtro/busca e clique em uma regiao.");
  }

  function buildXorScene(initialSnapshot) {
    const group = new THREE.Group();
    const nodeGeo = new THREE.SphereGeometry(0.22, 14, 14);
    const nodeMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, metalness: 0.2, roughness: 0.35 });

    const inputPos = [
      new THREE.Vector3(-6.5, 1.8, 0),
      new THREE.Vector3(-6.5, -1.8, 0),
    ];
    const hiddenPos = [
      new THREE.Vector3(0, 3.8, 0),
      new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(0, -1.2, 0),
      new THREE.Vector3(0, -3.8, 0),
    ];
    const outputPos = [new THREE.Vector3(6.5, 0, 0)];

    const allNodes = [...inputPos, ...hiddenPos, ...outputPos];
    allNodes.forEach((pos) => {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.copy(pos);
      group.add(node);
    });

    const lineGroup = new THREE.Group();
    group.add(lineGroup);
    scene.add(group);
    state.group = group;

    function lineForWeight(start, end, weight) {
      const points = [start, end];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const absWeight = Math.min(Math.abs(weight), 2.0);
      const color = weight >= 0 ? 0x3aa9ff : 0xff5e6b;
      const opacity = 0.25 + absWeight / 2.0;
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      return new THREE.Line(geometry, material);
    }

    function renderWeights(snapshot) {
      while (lineGroup.children.length > 0) {
        const child = lineGroup.children.pop();
        if (!child) break;
        lineGroup.remove(child);
        disposeObject(child);
      }

      for (let inIdx = 0; inIdx < 2; inIdx += 1) {
        for (let hIdx = 0; hIdx < 4; hIdx += 1) {
          lineGroup.add(lineForWeight(inputPos[inIdx], hiddenPos[hIdx], snapshot.W1[inIdx][hIdx]));
        }
      }

      for (let hIdx = 0; hIdx < 4; hIdx += 1) {
        lineGroup.add(lineForWeight(hiddenPos[hIdx], outputPos[0], snapshot.W2[hIdx][0]));
      }

      statusLoss.textContent = snapshot.loss.toFixed(6);
      statusSteps.textContent = String(snapshot.steps);
      statusPredictions.textContent = `predicoes: ${snapshot.predictions.map((v) => v.toFixed(4)).join(", ")}`;
    }

    renderWeights(initialSnapshot);
    let timer = 0;

    state.update = async (dt) => {
      group.rotation.y += dt * 0.16;
      timer += dt;
      if (timer < 0.55 || state.xorRefreshBusy) return;
      timer = 0;

      state.xorRefreshBusy = true;
      try {
        let snapshot;
        if (state.dataMode === "api") {
          snapshot = await fetchJson("/api/xor?steps=40");
        } else {
          state.xorTrainer.trainEpochs(40);
          snapshot = state.xorTrainer.snapshot();
        }
        renderWeights(snapshot);
      } catch (error) {
        setInfo(`Falha no XOR (${String(error.message || error)}).`);
      } finally {
        state.xorRefreshBusy = false;
      }
    };

    setInfo("XOR ativo. A rede ajusta pesos e reduz erro ao longo do tempo.");
  }

  async function getDataWithFallback(apiPath, pureBuilder) {
    if (state.dataMode === "pure") return pureBuilder();
    try {
      return await fetchJson(apiPath);
    } catch (error) {
      setInfo(`API indisponivel (${String(error.message || error)}). Usando modo puro.`);
      state.dataMode = "pure";
      dataModeSelect.value = "pure";
      setTopStatus();
      return pureBuilder();
    }
  }

  async function loadScene() {
    state.buildToken += 1;
    const token = state.buildToken;
    clearGroup();
    canvas.style.cursor = "default";
    setBrainFilterControlsEnabled(false);
    setTopStatus();
    setInfo("Carregando cena...");
    resetStatusXor();

    try {
      if (state.sceneName === "brain") {
        if (token !== state.buildToken) return;
        await buildRealisticBrainScene();
        canvas.style.cursor = "default";
        return;
      }

      if (state.sceneName === "brain_map") {
        const data = await getDataWithFallback("/api/brain-anatomy?density=1.0", () => generateBrainAnatomyData(1.0));
        if (token !== state.buildToken) return;
        buildBrainScene(data);
        canvas.style.cursor = "pointer";
        return;
      }

      if (state.sceneName === "sphere") {
        const data = await getDataWithFallback("/api/sphere", () => generateSphereData());
        if (token !== state.buildToken) return;
        buildSphereScene(data);
        return;
      }

      if (state.sceneName === "pulses") {
        const data = await getDataWithFallback("/api/pulse-network", () => generatePulseNetwork());
        if (token !== state.buildToken) return;
        buildPulseScene(data);
        return;
      }

      if (state.sceneName === "xor") {
        if (state.dataMode === "pure") {
          state.xorTrainer = createXorTrainer();
          state.xorTrainer.trainEpochs(40);
          const snapshot = state.xorTrainer.snapshot();
          if (token !== state.buildToken) return;
          buildXorScene(snapshot);
        } else {
          const snapshot = await getDataWithFallback("/api/xor?steps=40", () => {
            state.xorTrainer = createXorTrainer();
            state.xorTrainer.trainEpochs(40);
            return state.xorTrainer.snapshot();
          });
          if (token !== state.buildToken) return;
          buildXorScene(snapshot);
        }
      }
    } catch (error) {
      setInfo(`Erro ao montar cena: ${String(error.message || error)}`);
    }
  }

  canvas.addEventListener("click", (event) => {
    if (state.sceneName !== "brain_map" || state.brainPickables.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.pointer, camera);
    const hits = state.raycaster.intersectObjects(state.brainPickables, false);
    if (hits.length === 0) {
      setBrainSelections([]);
      setInfo("Nenhuma regiao selecionada. Clique em um lobo ou componente do diencefalo.");
      return;
    }

    const compareRequest = state.brainCompareMode || Boolean(event.shiftKey);
    pickBrainSelection(hits[0].object, compareRequest);
  });

  sceneSelect.addEventListener("change", () => {
    state.sceneName = sceneSelect.value;
    loadScene();
  });

  if (brainKindFilter) {
    brainKindFilter.addEventListener("change", () => {
      state.brainFilterKind = brainKindFilter.value || "all";
      applyBrainFilters();
    });
  }

  if (brainSearchInput) {
    brainSearchInput.addEventListener("input", () => {
      state.brainSearchQuery = brainSearchInput.value || "";
      applyBrainFilters();
    });
  }

  if (brainCompareToggle) {
    brainCompareToggle.addEventListener("click", () => {
      state.brainCompareMode = !state.brainCompareMode;
      setBrainCompareToggleLabel();
      if (!state.brainCompareMode && state.brainSelections.length > 1) {
        setBrainSelections([state.brainSelections[0]]);
      } else {
        const regionA = state.brainSelections[0]?.region || null;
        const regionB = state.brainSelections[1]?.region || null;
        renderBrainDetail(regionA, regionB);
      }
    });
  }

  if (brainClearSelection) {
    brainClearSelection.addEventListener("click", () => {
      setBrainSelections([]);
      setInfo("Selecao limpa.");
    });
  }

  if (brainExportJson) {
    brainExportJson.addEventListener("click", () => {
      exportBrainSelectionAsJson();
    });
  }

  if (brainExportMd) {
    brainExportMd.addEventListener("click", () => {
      exportBrainSelectionAsMarkdown();
    });
  }

  dataModeSelect.addEventListener("change", () => {
    state.dataMode = dataModeSelect.value;
    loadScene();
  });

  rebuildBtn.addEventListener("click", () => {
    loadScene();
  });

  pauseBtn.addEventListener("click", () => {
    state.running = !state.running;
    pauseBtn.textContent = state.running ? "pausar" : "continuar";
  });

  let last = performance.now();
  function animate(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    requestAnimationFrame(animate);

    stars.rotation.y += dt * 0.02;
    if (state.running && typeof state.update === "function") {
      state.update(dt, now / 1000);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  loadScene();
  requestAnimationFrame(animate);
})();
