/**
 * Para usar suas imagens locais:
 * 1) Crie /assets
 * 2) Salve arquivos como: neuro-01.jpg, physio-01.jpg etc.
 * 3) O script tenta usar /assets primeiro; se nao achar, cai no fallback automatico.
 */
const SOURCES = [
  {
    id: "neuro",
    title: "Neurociência",
    desc: "Sinapse, rede e foco.",
    query: "neuroscience brain synapse microscopy",
    mesh: {
      primary: "Action Potentials",
      secondary: ["Sodium Channels", "Membrane Potentials"]
    }
  },
  {
    id: "physio",
    title: "Fisiologia",
    desc: "Homeostase e adaptação.",
    query: "physiology anatomy muscle fibers",
    mesh: {
      primary: "Homeostasis",
      secondary: ["Adaptation, Physiological", "Skeletal Muscle"]
    }
  },
  {
    id: "sport",
    title: "Sport",
    desc: "Força, técnica, potência.",
    query: "sport training athlete gym performance",
    mesh: {
      primary: "Sports",
      secondary: ["Exercise", "Physical Fitness"]
    }
  },
  {
    id: "homeo",
    title: "Homeostase",
    desc: "Equilíbrio e adaptação crônica.",
    query: "homeostasis physiology adaptation",
    mesh: {
      primary: "Homeostasis",
      secondary: ["Adaptation, Physiological"]
    }
  }
];

const PRIMARY_NEURO_IMAGE = "/assets/synapse-neuro-3d.svg";
const LOCAL_ASSETS = {};
const MESH_LOOKUP_BASE = "https://id.nlm.nih.gov/mesh/lookup";
const MESH_SPARQL_ENDPOINT = "https://id.nlm.nih.gov/mesh/sparql";
const meshCache = new Map();
const EDITORIAL_ENDPOINT = "/editorial/trilhas.json";
const EDITORIAL_PLAYBOOK_ENDPOINT = "/editorial/playbook.md";
const EDITORIAL_CALENDAR_ENDPOINT = "/editorial/calendario-12-semanas.md";
const EDITORIAL_QUERY_PARAM = "editorial";
const EDITORIAL_STORAGE_KEY = "dod_editorial_mode";

const FEATURE_NEURO_CARD = {
  id: "neuro-polilaminina",
  title: "Polilaminina e Regeneração Neural",
  desc: "Biomaterial neuroregenerativo aprovado para estudo clínico em lesão medular (Brasil, 2026).",
  category: "neuro",
  tags: ["NEURO", "SCIENCE", "DOD"],
  image: "/assets/neuro-polilaminina.jpg",
  content: [
    {
      h: "Fisiologia da Polilaminina",
      p: "A polilaminina é um biomaterial derivado da laminina, componente essencial da matriz extracelular que regula adesão celular, crescimento axonal e organização estrutural do tecido nervoso."
    },
    {
      h: "Mecanismo fisiológico no corpo",
      p: "Após lesão medular, ocorre inflamação, ruptura da matriz extracelular e falha na reconexão neural. A polilaminina atua como um microambiente bioativo que favorece regeneração axonal, plasticidade neural e reorganização sináptica."
    },
    {
      h: "Evidência científica (Brasil – 2026)",
      p: "Estudo clínico aprovado pela Anvisa para avaliação de segurança em humanos com lesão medular aguda, representando avanço da neurociência translacional brasileira."
    }
  ]
};

const THEMATIC_PAGE_CONFIG = {
  neuro: {
    title: "SINAPSE • REDE • FOCO",
    gridTitle: "Artigos PubMed • Neuro",
    tags: ["Terapias", "Plasticidade", "Pensamento", "Consciência", "Emoções"],
    filters: [
      { id: "all", label: "Todos" },
      { id: "synapse", label: "Sinapse" },
      { id: "plasticity", label: "Plasticidade" }
    ],
    featured: {
      title: "Silent Synapses in the Adult Brain",
      desc: "Sinapses glutamatérgicas recém-formadas são inicialmente silenciosas e requerem plasticidade dependente de atividade.",
      url: "https://pubmed.ncbi.nlm.nih.gov/39999855/",
      img: "/assets/synapse-neuro-3d.svg"
    }
  },
  physio: {
    title: "FISIOLOGIA",
    gridTitle: "Artigos PubMed • Physio",
    tags: ["Homeostase", "Adaptação", "Autônomo", "Metabolismo", "Estresse"],
    filters: [
      { id: "all", label: "Todos" },
      { id: "homeostasis", label: "Homeostase" },
      { id: "stress", label: "Estresse" }
    ],
    featured: {
      title: "Resposta ao estresse: homeostase e alostase",
      desc: "Revisão sobre mecanismos fisiológicos de estabilidade interna frente ao estresse agudo e crônico.",
      url: "https://www.scielo.br/j/epsic/a/wLn5RGy9pVXSZKryWSPHXTF/",
      img: "/assets/physio/physio_autonomic_recovery_b.png"
    }
  },
  sport: {
    title: "SPORT",
    gridTitle: "Artigos PubMed • Sport",
    tags: ["Força", "Técnica", "VO2", "Unidade Motora", "Performance"],
    filters: [
      { id: "all", label: "Todos" },
      { id: "strength", label: "Força" },
      { id: "vo2", label: "VO2" }
    ],
    featured: {
      title: "Training Specificity for Athletes",
      desc: "A especificidade do treino direciona adaptações neuromusculares e cardiorrespiratórias no esporte.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10244991/",
      img: "/assets/sport/sport_neural_strength_b.png"
    }
  },
  health: {
    title: "HOMEOSTASE",
    gridTitle: "Artigos PubMed • Health",
    tags: ["Equilíbrio", "Emoções", "Alostase", "Recuperação", "Resiliência"],
    filters: [
      { id: "all", label: "Todos" },
      { id: "allostasis", label: "Alostase" },
      { id: "recovery", label: "Recuperação" }
    ],
    featured: {
      title: "Homeostatic Regulation of Arousal",
      desc: "A regulação homeostática do estado de alerta integra sono, vigília e adaptação comportamental.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30467363/",
      img: "/assets/homeostase/homeo_orthostatic_b.png"
    }
  }
};

const PUBMED_ARTICLES = {
  neuro: [
    {
      title: "Silent Synapses in the Adult Brain",
      desc: "Sinapses glutamatérgicas silenciosas requerem plasticidade dependente de atividade para estabilização.",
      url: "https://pubmed.ncbi.nlm.nih.gov/39999855/",
      imgQuery: "neuro-silent-synapses",
      filter: "synapse"
    },
    {
      title: "Neural plasticity and disease",
      desc: "A plasticidade neural é central na recuperação funcional e também em processos patológicos.",
      url: "https://pubmed.ncbi.nlm.nih.gov/34795459/",
      imgQuery: "neuro-plasticity-network",
      filter: "plasticity"
    },
    {
      title: "Attention and cognitive control",
      desc: "Foco e controle executivo dependem da interação entre redes neurais de saliência e controle.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31559336/",
      imgQuery: "neuro-attention-cortex",
      filter: "plasticity"
    },
    {
      title: "Synaptic mechanisms of memory",
      desc: "Mecanismos sinápticos sustentam aquisição, manutenção e reconsolidação de memória.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28617025/",
      imgQuery: "synapse-memory-ltp",
      filter: "synapse"
    },
    {
      title: "Sleep and synaptic homeostasis",
      desc: "Sono ajusta força sináptica e favorece consolidação de traços relevantes.",
      url: "https://pubmed.ncbi.nlm.nih.gov/22055988/",
      imgQuery: "sleep-synaptic-homeostasis",
      filter: "plasticity"
    }
  ],
  physio: [
    {
      title: "Resposta ao estresse: homeostase e alostase",
      desc: "Alostase e homeostase explicam a resposta fisiológica ao estresse em múltiplos sistemas.",
      url: "https://www.scielo.br/j/epsic/a/wLn5RGy9pVXSZKryWSPHXTF/",
      imgQuery: "physio-stress-homeostasis",
      filter: "stress"
    },
    {
      title: "Homeostasis and allostasis of cortisol",
      desc: "Eixo HPA regula cortisol e influencia adaptação fisiológica ao estresse crônico.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30068720/",
      imgQuery: "cortisol-hpa-axis",
      filter: "homeostasis"
    },
    {
      title: "Autonomic regulation and recovery",
      desc: "Regulação autonômica é marcador útil para recuperação pós-esforço e carga interna.",
      url: "https://pubmed.ncbi.nlm.nih.gov/34130793/",
      imgQuery: "autonomic-recovery",
      filter: "homeostasis"
    },
    {
      title: "Physiological adaptation to heat",
      desc: "Aclimatação ao calor melhora termorregulação e tolerância ao esforço.",
      url: "https://pubmed.ncbi.nlm.nih.gov/31141202/",
      imgQuery: "thermoregulation-heat",
      filter: "homeostasis"
    },
    {
      title: "Stress response and inflammation",
      desc: "Estresse e inflamação se conectam por vias neuroendócrinas e imunes.",
      url: "https://pubmed.ncbi.nlm.nih.gov/28923025/",
      imgQuery: "stress-inflammation",
      filter: "stress"
    }
  ],
  sport: [
    {
      title: "Training Specificity for Athletes",
      desc: "A especificidade do treino direciona adaptações e transferência para desempenho competitivo.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10244991/",
      imgQuery: "sport-training-specificity",
      filter: "strength"
    },
    {
      title: "VO2max trainability and determinants",
      desc: "VO2max responde ao treino conforme genética, dose de estímulo e status inicial.",
      url: "https://pubmed.ncbi.nlm.nih.gov/38919211/",
      imgQuery: "vo2max-performance",
      filter: "vo2"
    },
    {
      title: "Strength training neural adaptations",
      desc: "Ganhos iniciais de força refletem ajustes neurais de recrutamento e coordenação.",
      url: "https://pubmed.ncbi.nlm.nih.gov/12618576/",
      imgQuery: "strength-neural-adaptation",
      filter: "strength"
    },
    {
      title: "Interval training and oxygen uptake",
      desc: "Treinos intervalados aumentam consumo de oxigênio e eficiência cardiorrespiratória.",
      url: "https://pubmed.ncbi.nlm.nih.gov/40531343/",
      imgQuery: "interval-training-vo2",
      filter: "vo2"
    },
    {
      title: "Motor unit behavior in athletes",
      desc: "Comportamento das unidades motoras diferencia atletas por modalidade e tarefa.",
      url: "https://pubmed.ncbi.nlm.nih.gov/36252034/",
      imgQuery: "motor-unit-athlete",
      filter: "strength"
    }
  ],
  health: [
    {
      title: "Homeostatic Regulation of Arousal",
      desc: "O sistema de alerta é regulado por mecanismos homeostáticos e circadianos.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30467363/",
      imgQuery: "arousal-homeostasis",
      filter: "allostasis"
    },
    {
      title: "Allostasis and allostatic load",
      desc: "Carga alostática descreve custo fisiológico cumulativo da adaptação ao estresse.",
      url: "https://pubmed.ncbi.nlm.nih.gov/18157186/",
      imgQuery: "allostatic-load",
      filter: "allostasis"
    },
    {
      title: "Sleep, recovery, and resilience",
      desc: "Sono de qualidade melhora recuperação e resiliência neurofisiológica.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30763043/",
      imgQuery: "sleep-recovery-resilience",
      filter: "recovery"
    },
    {
      title: "Inflammation and homeostatic repair",
      desc: "Inflamação coordenada é parte da reparação e retorno ao equilíbrio biológico.",
      url: "https://pubmed.ncbi.nlm.nih.gov/29618329/",
      imgQuery: "inflammation-repair-homeostasis",
      filter: "recovery"
    },
    {
      title: "Heart rate variability and stress recovery",
      desc: "Variabilidade da frequência cardíaca reflete adaptação autonômica e recuperação.",
      url: "https://pubmed.ncbi.nlm.nih.gov/25525601/",
      imgQuery: "hrv-stress-recovery",
      filter: "recovery"
    }
  ]
};

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readEditorialModeFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const raw = params.get(EDITORIAL_QUERY_PARAM);
    if (raw === null) return null;
    return raw === "1" || raw === "true" || raw === "on";
  } catch (_) {
    return null;
  }
}

function readEditorialModeFromStorage() {
  try {
    return window.localStorage.getItem(EDITORIAL_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function persistEditorialMode(value) {
  try {
    window.localStorage.setItem(EDITORIAL_STORAGE_KEY, value ? "1" : "0");
  } catch (_) {
    // no-op
  }
}

function shouldEnableEditorialMode() {
  const queryValue = readEditorialModeFromQuery();
  if (queryValue !== null) {
    persistEditorialMode(queryValue);
    return queryValue;
  }
  return readEditorialModeFromStorage();
}

function buildEditorialUrl(enabled) {
  const url = new URL(window.location.href);
  if (enabled) {
    url.searchParams.set(EDITORIAL_QUERY_PARAM, "1");
  } else {
    url.searchParams.delete(EDITORIAL_QUERY_PARAM);
  }
  return url.toString();
}

function mountEditorialToggle() {
  const host = document.querySelector(".mini-actions");
  if (!host) return;
  if (document.getElementById("editorialToggle")) return;

  const button = document.createElement("button");
  button.id = "editorialToggle";
  button.type = "button";
  button.className = "btn ghost editorial-toggle";

  const applyText = () => {
    const enabled = shouldEnableEditorialMode();
    button.textContent = enabled ? "editorial: on" : "editorial: off";
  };

  button.addEventListener("click", () => {
    const next = !shouldEnableEditorialMode();
    persistEditorialMode(next);
    window.location.assign(buildEditorialUrl(next));
  });

  applyText();
  host.appendChild(button);
}

async function fetchEditorialText(endpoint) {
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return "";
    return await response.text();
  } catch (_) {
    return "";
  }
}

function parseCalendarHypotheses(markdown = "") {
  const lines = String(markdown).split("\n").map((line) => line.trim());
  const direct = lines
    .filter((line) => line.startsWith("- Nota 2: Diario de Pesquisa DoD - "))
    .map((line) => line.replace("- Nota 2: Diario de Pesquisa DoD - ", "").trim())
    .filter(Boolean);

  if (direct.length > 0) return direct.slice(0, 4);

  return lines
    .filter((line) => line.startsWith("- ") && line.toLowerCase().includes("hipotese"))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function parsePlaybookChecklist(markdown = "") {
  const content = String(markdown);
  const match = content.match(/## Checklist de publicacao \(obrigatorio\)([\s\S]*?)(\n##\s|$)/);
  if (!match) return [];

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}


async function hydrateEditorialInsights() {
  const insights = document.getElementById("editorialInsights");
  if (!insights) return;

  const [calendarMd, playbookMd] = await Promise.all([
    fetchEditorialText(EDITORIAL_CALENDAR_ENDPOINT),
    fetchEditorialText(EDITORIAL_PLAYBOOK_ENDPOINT)
  ]);

  const hypotheses = parseCalendarHypotheses(calendarMd);
  const checklist = parsePlaybookChecklist(playbookMd);

  if (hypotheses.length === 0 && checklist.length === 0) {
    insights.innerHTML = "";
    return;
  }

  insights.innerHTML = `
    <article class="card is-live editorial-insight-card">
      <div class="tag">ULTIMAS HIPOTESES</div>
      <h4 class="editorial-insight-title">Diario de Pesquisa DoD</h4>
      <ul class="editorial-list">${hypotheses.map((item) => `<li>${escapeAttr(item)}</li>`).join("")}</ul>
    </article>
    <article class="card is-live editorial-insight-card">
      <div class="tag">CHECKLIST</div>
      <h4 class="editorial-insight-title">Gatilhos de qualidade editorial</h4>
      <ul class="editorial-list">${checklist.map((item) => `<li>${escapeAttr(item)}</li>`).join("")}</ul>
    </article>
  `;
}

async function fetchEditorialConfig() {
  try {
    const response = await fetch(EDITORIAL_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.tracks) || payload.tracks.length === 0) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function renderEditorialHub(config) {
  const tracks = Array.isArray(config?.tracks) ? config.tracks.slice(0, 4) : [];
  if (tracks.length === 0) return;

  const mainWrap = document.querySelector("main.wrap");
  const bar = document.querySelector(".bar");
  if (!mainWrap || !bar) return;

  const ids = ["neuro", "physio", "sport", "homeo"];
  const cards = tracks.map((track, index) => {
    const slot = ids[index] || "all";
    const label = escapeAttr(track?.label || "Trilha");
    const objective = escapeAttr(track?.objective || "");
    const question = escapeAttr((track?.core_questions || [])[0] || "");
    const query = escapeAttr((track?.keywords || []).join(" "));
    const keywords = Array.isArray(track?.keywords) ? track.keywords.slice(0, 3) : [];

    return `
      <article class="card is-live editorial-track-card" data-editorial-slot="${slot}">
        <div class="pillrow">${keywords.map((keyword) => `<span class="pill">${escapeAttr(keyword)}</span>`).join("")}</div>
        <h4 class="editorial-track-title">${label}</h4>
        <p class="editorial-track-objective">${objective}</p>
        <p class="editorial-track-question"><strong>Pergunta:</strong> ${question}</p>
        <button type="button" class="btn ghost editorial-track-action" data-editorial-filter="${slot}" data-editorial-query="${query}">Explorar trilha</button>
      </article>
    `;
  }).join("");

  let section = document.getElementById("editorialHub");
  if (!section) {
    section = document.createElement("section");
    section.id = "editorialHub";
    section.setAttribute("aria-label", "Hub editorial DoD");
    bar.insertAdjacentElement("afterend", section);
  }

  section.className = "grid editorial-hub";
  section.innerHTML = `
    <article class="card is-live editorial-hero-card">
      <div class="tag">DOD EDITORIAL</div>
      <h3 class="editorial-hero-title">Trilhas ativas</h3>
      <p class="editorial-hero-copy">${escapeAttr(config?.brand?.positioning || "Laboratorio editorial em modo ativo")}</p>
    </article>
    ${cards}
    <div id="editorialInsights" class="editorial-insights"></div>
  `;

  section.querySelectorAll("[data-editorial-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = button.getAttribute("data-editorial-filter") || "all";
      const query = button.getAttribute("data-editorial-query") || "";
      const chip = document.querySelector(`.bar .chip[data-filter="${slot}"]`);
      const search = document.getElementById("searchInput");

      if (chip instanceof HTMLElement) chip.click();
      if (search) {
        search.value = query;
        applyFilter();
      }

      const target = document.getElementById("cardsGrid") || document.getElementById("feed");
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function applyEditorialConfig(config) {
  const tracks = Array.isArray(config?.tracks) ? config.tracks.slice(0, 4) : [];
  if (tracks.length === 0) return;

  const heroKicker = document.querySelector('.hero-kicker');
  if (heroKicker) heroKicker.textContent = "DOD • Editorial • Autonomia";

  const heroDesc = document.getElementById("slideDesc");
  if (heroDesc && config?.brand?.positioning) {
    heroDesc.textContent = config.brand.positioning;
  }

  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "editorial-live";

  const search = document.getElementById("searchInput");
  if (search) {
    search.placeholder = "Buscar por trilha, hipotese, metodo, evidencia...";
  }

  const sourceSlots = ["neuro", "physio", "sport", "homeo"];
  tracks.forEach((track, index) => {
    const source = SOURCES[index];
    if (!source) return;

    source.id = sourceSlots[index] || source.id;
    source.title = String(track.label || source.title || "");
    source.desc = String(track.objective || source.desc || "");

    const keywords = Array.isArray(track.keywords) ? track.keywords.filter(Boolean) : [];
    if (keywords.length > 0) {
      source.query = keywords.join(" ");
      source.mesh = source.mesh || {};
      source.mesh.primary = track.label || source.mesh.primary || source.title;
      source.mesh.secondary = keywords.slice(0, 3);
    }
  });

  const filterMap = {
    neuro: tracks[0]?.label || "Neuro",
    physio: tracks[1]?.label || "Physio",
    sport: tracks[2]?.label || "Sport",
    homeo: tracks[3]?.label || "Homeostase"
  };

  document.querySelectorAll(".bar .chip[data-filter]").forEach((chip) => {
    const key = chip.dataset.filter || "";
    if (key !== "all" && filterMap[key]) {
      chip.textContent = filterMap[key];
    }
  });

  if (detectPageKey() === "index") {
    renderEditorialHub(config);
    hydrateEditorialInsights();
  }
}


function detectPageKey() {
  const rawPath = (window.location.pathname || "/").replace(/\/+$/, "");
  const lastSegment = (rawPath.split("/").pop() || "").toLowerCase();
  const normalized = lastSegment || "index";

  if (normalized === "index" || normalized === "") return "index";
  if (normalized === "homeo") return "health";
  if (["neuro", "physio", "sport", "health"].includes(normalized)) return normalized;
  return "index";
}

function renderThematicPubMedGrid(pageKey, filterKey = "all") {
  const grid = document.getElementById("pubmedCardsGrid");
  if (!grid) return;

  const articles = (PUBMED_ARTICLES[pageKey] || []).filter((article) => {
    return filterKey === "all" ? true : String(article.filter || "all") === filterKey;
  });

  grid.innerHTML = articles.map((article) => {
    const imgSrc = `https://picsum.photos/seed/${encodeURIComponent(article.imgQuery || article.title)}/400/250`;
    return `
      <article class="pubmed-card">
        <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(article.title)}" loading="lazy" />
        <div class="pubmed-card-content">
          <h4>${escapeAttr(article.title)}</h4>
          <p>${escapeAttr(article.desc)}</p>
          <a href="${escapeAttr(article.url)}" target="_blank" rel="noopener" class="pubmed-link">PubMed</a>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.onerror = null;
      img.src = fallbackImage(img.alt || "DOD", 400, 250);
    }, { once: true });
  });
}

function initThematicPage(pageKey) {
  const config = THEMATIC_PAGE_CONFIG[pageKey];
  if (!config) return;

  const heroTitle = document.querySelector("#divTitleHeader h1");
  if (heroTitle) heroTitle.textContent = config.title;

  const gridTitle = document.querySelector(".pubmed-grid .grid-header h3");
  if (gridTitle) gridTitle.textContent = config.gridTitle;

  const tagsContainer = document.querySelector(".hero-tags");
  if (tagsContainer) {
    tagsContainer.innerHTML = config.tags.map((tag) => (
      `<a href="#" class="tag-link" data-tag="${escapeAttr(tag.toLowerCase())}">${escapeAttr(tag)}</a>`
    )).join("");
  }

  const featuredTitle = document.querySelector(".featured-pubmed h2");
  const featuredDesc = document.querySelector(".featured-pubmed p");
  const featuredLink = document.querySelector(".featured-pubmed .pubmed-link");
  const featuredImg = document.querySelector(".featured-pubmed img");
  if (featuredTitle) featuredTitle.textContent = config.featured.title;
  if (featuredDesc) featuredDesc.textContent = config.featured.desc;
  if (featuredLink) featuredLink.href = config.featured.url;
  if (featuredImg) {
    featuredImg.src = config.featured.img;
    featuredImg.alt = config.featured.title;
    featuredImg.onerror = () => {
      featuredImg.onerror = null;
      featuredImg.src = fallbackImage(config.featured.title || "DOD", 560, 315);
    };
  }

  const filtersContainer = document.querySelector(".pubmed-grid .filters");
  if (filtersContainer) {
    filtersContainer.innerHTML = config.filters.map((filter, index) => (
      `<button class="chip${index === 0 ? " active" : ""}" data-pub-filter="${escapeAttr(filter.id)}" type="button">${escapeAttr(filter.label)}</button>`
    )).join("");
  }

  renderThematicPubMedGrid(pageKey, "all");
  document.querySelectorAll("[data-pub-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-pub-filter]").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      renderThematicPubMedGrid(pageKey, button.dataset.pubFilter || "all");
    });
  });
}

function seededImage(seed, w = 1400) {
  const h = Math.round(w * 0.72);
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function randomImage(seedBase, w = 1400) {
  return seededImage(`${seedBase}-${Date.now()}-${Math.random()}`, w);
}

function escapeSvgText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function inlineSvgFallback(label, w = 900, h = 1200) {
  const safeLabel = escapeSvgText(label || "DOD Performance").slice(0, 64);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0B1220" />
          <stop offset="100%" stop-color="#1F2937" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="#E5E7EB" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI"
            font-size="${Math.max(18, Math.floor(w * 0.045))}">
        ${safeLabel}
      </text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function fallbackImage(label, w = 900, h = 1200) {
  return inlineSvgFallback(label, w, h);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`MeSH HTTP ${response.status}`);
  }
  return response.json();
}

function meshIdFromResource(resource = "") {
  const parts = String(resource).split("/");
  return parts[parts.length - 1] || "";
}

function toMeshUri(id = "") {
  return `http://id.nlm.nih.gov/mesh/${id}`;
}

async function lookupDescriptor(label, options = {}) {
  const match = options.match || "exact";
  const year = options.year || "current";
  const query = new URLSearchParams({
    label,
    match,
    limit: "5",
    year
  });

  const url = `${MESH_LOOKUP_BASE}/descriptor?${query.toString()}`;
  return fetchJson(url);
}

async function runSparql(query) {
  const params = new URLSearchParams({
    query,
    format: "JSON",
    inference: "true"
  });
  return fetchJson(`${MESH_SPARQL_ENDPOINT}?${params.toString()}`);
}

function mapSparqlRows(rows = [], key) {
  return [...new Set(rows.map(row => row?.[key]?.value).filter(Boolean))];
}

async function fetchMeshHierarchy(descriptorId) {
  const descriptorUri = toMeshUri(descriptorId);
  const prefix = `
PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`;

  const hierarchyQuery = `
${prefix}
SELECT DISTINCT ?tree ?parent ?parentLabel WHERE {
  <${descriptorUri}> meshv:treeNumber ?tree .
  OPTIONAL {
    <${descriptorUri}> meshv:broaderDescriptor ?parent .
    OPTIONAL {
      ?parent rdfs:label ?parentLabel .
      FILTER (lang(?parentLabel) = "" || langMatches(lang(?parentLabel), "en"))
    }
  }
}
`;

  const childrenQuery = `
${prefix}
SELECT DISTINCT ?child ?childLabel WHERE {
  ?child meshv:broaderDescriptor <${descriptorUri}> .
  OPTIONAL {
    ?child rdfs:label ?childLabel .
    FILTER (lang(?childLabel) = "" || langMatches(lang(?childLabel), "en"))
  }
}
LIMIT 25
`;

  const [hierarchyRes, childrenRes] = await Promise.all([
    runSparql(hierarchyQuery),
    runSparql(childrenQuery)
  ]);

  const hierarchyRows = hierarchyRes?.results?.bindings || [];
  const childrenRows = childrenRes?.results?.bindings || [];

  const treeNumbers = mapSparqlRows(hierarchyRows, "tree").map(meshIdFromResource);

  const parentsMap = new Map();
  hierarchyRows.forEach(row => {
    const resource = row?.parent?.value;
    if (!resource) return;
    const id = meshIdFromResource(resource);
    parentsMap.set(id, {
      id,
      label: row?.parentLabel?.value || id,
      resource
    });
  });

  const childrenMap = new Map();
  childrenRows.forEach(row => {
    const resource = row?.child?.value;
    if (!resource) return;
    const id = meshIdFromResource(resource);
    childrenMap.set(id, {
      id,
      label: row?.childLabel?.value || id,
      resource
    });
  });

  return {
    treeNumbers: [...new Set(treeNumbers)].sort(),
    parents: [...parentsMap.values()],
    children: [...childrenMap.values()]
  };
}

async function resolveDescriptor(label, options = {}) {
  const year = options.year || "current";

  try {
    const exact = await lookupDescriptor(label, { match: "exact", year });
    if (Array.isArray(exact) && exact.length > 0) return exact[0];
  } catch (_) {
    // segue para contains
  }

  const contains = await lookupDescriptor(label, { match: "contains", year });
  return Array.isArray(contains) && contains.length > 0 ? contains[0] : null;
}

function extractTreeNumbers(payload) {
  const raw = JSON.stringify(payload || {});
  const match = raw.match(/\/mesh\/([A-Z]\d{1,3}(?:\.\d{1,3})+)/g) || [];
  const values = match.map(token => token.replace("/mesh/", ""));
  return [...new Set(values)];
}

async function resolveMeshTerm(label, options = {}) {
  const year = options.year || "current";
  const match = options.match || "exact";
  const cacheKey = `${label}::${year}::${match}`;
  if (meshCache.has(cacheKey)) return meshCache.get(cacheKey);

  const descriptor = await resolveDescriptor(label, { year, match });
  if (!descriptor) {
    const notFound = { input: label, found: false };
    meshCache.set(cacheKey, notFound);
    return notFound;
  }

  const descriptorId = meshIdFromResource(descriptor.resource);

  let details = null;
  let treeNumbers = [];
  let parents = [];
  let children = [];

  try {
    details = await fetchJson(`${MESH_LOOKUP_BASE}/details?descriptor=${encodeURIComponent(descriptorId)}`);
  } catch (_) {
    details = null;
  }

  try {
    const hierarchy = await fetchMeshHierarchy(descriptorId);
    treeNumbers = hierarchy.treeNumbers || [];
    parents = hierarchy.parents || [];
    children = hierarchy.children || [];
  } catch (_) {
    // fallback no JSON do descriptor
  }

  try {
    if (treeNumbers.length === 0) {
      const descriptorJson = await fetchJson(`https://id.nlm.nih.gov/mesh/${encodeURIComponent(descriptorId)}.json`);
      treeNumbers = extractTreeNumbers(descriptorJson);
    }
  } catch (_) {
    treeNumbers = [];
  }

  const result = {
    input: label,
    found: true,
    id: descriptorId,
    label: descriptor.label || label,
    resource: descriptor.resource,
    treeNumbers,
    parents,
    children,
    details
  };

  meshCache.set(cacheKey, result);
  return result;
}

async function runMeshExecution(term, options = {}) {
  const input = String(term || "").trim();
  if (!input) {
    throw new Error("Informe um termo MeSH");
  }

  const year = options.year || "current";
  const match = options.match || "exact";
  const data = await resolveMeshTerm(input, { year, match });
  return {
    termo: input,
    match,
    year,
    encontrado: data.found,
    id: data.id || null,
    arvore: data.treeNumbers || [],
    pais: data.parents || [],
    filhos: data.children || [],
    resource: data.resource || null
  };
}

if (typeof window !== "undefined") {
  window.dodMeshExecute = runMeshExecution;
}

function getTermsPreview(terms = []) {
  if (!Array.isArray(terms) || terms.length === 0) return "Sem termos alternativos.";
  return terms.slice(0, 6).join(", ");
}

function getNodePreview(nodes = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) return "Indisponível";
  return nodes.slice(0, 6).map(node => node.label || node.id).join(", ");
}

function buildMeshModal() {
  let modal = document.getElementById("meshModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "meshModal";
  modal.className = "mesh-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <button class="mesh-modal-backdrop" type="button" aria-label="Fechar modal MeSH"></button>
    <section class="mesh-modal-panel" role="dialog" aria-modal="true" aria-label="Dados MeSH do card">
      <header class="mesh-modal-top">
        <div>
          <p class="mesh-kicker">Open MeSH API • DOD</p>
          <h3 class="mesh-title">Carregando dados MeSH...</h3>
        </div>
        <button class="mesh-close" type="button" aria-label="Fechar">✕</button>
      </header>
      <div class="mesh-modal-body"></div>
    </section>
  `;

  const close = () => {
    modal.hidden = true;
    modal.classList.remove("active");
    document.documentElement.classList.remove("hh-lock");
  };

  modal.querySelector(".mesh-close")?.addEventListener("click", close);
  modal.querySelector(".mesh-modal-backdrop")?.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      close();
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function renderMeshResult(label, data) {
  if (!data.found) {
    return `
      <article class="mesh-card">
        <h4>${label}</h4>
        <p>Termo não localizado na Open MeSH API.</p>
      </article>
    `;
  }

  const terms = data.details?.terms || [];
  const tree = data.treeNumbers.length > 0 ? data.treeNumbers.join(" • ") : "Indisponível";
  const parents = getNodePreview(data.parents);
  const children = getNodePreview(data.children);

  return `
    <article class="mesh-card">
      <h4>${data.label}</h4>
      <p><strong>ID:</strong> ${data.id}</p>
      <p><strong>Tree:</strong> ${tree}</p>
      <p><strong>Pais:</strong> ${parents}</p>
      <p><strong>Filhos:</strong> ${children}</p>
      <p><strong>Sinônimos:</strong> ${getTermsPreview(terms)}</p>
      <a href="${data.resource}" target="_blank" rel="noopener">Abrir descriptor</a>
    </article>
  `;
}

async function openMeshModal(item) {
  if (!item?.mesh?.primary) return;

  const modal = buildMeshModal();
  const titleEl = modal.querySelector(".mesh-title");
  const bodyEl = modal.querySelector(".mesh-modal-body");

  if (!titleEl || !bodyEl) return;

  titleEl.textContent = `${item.title} • ${item.mesh.primary}`;
  bodyEl.innerHTML = `<p class="mesh-loading">Consultando Open MeSH API...</p>`;

  modal.hidden = false;
  modal.classList.add("active");
  document.documentElement.classList.add("hh-lock");

  try {
    const labels = [item.mesh.primary, ...(item.mesh.secondary || [])];
    const results = await Promise.all(labels.map(resolveMeshTerm));

    bodyEl.innerHTML = `
      <div class="mesh-grid">
        ${results.map((result, index) => renderMeshResult(labels[index], result)).join("")}
      </div>
    `;
  } catch (_) {
    bodyEl.innerHTML = `
      <article class="mesh-card">
        <h4>Falha temporária</h4>
        <p>Não foi possível consultar a Open MeSH API agora. Tente novamente em alguns segundos.</p>
      </article>
    `;
  }
}

// Slider
let slideIndex = 0;
let isPaused = false;
let timer = null;

function setSlide(el, src, label = "DOD") {
  const probe = new Image();
  probe.onload = () => {
    el.style.backgroundImage = `url("${src}")`;
  };
  probe.onerror = () => {
    el.style.backgroundImage = `url("${fallbackImage(label, 1600, 1000)}")`;
  };
  probe.src = src;
}

function updateSlider() {
  const a = document.getElementById("slide0");
  const b = document.getElementById("slide1");
  const titleEl = document.getElementById("slideTitle");
  const descEl = document.getElementById("slideDesc");
  if (!a || !b || !titleEl || !descEl) return;

  const next = SOURCES[slideIndex % SOURCES.length];

  const src = next.id === "neuro" ? PRIMARY_NEURO_IMAGE : seededImage(`hero-${next.id}-${slideIndex}`, 1600);
  const aOn = a.classList.contains("on");
  const show = aOn ? b : a;
  const hide = aOn ? a : b;

  setSlide(show, src, next.title);
  hide.classList.remove("on");
  show.classList.add("on");

  titleEl.textContent = next.title.toUpperCase();
  descEl.textContent = next.desc;

  slideIndex++;
}

function startSlider() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!isPaused) updateSlider();
  }, 5200);
}

// Feed masonry
const feedEl = document.getElementById("feed");

function pickVariant(i) {
  // Mantem feed com cards uniformes (sem tamanhos anormais).
  return "";
}

function getCardImage(item, variant, index) {
  const width = variant === "wide" ? 1200 : 900;
  const pool = LOCAL_ASSETS[item.id] || [];

  if (pool.length > 0) {
    return pool[index % pool.length];
  }

  return seededImage(`card-${item.id}-${index}`, width);
}

function buildNeuroFeatureCard(data = FEATURE_NEURO_CARD) {
  const card = document.createElement("section");
  card.className = "card dod-card neuro-card card-feature";
  card.dataset.cat = data.category;
  card.dataset.tags = (data.tags || []).join(",").toLowerCase();

  const searchable = [
    data.title,
    data.desc,
    ...(data.tags || []),
    ...(Array.isArray(data.content) ? data.content.map(block => `${block.h} ${block.p}`) : [String(data.content || "")])
  ];
  card.dataset.text = searchable.join(" ").toLowerCase();

  const content = document.createElement("div");
  content.className = "card-content";

  const media = document.createElement("div");
  media.className = "card-media";

  const img = document.createElement("img");
  img.src = data.image || data.img || PRIMARY_NEURO_IMAGE;
  img.alt = "Polilaminina e regeneração neural";
  img.loading = "lazy";
  img.decoding = "async";
  img.onerror = () => {
    if (img.src !== PRIMARY_NEURO_IMAGE) {
      img.src = PRIMARY_NEURO_IMAGE;
      img.onerror = () => {
        img.onerror = null;
        img.src = fallbackImage("Neuro", 1200, 750);
      };
      return;
    }

    img.onerror = null;
    img.src = fallbackImage("Neuro", 1200, 750);
  };
  media.appendChild(img);

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = (data.tags || []).slice(0, 3).map(label => String(label).toUpperCase()).join(" • ") || "NEURO • DOD";

  const title = document.createElement("h2");
  title.className = "title";
  title.textContent = data.title;

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = data.desc;

  const sourceBtn = document.createElement("button");
  sourceBtn.className = "source-btn";
  sourceBtn.textContent = "fonte científica";
  sourceBtn.onclick = openNeuroModal;

  const info = document.createElement("details");
  info.className = "details";

  const summary = document.createElement("summary");
  summary.textContent = "ler";
  info.appendChild(summary);

  if (Array.isArray(data.content) && data.content.length > 0) {
    for (const block of data.content) {
      const h3 = document.createElement("h3");
      h3.textContent = block.h;

      const p = document.createElement("p");
      p.textContent = block.p;

      info.append(h3, p);
    }
  } else {
    const detailsText = document.createElement("p");
    detailsText.className = "details-text";
    detailsText.textContent = (data.content || "").trim();
    info.appendChild(detailsText);
  }

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const badges = (data.tags || []).slice(0, 2).map(label => String(label).toUpperCase());
  for (const label of badges.length ? badges : ["NEURO", "DOD"]) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = label;
    footer.appendChild(chip);
  }

  content.append(media, tag, title, subtitle, sourceBtn, info, footer);
  card.append(content);

  requestAnimationFrame(() => card.classList.add("is-live"));
  return card;
}

function buildCard(item, i) {
  const variant = pickVariant(i);
  const card = document.createElement("article");
  card.className = `card ${variant}`.trim();
  card.dataset.cat = item.id;
  card.dataset.title = item.desc;
  card.dataset.text = `${item.title} ${item.desc} ${item.query} ${item.mesh?.primary || ""} ${(item.mesh?.secondary || []).join(" ")}`.toLowerCase();

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = item.title;
  img.src = getCardImage(item, variant, i);

  img.onerror = () => {
    const fallback = seededImage(`fallback-${item.id}-${i}`, variant === "wide" ? 1200 : 900);

    if (img.src.includes("/assets/")) {
      img.src = fallback;
      img.onerror = () => {
        img.onerror = null;
        img.src = fallbackImage(item.title);
      };
      return;
    }

    img.onerror = null;
    img.src = fallbackImage(item.title);
  };

  const meta = document.createElement("div");
  meta.className = "meta";

  const text = document.createElement("div");
  text.className = "t";
  text.textContent = item.desc;

  const meshLine = document.createElement("div");
  meshLine.className = "mesh-line";
  if (item.mesh?.primary) {
    meshLine.textContent = `MeSH: ${item.mesh.primary}`;
  }

  const tags = document.createElement("div");
  tags.className = "tags";

  const tag1 = document.createElement("span");
  tag1.className = "tag";
  tag1.textContent = item.id;

  const tag2 = document.createElement("span");
  tag2.className = "tag";
  tag2.textContent = "DOD";

  tags.append(tag1, tag2);

  if (item.mesh?.primary) {
    const meshBtn = document.createElement("button");
    meshBtn.type = "button";
    meshBtn.className = "mesh-open-btn";
    meshBtn.textContent = "mesh";
    meshBtn.title = `MeSH principal: ${item.mesh.primary}`;
    meshBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openMeshModal(item);
    });
    tags.appendChild(meshBtn);
  }
  if (meshLine.textContent) {
    meta.append(text, meshLine, tags);
  } else {
    meta.append(text, tags);
  }
  card.append(img, meta);

  card.addEventListener("click", () => {
    img.src = randomImage(`${item.query}-refresh`, variant === "wide" ? 1200 : 900);
  });

  requestAnimationFrame(() => card.classList.add("is-live"));
  return card;
}

function renderFeed({ shuffle = false } = {}) {
  if (!feedEl) return;
  feedEl.innerHTML = "";

  // Primeiro card fixo: Neuro/Polilaminina
  feedEl.appendChild(buildNeuroFeatureCard());

  const items = [];
  for (let round = 0; round < 4; round++) {
    for (const source of SOURCES) items.push(source);
  }

  if (shuffle) {
    items.sort(() => Math.random() - 0.5);
  }

  items.forEach((item, i) => feedEl.appendChild(buildCard(item, i + 1)));
}

// Filter/search
let currentFilter = "all";
const chips = [...document.querySelectorAll(".bar .chip[data-filter]")];

function applyFilter() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  [...document.querySelectorAll(".card")].forEach(card => {
    const categoryOk = currentFilter === "all" || card.dataset.cat === currentFilter;
    const textOk = !query || (card.dataset.text || "").includes(query);
    card.style.display = categoryOk && textOk ? "" : "none";
  });
}

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.filter || "all";
    applyFilter();
  });
});

const searchInput = document.getElementById("searchInput");
if (searchInput) searchInput.addEventListener("input", applyFilter);

// Buttons
const shuffleBtn = document.getElementById("shuffleBtn");
if (shuffleBtn) {
  shuffleBtn.addEventListener("click", () => {
    renderFeed({ shuffle: true });
    applyFilter();
  });
}

const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "play" : "pause";
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.textContent = isPaused ? "paused" : "auto";
  });
}

const pageKey = detectPageKey();
const hasThematicGrid = Boolean(document.getElementById("pubmedCardsGrid"));

async function initializeSurface() {
  mountEditorialToggle();

  const editorialMode = shouldEnableEditorialMode();
  if (editorialMode) {
    const editorialConfig = await fetchEditorialConfig();
    if (editorialConfig) {
      applyEditorialConfig(editorialConfig);
    }
  }

  if (hasThematicGrid && pageKey !== "index") {
    initThematicPage(pageKey);
  }

  if (feedEl) {
    renderFeed();
    applyFilter();
  }

  if (document.getElementById("slide0") && document.getElementById("slide1")) {
    updateSlider();
    startSlider();
  }
}

initializeSurface();

function openNeuroModal() {
  if (document.getElementById("neuroModal")) return;

  const modal = document.createElement("div");
  modal.id = "neuroModal";
  modal.className = "neuro-modal";

  modal.innerHTML = `
    <div class="neuro-modal-content">
      <button class="neuro-close">×</button>
      <h2>Polilaminina e Neuroregeneração</h2>
      <p>
        A polilaminina é um biomaterial baseado em laminina que atua na matriz
        extracelular do sistema nervoso, promovendo adesão celular, crescimento
        axonal e plasticidade neural estrutural.
      </p>
      <p>
        Em lesões da medula espinhal, cria um microambiente bioativo que favorece
        reorganização sináptica e regeneração neural, sendo uma abordagem de
        neurociência translacional avançada.
      </p>
      <a href="https://www.gov.br/saude/pt-br/assuntos/noticias/2026/janeiro/ministerio-da-saude-e-anvisa-anunciam-aprovacao-de-estudo-clinico-para-tratamento-inovador-de-lesoes-na-medula-espinhal"
         target="_blank" class="neuro-link">
         Ver fonte oficial (gov.br)
      </a>
    </div>
  `;

  document.body.appendChild(modal);

  modal.onclick = (e) => {
    if (e.target.classList.contains("neuro-modal") ||
        e.target.classList.contains("neuro-close")) {
      modal.remove();
    }
  };
}

(() => {
  const inline = document.getElementById("hh-inline");
  const modal  = document.querySelector(".hh-modal");
  const readMore = inline?.querySelector(".hh-readmore");
  if (!inline || !modal) return;

  const lock = () => document.documentElement.classList.add("hh-lock");
  const unlock = () => document.documentElement.classList.remove("hh-lock");

  const openInline = () => {
    inline.hidden = false;
    inline.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const closeInline = () => { inline.hidden = true; };

  const openModal = () => {
    modal.hidden = false;
    modal.classList.add("active");
    lock();
  };
  const closeModal = () => {
    modal.classList.remove("active");
    modal.hidden = true;
    unlock();
  };

  // Modal
  document.querySelectorAll("[data-hh-open-modal]").forEach(btn => btn.addEventListener("click", openModal));
  document.querySelectorAll("[data-hh-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));

  // Inline
  document.querySelectorAll("[data-hh-close-inline]").forEach(btn => btn.addEventListener("click", closeInline));
  document.querySelectorAll("[data-hh-toggle-read]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!readMore) return;
      const isHidden = readMore.hidden;
      readMore.hidden = !isHidden;
      btn.textContent = isHidden ? "recolher" : "ler";
    });
  });

  // ESC fecha modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // ====== DETECÇÃO BLINDADA DO CARD ======
  // 1) tenta achar containers comuns de card
  const cardSelectors = [
    ".card", ".post", ".tile", ".item",
    "article", "a", "button", "div"
  ].join(",");

  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

  const isSynapseCard = (el) => {
    const t = norm(el.innerText);

    // caminho A: pelo título (se você manter)
    const hasTitle = t.includes("sinapse, rede e foco");

    // caminho B: pelas tags (mais robusto)
    // seu DOM mostra "neuro" e "DOD" como linhas/labels do card
    const hasNeuro = t.includes("neuro");
    const hasDOD = t.includes("dod");

    // caminho C: fallback por alt da imagem (se você ajustar alt no futuro)
    const imgAlt = norm(el.querySelector("img")?.getAttribute("alt"));
    const altMatch = imgAlt.includes("neuro") || imgAlt.includes("sinapse");

    return (hasTitle && hasNeuro && hasDOD) || ((hasNeuro && hasDOD) && altMatch);
  };

  // 2) busca cards e adiciona click
  const cards = Array.from(document.querySelectorAll(cardSelectors))
    .filter(el => el && el.offsetParent !== null) // visível
    .filter(isSynapseCard);

  const attach = (node) => {
    node.style.cursor = "pointer";
    node.addEventListener("click", (e) => {
      // não sequestrar links externos de verdade
      const a = e.target?.closest?.("a[href]");
      if (a && a.getAttribute("href") && !a.getAttribute("href").startsWith("#")) return;

      openInline();
    });
  };

  cards.forEach(attach);

})();

(() => {
  const grid = document.getElementById("cardsGrid");
  const modal = document.getElementById("modal");
  if (!grid || !modal) return;

  const MANUAL_CARDS = [
    {
      id: "polilaminina_neuro",
      category: "neuro",
      title: "Polilaminina e Regeneração Neural",
      oneLiner: "Biomaterial neuroregenerativo aprovado para estudo clínico em lesão medular (Brasil, 2026).",
      tags: ["Neuro", "Science", "DOD"],
      imageA: "/assets/neuro-polilaminina.jpg",
      imageB: "/assets/synapse-neuro-3d.svg",
      imageC: "/assets/hh-neuron.png",
      sourceUrl: "#hh-inline",
      ctaLabel: "Fonte científica",
      citation: "Polilaminina e regeneração neural no DOD Performance.",
      starter: {
        question: "Como a polilaminina pode apoiar regeneração neural após lesão medular?",
        finding: "A matriz bioativa favorece crescimento axonal, plasticidade neural e reorganização sináptica.",
        practical: "Usar o card como entrada para leitura científica e contexto translacional brasileiro."
      },
      bullets: [
        "Biomaterial derivado da laminina, ligado à matriz extracelular neural.",
        "Apoia microambiente favorável para regeneração axonal e plasticidade.",
        "Conecta fisiologia, lesão medular aguda e pesquisa clínica translacional."
      ],
      apply: [
        "Reposicionar o card como vitrine de neuroregeneração no DOD.",
        "Levar para bloco expandido com leitura, fonte e contexto fisiológico."
      ]
    },
    {
      id: "neuro_sleep_plasticity",
      category: "neuro",
      title: "Sono e Plasticidade Sináptica",
      oneLiner: "Dormir é também editar sinapses: o cérebro limpa ruído e consolida traços úteis.",
      imgA: "/assets/minimal-cards/neuro_sleep_plasticity.svg",
      imgB: "/assets/neuro/neuro_sleep_plasticity_b.png",
      mesh: {
        term: "Sleep",
        uri: "https://meshb.nlm.nih.gov/record/ui?ui=D012893",
        tree: "F02.830"
      },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK19956/",
      starter: {
        question: "Como o sono modula plasticidade sináptica e consolidação de memória?",
        finding: "Fases de sono ajustam força sináptica, removem conexões irrelevantes e consolidam traços estáveis.",
        practical: "Usar o sono como variável de treino cognitivo e recuperação neural no DOD."
      },
      bullets: [
        "Sono profundo favorece consolidação declarativa.",
        "Sono REM consolida padrões emocionais e motores.",
        "Privação de sono aumenta ruído e reduz performance cognitiva."
      ],
      apply: [
        "Integrar higiene do sono aos protocolos de foco e performance.",
        "Usar o card em educação de atleta/paciente sobre recuperação neural."
      ]
    },
    {
      id: "neuro_chronic_pain_central",
      category: "neuro",
      title: "Dor Crônica e Sensibilização Central",
      oneLiner: "Quando o sistema de dor entra em overdrive, o estímulo não explica mais o sofrimento.",
      imgA: "/assets/minimal-cards/neuro_chronic_pain_central.svg",
      imgB: "/assets/neuro/neuro_chronic_pain_central_b.png",
      mesh: {
        term: "Central Sensitization",
        uri: "https://meshb.nlm.nih.gov/record/ui?ui=D000073866",
        tree: "C10.597.617"
      },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK553030/",
      starter: {
        question: "O que caracteriza sensibilização central na dor crônica?",
        finding: "Circuitos nociceptivos ampliam ganho, reduzem limiar e mantêm dor mesmo com pouco dano periférico.",
        practical: "Enxergar dor crônica como fenômeno de rede, não apenas de tecido."
      },
      bullets: [
        "Aumento de excitabilidade em medula e estruturas suprassegmentares.",
        "Falha de inibição descendente e modulação da dor.",
        "Contexto emocional e cognitivo amplifica a resposta dolorosa."
      ],
      apply: [
        "No DOD: explicar dor sem catastrofizar estrutura, focando em rede.",
        "Usar o card como base para educação em dor e progressão de exposição ao movimento."
      ]
    },
    {
      id: "neuro_attention_networks",
      category: "neuro",
      title: "Redes de Atenção e Foco",
      oneLiner: "Foco é um padrão de rede: seleção, inibição e sincronização em tempo real.",
      imgA: "/assets/minimal-cards/neuro_attention_networks.svg",
      imgB: "/assets/neuro/neuro_attention_networks_b.png",
      mesh: {
        term: "Attention",
        uri: "https://meshb.nlm.nih.gov/record/ui?ui=D001284",
        tree: "F02.463.188"
      },
      source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4381269/",
      starter: {
        question: "Como redes neurais sustentam atenção e foco em tarefas complexas?",
        finding: "Redes de controle executivo, saliência e modo padrão ajustam seleção de informação e inibição de distrações.",
        practical: "Tratar foco como variável treinável de rede, não apenas força de vontade."
      },
      bullets: [
        "Rede de saliência detecta o que importa no momento.",
        "Rede executiva ajusta regras, metas e controle top-down.",
        "Inibição ativa reduz ruído sensorial e cognitivo."
      ],
      apply: [
        "No DOD: desenhar treinos que combinam carga física e demanda de foco progressivo.",
        "Usar o card como ponte entre neurociência de atenção e desenho de sessão (neuro • physio • sport)."
      ]
    },
    {
      id: "mesh_updates_2026_live",
      category: "neuro",
      title: "Atualizacoes MeSH 2026 (NLM)",
      oneLiner: "Indice MeSH oficial com mudancas recentes para cards cientificos DOD.",
      tags: ["MeSH", "NLM", "Atualizacao"],
      imageA: "/assets/mesh-updates/mesh-update-1.svg",
      imageB: "/assets/mesh-updates/mesh-update-2.svg",
      imageC: "/assets/mesh-updates/mesh-update-3.svg",
      meshTerm: "Medical Subject Headings",
      meshUri: "https://id.nlm.nih.gov/mesh/",
      sourceUrl: "https://id.nlm.nih.gov/mesh/sparql",
      citation: "NLM MeSH SPARQL endpoint (2026 updates): https://id.nlm.nih.gov/mesh/sparql",
      starter: {
        question: "Quais descritores novos/modificados devem orientar os cards cientificos do DOD?",
        finding: "Curadoria MeSH 2026 ativa com atualizacoes por data de revisao e estabelecimento.",
        practical: "Aplicar os termos MeSH mais recentes para manter os cards alinhados a indexacao biomedica oficial."
      },
      bullets: [
        "Fonte primaria: NLM MeSH RDF/SPARQL.",
        "Atualizacao periodica para novos descritores e revisoes.",
        "Uso direto em cards com foco neuro, physio e sport."
      ],
      apply: [
        "Card ancora para monitoramento de mudancas MeSH.",
        "Padronizar resumo e tagueamento com descritores oficiais."
      ]
    },
    // ===== NEURO (4) =====
    {
      id: "neuro_action_potential",
      category: "neuro",
      title: "Potencial de Ação",
      oneLiner: "A onda bioelétrica que vira linguagem neural.",
      imgA: "/assets/minimal-cards/neuro_action_potential.svg",
      imgB: "/assets/neuro/neuro_action_potential_b.png",
      mesh: { term: "Action Potentials", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D000069", tree: "A08.663.358" },
      source: "https://journals.physiology.org/doi/full/10.1113/jphysiol.1952.sp004764",
      starter: [
        "Simular Na+ e K+ (condutâncias) em modelos tipo Hodgkin-Huxley.",
        "Comparar condução em axônios mielinizados vs não mielinizados."
      ],
      bullets: ["Na+ despolariza.", "K+ repolariza.", "Refratariedade define frequência."],
      apply: ["Base do card Neuro: foco é também um estado bioelétrico."]
    },
    {
      id: "neuro_synapse_close",
      category: "neuro",
      title: "Sinapse em Close",
      oneLiner: "Vesículas, receptores e ruído que vira sinal.",
      imgA: "/assets/minimal-cards/neuro_synapse_close.svg",
      imgB: "/assets/neuro/neuro_synapse_close_b.png",
      mesh: { term: "Synapses", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D013579", tree: "A08.663.670" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK11113/",
      starter: ["Mapear tipos de receptores (ionotrópicos vs metabotrópicos).", "Modelar integração sináptica (EPSP/IPSP)."],
      bullets: ["Liberação vesicular é probabilística.", "Receptores determinam cinética.", "Plasticidade altera ganho."],
      apply: ["No DOD: usar como base para rede e foco + plasticidade."]
    },
    {
      id: "neuro_network_activation",
      category: "neuro",
      title: "Rede Neural Funcional",
      oneLiner: "Padrões de disparo e sincronização que criam atenção.",
      imgA: "/assets/minimal-cards/neuro_network_activation.svg",
      imgB: "/assets/neuro/neuro_network_activation_b.png",
      mesh: { term: "Neural Networks (Computer)", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D009474", tree: "L01.178.847.652" },
      source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4381269/",
      starter: ["Comparar sincronização (theta/gamma) com desempenho atencional.", "Criar modelo simples de rede excitatória-inibitória."],
      bullets: ["Foco envolve seleção.", "Inibição reduz ruído.", "Sincronia aumenta precisão."],
      apply: ["No DOD: card Sinapse, rede e foco com visual e resumo prático."]
    },
    {
      id: "neuro_myelin_saltatory",
      category: "neuro",
      title: "Mielina e Condução Saltatória",
      oneLiner: "Velocidade, eficiência e nós de Ranvier em ação.",
      imgA: "/assets/minimal-cards/neuro_myelin_saltatory.svg",
      imgB: "/assets/neuro/neuro_myelin_saltatory_b.png",
      mesh: { term: "Myelin Sheath", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D009220", tree: "A08.663.650.600" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK27954/",
      starter: ["Relacionar mielina e velocidade de condução.", "Estudar desmielinização e impacto funcional."],
      bullets: ["Condução pula nós.", "Menor gasto energético.", "Alta velocidade."],
      apply: ["No DOD: performance neural e fadiga sensório-motora."]
    },

    // ===== PHYSIO (2) =====
    {
      id: "physio_autonomic_recovery",
      category: "homeo",
      title: "Recuperação Autonômica pós-Exercício",
      oneLiner: "Como o corpo desliga o modo luta-fuga depois da sessão.",
      imgA: "/assets/minimal-cards/physio_autonomic_recovery.svg",
      imgB: "/assets/physio/physio_autonomic_recovery_b.png",
      mesh: {
        term: "Autonomic Nervous System",
        uri: "https://meshb.nlm.nih.gov/record/ui?ui=D001345",
        tree: "A08.800.050"
      },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK538172/",
      starter: {
        question: "O que acontece com o sistema nervoso autônomo na recuperação pós-exercício?",
        finding: "Após o esforço, a atividade simpática cai, o parassimpático sobe e variáveis como frequência cardíaca e pressão retornam ao basal.",
        practical: "Ler recuperação como ajuste autonômico, não só 'cansaço' muscular."
      },
      bullets: [
        "Barorreceptores ajudam a estabilizar a pressão após a sessão.",
        "Aumento da variabilidade da FC indica recuperação parassimpática.",
        "Déficits nessa recuperação se associam a maior risco cardiovascular."
      ],
      apply: [
        "No DOD: usar FC e percepção de esforço para modular carga entre sessões.",
        "Educar paciente/atleta sobre sinais de má recuperação autonômica."
      ]
    },
    {
      id: "physio_thermoregulation",
      category: "homeo",
      title: "Termorregulação",
      oneLiner: "Hipotálamo como termostato biológico.",
      imgA: "/assets/minimal-cards/physio_thermoregulation.svg",
      imgB: "/assets/physio/physio_thermoregulation_b.png",
      mesh: { term: "Body Temperature Regulation", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D001839", tree: "G11.561.731" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK554538/",
      starter: ["Comparar sudorese vs vasodilatação.", "Estudar performance em calor."],
      bullets: ["Vasos + suor dissipam calor.", "Tremor gera calor.", "Aclimatação adapta."],
      apply: ["No DOD: adaptação ao treino e ambiente."]
    },

    // ===== SPORT (2) =====
    {
      id: "sport_interval_vo2",
      category: "sport",
      title: "Intervalos e VO2",
      oneLiner: "Blocos de esforço que empurram o consumo de O2 para cima com inteligência.",
      imgA: "/assets/minimal-cards/sport_interval_vo2.svg",
      imgB: "/assets/sport/sport_interval_vo2_b.png",
      mesh: {
        term: "Oxygen Consumption",
        uri: "https://meshb.nlm.nih.gov/record/ui?ui=D010066",
        tree: "G09.188.261"
      },
      source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12387642/",
      starter: {
        question: "Como treinos intervalados modulam consumo de oxigênio e adaptação cardiorrespiratória?",
        finding: "Intervalos bem doseados elevam VO2 durante e após o exercício, estimulando adaptações cardíacas, pulmonares e musculares.",
        practical: "Usar intervalos como ferramenta de precisão para VO2, não só 'treino puxado'."
      },
      bullets: [
        "Durante o esforço, VO2 pode aumentar múltiplas vezes em relação ao repouso.",
        "Recuperação pós-exercício também contribui para o custo total de O2.",
        "Variáveis como idade, composição corporal e condição modulam resposta."
      ],
      apply: [
        "No DOD: desenhar blocos de intervalo ajustados ao nível e objetivo do atleta.",
        "Usar VO2 e percepção de esforço como linguagem para explicar progresso."
      ]
    },
    {
      id: "sport_neural_strength",
      category: "sport",
      title: "Força Neural",
      oneLiner: "Coordenação, recrutamento e taxa de disparo antes do músculo crescer.",
      imgA: "/assets/minimal-cards/sport_neural_strength.svg",
      imgB: "/assets/sport/sport_neural_strength_b.png",
      mesh: {
        term: "Motor Neurons",
        uri: "https://meshb.nlm.nih.gov/record/ui?ui=D009037",
        tree: "A08.663.650.447"
      },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK539724/",
      starter: {
        question: "Que adaptações neurais explicam ganhos iniciais de força no treino?",
        finding: "Recrutamento mais eficiente de unidades motoras e melhor sincronização aumentam força antes de grandes mudanças estruturais.",
        practical: "Mostrar que força começa no neurônio, não só na hipertrofia."
      },
      bullets: [
        "Princípio do tamanho governa a ordem de recrutamento.",
        "Treino melhora coordenação inter e intramuscular.",
        "Ajustes neurais reduzem coativação desnecessária e economizam energia."
      ],
      apply: [
        "No DOD: explicar ganhos rápidos de força sem 'crescer' como adaptação neural.",
        "Usar o card para desenhar fases de treino focadas em técnica e comando neuromuscular."
      ]
    },

    // ===== HOMEOSTASE / ADAPTAÇÃO (4) =====
    {
      id: "homeo_sraa",
      category: "homeo",
      title: "SRAA e Volume",
      oneLiner: "Pressão e sódio em modo piloto automático.",
      imgA: "/assets/minimal-cards/homeo_sraa.svg",
      imgB: "/assets/homeostase/homeo_sraa_b.png",
      mesh: { term: "Renin-Angiotensin System", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D012364", tree: "G09.330" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK470410/",
      starter: ["Avaliar resposta em desidratação.", "Estudar efeito do treino no tônus vascular."],
      bullets: ["Renina inicia.", "Ang II contrai vasos.", "Aldosterona retém Na+."],
      apply: ["No DOD: homeostase cardiovascular de base."]
    },
    {
      id: "homeo_orthostatic",
      category: "homeo",
      title: "Resposta Ortostática",
      oneLiner: "Levantar rápido é um teste de sistema autônomo.",
      imgA: "/assets/minimal-cards/homeo_orthostatic.svg",
      imgB: "/assets/homeostase/homeo_orthostatic_b.png",
      mesh: { term: "Hypotension, Orthostatic", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D007011", tree: "C14.907.489" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK448192/",
      starter: ["Medir PA/FC em ortostatismo.", "Explorar hidratação e retorno venoso."],
      bullets: ["Sangue desce por gravidade.", "Barorreflexo compensa.", "Falha gera tontura."],
      apply: ["No DOD: performance começa na estabilidade autonômica."]
    },
    {
      id: "adapt_physiological",
      category: "physio",
      title: "Homeostase e Adaptação (Darwin)",
      oneLiner: "Da seleção natural à fisiologia: o corpo adapta quando o estímulo respeita a recuperação.",
      imgA: "/assets/minimal-cards/adapt_physiological.svg",
      imgB: "/assets/homeostase/adapt_darwin_tree_b.png",
      imgC: "/assets/homeostase/adapt_darwin_finches_c.jpg",
      mesh: { term: "Adaptation, Physiological", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D000275", tree: "G07.345" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK539724/",
      starter: ["Ligar Darwin (seleção) à adaptação fisiológica no treino.", "Comparar estímulo, recuperação e ganho funcional em ciclo."],
      bullets: ["Estímulo gera pressão adaptativa.", "Recuperação seleciona resposta eficiente.", "Consistência consolida nova homeostase."],
      apply: ["No DOD: card didático para leigos com base científica de adaptação."]
    },
    {
      id: "homeo_inflammation_repair",
      category: "physio",
      title: "Inflamação e Reparação",
      oneLiner: "Dano vira sinal de reconstrução, se bem dosado.",
      imgA: "/assets/minimal-cards/homeo_inflammation_repair.svg",
      imgB: "/assets/homeostase/homeo_inflammation_repair_b.png",
      mesh: { term: "Inflammation", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D007249", tree: "C23.550.291" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK493173/",
      starter: ["Entender fases (hemostasia, inflamação, proliferação).", "Comparar recuperação ativa vs passiva."],
      bullets: ["Inflamação não é vilã.", "Dose importa.", "Sono e nutrição modulam."],
      apply: ["No DOD: recovery como parte do treino."]
    },

    // ===== NATURE (2) =====
    {
      id: "nature_lungs_forest",
      category: "homeo",
      title: "Respiração e Natureza",
      oneLiner: "Pulmão e árvore no mesmo circuito de troca.",
      imgA: "/assets/minimal-cards/nature_lungs_forest.svg",
      imgB: "/assets/nature/nature_lungs_forest_b.png",
      mesh: { term: "Ecosystem", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D004814", tree: "G16.500" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK21475/",
      starter: ["Criar card de recalibração pós-estresse.", "Respiração lenta e tônus vagal."],
      bullets: ["CO2 regula drive respiratório.", "Respiração muda estado autonômico.", "Ambiente ajuda o sistema."],
      apply: ["No DOD: respira e recalibra com ciência."]
    },
    {
      id: "nature_ecosystem_balance",
      category: "homeo",
      title: "Equilíbrio Ecológico",
      oneLiner: "Homeostase fora do corpo: o mesmo princípio, outra escala.",
      imgA: "/assets/minimal-cards/nature_ecosystem_balance.svg",
      imgB: "/assets/nature/nature_ecosystem_balance_b.png",
      mesh: { term: "Ecology", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D004777", tree: "G16.500.275" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK21475/",
      starter: ["Card contemplativo com aplicação prática (stress reset).", "Relacionar variabilidade e resiliência."],
      bullets: ["Redundância gera resiliência.", "Choques testam o sistema.", "Recuperação é dinâmica."],
      apply: ["No DOD: estética + fisiologia do stress."]
    },

    // ===== SKY (2) =====
    {
      id: "sky_atmospheric_layers",
      category: "homeo",
      title: "Horizonte Atmosférico",
      oneLiner: "Camadas que filtram, protegem e desenham o céu.",
      imgA: "/assets/minimal-cards/sky_atmospheric_layers.svg",
      imgB: "/assets/sky/sky_atmospheric_layers_b.png",
      mesh: { term: "Atmosphere", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D001259", tree: "G16.500.275.520" },
      source: "https://www.britannica.com/science/atmosphere",
      starter: ["Criar card para higiene mental visual.", "Ligação com ciclos circadianos (luz)."],
      bullets: ["Luz e cor dependem de dispersão.", "Camadas modulam radiação.", "Ritmo circadiano responde à luz."],
      apply: ["No DOD: céu como âncora visual + ritmo biológico."]
    },
    {
      id: "sky_circadian_light",
      category: "homeo",
      title: "Luz e Ritmo Circadiano",
      oneLiner: "O relógio biológico lendo o céu pelo olho.",
      imgA: "/assets/minimal-cards/sky_circadian_light.svg",
      imgB: "/assets/sky/sky_circadian_light_b.png",
      mesh: { term: "Circadian Rhythm", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D003975", tree: "G07.345.249" },
      source: "https://www.ncbi.nlm.nih.gov/books/NBK279054/",
      starter: ["Explorar luz da manhã e sono.", "Reduzir luz azul à noite."],
      bullets: ["Retina sinaliza SCN.", "Melatonina depende de luz.", "Sono melhora performance."],
      apply: ["No DOD: performance começa no sono."]
    },

    // ===== DOD PREMIUM (2) =====
    {
      id: "neuro_polylaminin_regen",
      category: "neuro",
      title: "Polilaminina e Regeneração Neural",
      oneLiner: "Matriz bioativa como ponte para reconexão.",
      imgA: "/assets/minimal-cards/neuro_polylaminin_regen.svg",
      imgB: "/assets/neuro/neuro_polylaminin_regen_b.png",
      mesh: { term: "Spinal Cord Injuries", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D013116", tree: "C10.228.140.700.750" },
      source: "https://www.gov.br/saude/pt-br/assuntos/noticias/2026/janeiro/ministerio-da-saude-e-anvisa-anunciam-aprovacao-de-estudo-clinico-para-tratamento-inovador-de-lesoes-na-medula-espinhal",
      starter: ["Revisar matriz extracelular e crescimento axonal.", "Mapear endpoints clínicos (segurança/funcionalidade)."],
      bullets: ["Matriz orienta crescimento.", "Ambiente pós-lesão é hostil.", "Biomaterial muda o microambiente."],
      apply: ["No DOD: vitrine de neurociência translacional BR."]
    },
    {
      id: "neuro_focus_oscillations",
      category: "neuro",
      title: "Foco Bioelétrico",
      oneLiner: "Oscilações e ganho neural em modo atenção.",
      imgA: "/assets/minimal-cards/neuro_focus_oscillations.svg",
      imgB: "/assets/neuro/neuro_focus_oscillations_b.png",
      mesh: { term: "Attention", uri: "https://meshb.nlm.nih.gov/record/ui?ui=D001329", tree: "F02.463.188" },
      source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2835009/",
      starter: ["Explorar theta/gamma e performance.", "Criar higiene de foco com base fisiológica."],
      bullets: ["Atenção é seleção.", "Sincronia melhora transmissão.", "Inibição reduz ruído."],
      apply: ["No DOD: card Neuro que vira prática diária."]
    }
  ];

  let CARDS = [];

  const EXPOSED_CARD_PRIORITY = [
    "mesh-d007024",
    "mesh-d007328",
    "homeo_orthostatic",
    "physio_insulin_axis"
  ];

  function normalizePriorityText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function getExposedCardScore(card = {}) {
    const id = normalizePriorityText(card.id || "");
    if (id.includes("cortex")) return -1;
    const byId = EXPOSED_CARD_PRIORITY.indexOf(id);
    if (byId >= 0) return byId;

    const title = normalizePriorityText(card.title || "");
    if (title.includes("cortex")) return -1;
    if (title.includes("resposta ortostatica")) return 0;
    if (title.includes("insulina e eixo glicemico")) return 1;
    return Number.MAX_SAFE_INTEGER;
  }

  function prioritizeExposedCards(cards = []) {
    return cards
      .map((card, index) => ({ card, index, score: getExposedCardScore(card) }))
      .sort((a, b) => (a.score - b.score) || (a.index - b.index))
      .map(item => item.card);
  }

  function isExposedCard(card = {}) {
    return getExposedCardScore(card) < Number.MAX_SAFE_INTEGER;
  }


  function normalizeTag(tag = "") {
    const value = String(tag).trim().toLowerCase();
    const map = {
      neuro: "Neuro",
      homeostase: "Homeostase",
      physio: "Physio",
      sport: "Sport",
      adaptacao: "Adaptação",
      "adaptação": "Adaptação",
      nature: "Nature",
      sky: "Sky"
    };
    return map[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Science");
  }

  function fallbackCoverByTag(tags = []) {
    const values = tags.map(tag => String(tag).toLowerCase());
    if (values.includes("sport")) return fallbackImage("Sport", 1200, 750);
    if (values.includes("homeostase")) return fallbackImage("Homeostase", 1200, 750);
    if (values.includes("neuro")) return fallbackImage("Neuro", 1200, 750);
    if (values.includes("nature")) return fallbackImage("Nature", 1200, 750);
    if (values.includes("sky")) return fallbackImage("Sky", 1200, 750);
    if (values.includes("adaptacao")) return fallbackImage("Adaptacao", 1200, 750);
    if (values.includes("adaptação")) return fallbackImage("Adaptacao", 1200, 750);
    return fallbackImage("DOD", 1200, 750);
  }

  function meshIdFromValue(value = "") {
    const raw = String(value || "");
    const match = raw.match(/([A-Z]\d{5,6})/);
    return match ? match[1] : "";
  }

  function toStarterObject(rawStarter, rawApply = []) {
    if (rawStarter && typeof rawStarter === "object" && !Array.isArray(rawStarter)) {
      return {
        question: rawStarter.question || "",
        finding: rawStarter.finding || "",
        practical: rawStarter.practical || ""
      };
    }

    if (Array.isArray(rawStarter)) {
      return {
        question: rawStarter[0] || "",
        finding: rawStarter[1] || "",
        practical: Array.isArray(rawApply) ? (rawApply[0] || "") : ""
      };
    }

    return { question: "", finding: "", practical: "" };
  }

  function choosePreferredCover(imageA, imageB, fallbackCover) {
    const first = String(imageA || "");
    const second = String(imageB || "");
    const firstIsMinimal = first.includes("/assets/minimal-cards/");
    const secondIsRaster = /\.(png|jpe?g|webp)(\?|$)/i.test(second);

    if (firstIsMinimal && secondIsRaster) return imageB || imageA || fallbackCover;
    return imageA || imageB || fallbackCover;
  }

  function toUnifiedCard(raw = {}) {
    const meshRaw = raw.mesh || {};
    const meshUri = raw.meshUri || meshRaw.uri || "";
    const meshId = raw.meshId || meshIdFromValue(meshUri);
    const meshTerm = raw.meshTerm || meshRaw.term || raw.title || "";
    const meshTreeNumbers = Array.isArray(raw.meshTreeNumbers)
      ? raw.meshTreeNumbers
      : (meshRaw.tree ? [meshRaw.tree] : []);
    const tags = Array.isArray(raw.tags) && raw.tags.length > 0
      ? raw.tags.map(normalizeTag)
      : [normalizeTag(raw.category || "science"), "DOD"];

    const fallbackCover = fallbackCoverByTag(tags);
    const imageA = raw.imageA || raw.imgA || raw.cover || fallbackCover;
    const imageB = raw.imageB || raw.imgB || imageA;
    const imageC = raw.imageC || raw.imgC || imageB;
    const starter = toStarterObject(raw.starter, raw.apply);
    const sourceUrl = raw.sourceUrl || raw.source || meshUri || "https://id.nlm.nih.gov/mesh/swagger/ui";

    return {
      id: raw.id || `card-${Math.random().toString(36).slice(2, 8)}`,
      category: raw.category || "",
      title: raw.title || "Card científico DOD",
      oneLiner: raw.oneLiner || "Resumo científico aplicado ao DOD.",
      tags,
      cover: choosePreferredCover(imageA, imageB, fallbackCover),
      coverFallback: fallbackCover,
      imageA,
      imageB,
      imageC,
      imageAFallback: fallbackCover,
      imageBFallback: fallbackCover,
      imageCFallback: fallbackCover,
      starter,
      bullets: Array.isArray(raw.bullets) ? raw.bullets : [],
      apply: Array.isArray(raw.apply) ? raw.apply : [],
      sourceUrl,
      ctaLabel: raw.ctaLabel || "",
      openDirectly: Boolean(raw.openDirectly),
      citation: raw.citation || `Fonte científica: ${sourceUrl}`,
      meshTerm,
      meshId,
      meshTreeNumbers,
      meshUri
    };
  }

  function toScientificCard(raw = {}) {
    const meshId = raw.meshId || "";
    const tags = Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags.map(normalizeTag) : ["Science"];
    const treeNumbers = Array.isArray(raw.treeNumbers) ? raw.treeNumbers : [];
    const parents = Array.isArray(raw.parentDescriptors) ? raw.parentDescriptors : [];
    const parentLabel = parents[0]?.label || "categoria MeSH relacionada";
    const primaryTree = treeNumbers[0] || "sem tree number";
    const fallbackCover = fallbackCoverByTag(tags);
    const defaultImageA = meshId ? `/assets/cards/${meshId}-a.svg` : fallbackCover;
    const defaultImageB = meshId ? `/assets/cards/${meshId}-b.svg` : defaultImageA;
    const defaultImageC = meshId ? `/assets/cards/${meshId}-c.svg` : defaultImageB;
    const imageA = raw.imageA || raw.imgA || defaultImageA;
    const imageB = raw.imageB || raw.imgB || defaultImageB;
    const imageC = raw.imageC || raw.imgC || defaultImageC;
    const sourceUrl = raw.sourceUrl || raw.meshUri || "https://id.nlm.nih.gov/mesh/swagger/ui";
    const citation = raw.citation || `MeSH Descriptor ${raw.meshId || ""} - ${raw.meshLabel || raw.title || ""} (MeSH RDF).`;
    const starter = toStarterObject(raw.starter, raw.apply);
    const hasStarter = Boolean(starter.question || starter.finding || starter.practical);
    const defaultStarter = {
      question: `Qual o papel de ${raw.meshLabel || raw.title || "este mecanismo"} na fisiologia aplicada?`,
      finding: `Descritor ${raw.meshId || "MeSH"} com árvore principal ${primaryTree} e conexão com ${parentLabel}.`,
      practical: "Aplicar no DOD para ligar mecanismo biológico com decisão prática de treino e recuperação."
    };
    const bullets = Array.isArray(raw.bullets) && raw.bullets.length > 0
      ? raw.bullets
      : [
          `Tree Number principal: ${primaryTree}.`,
          `${raw.meshLabel || raw.title || "Termo"} está indexado oficialmente no MeSH RDF.`,
          `Eixo relacionado a ${parentLabel.toLowerCase()} para leitura de rede fisiológica.`
        ];
    const apply = Array.isArray(raw.apply) && raw.apply.length > 0
      ? raw.apply
      : [
          "Usar como base para roteiro de conteúdo científico no feed.",
          "Ligar o mecanismo a monitoramento, carga e recuperação no DOD."
        ];

    return {
      id: raw.id || `mesh-${meshId || Math.random().toString(36).slice(2, 8)}`,
      title: raw.title || raw.meshLabel || "Card científico DOD",
      oneLiner: raw.oneLiner || `Referência MeSH: ${raw.meshLabel || raw.meshTerm || "descriptor"} - indexado via MeSH RDF.`,
      tags,
      cover: choosePreferredCover(imageA, imageB, fallbackCover),
      coverFallback: fallbackCover,
      imageA,
      imageB,
      imageC,
      imageAFallback: fallbackCover,
      imageBFallback: fallbackCover,
      imageCFallback: fallbackCover,
      starter: hasStarter ? starter : defaultStarter,
      bullets,
      apply,
      sourceUrl,
      ctaLabel: raw.ctaLabel || "",
      openDirectly: Boolean(raw.openDirectly),
      citation,
      meshTerm: raw.meshTerm || raw.meshLabel || raw.title || "",
      meshId: raw.meshId || "",
      meshTreeNumbers: treeNumbers,
      meshUri: raw.meshUri || ""
    };
  }

  async function hydrateCardsFromMeshJson() {

    try {
      const response = await fetch("/mesh-cards-10.json", { cache: "no-store" });
      if (!response.ok) return;
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) return;
      const scientificCards = prioritizeExposedCards(rows.filter(row => row?.meshId).map(toScientificCard));
      if (scientificCards.length === 0) return;
      CARDS = scientificCards;
      renderCardsGrid();
      renderHeroExposedChips();
    } catch (_) {
      // fallback mantem CARDS manuais
    }
  }

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function uniqueByNormalizedChunk(chunks = []) {
    const seen = new Set();
    return chunks
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => {
        const key = normalizePriorityText(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function getCardSearchQuery(card = {}, titleOverride = "") {
    const chunks = uniqueByNormalizedChunk([
      titleOverride || card.title || "",
      card.meshTerm || "",
      card.meshId ? `mesh ${card.meshId}` : ""
    ]);
    const [mainTerm, ...extras] = chunks;
    if (!mainTerm) return "";
    const queryParts = [`"${mainTerm}"`, ...extras];
    return queryParts.join(" ").trim();
  }

  const LOCKED_CARD_SOURCE_RULES = Object.freeze([
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/39951268/",
      ids: ["physio_insulin_axis", "mesh-d007328"],
      meshIds: ["d007328"],
      titleIncludes: ["insulina e eixo glicemico", "insulin"]
    },
    {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8416122/",
      ids: ["homeo_orthostatic", "mesh-d007024"],
      meshIds: ["d007024"],
      titleIncludes: ["resposta ortostatica", "orthostatic"]
    },
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/26727607/",
      ids: ["neuro_action_potential", "mesh-d000069"],
      meshIds: ["d000069"],
      titleIncludes: ["potencial de acao", "action potential"]
    },
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/39341547/",
      ids: ["physio_baroreflex", "mesh-d017704", "mesh-d001478"],
      meshIds: ["d017704", "d001478"],
      titleIncludes: ["barorreflexo", "baroreflex"]
    },
    {
      url: "https://www.ncbi.nlm.nih.gov/books/NBK560599/",
      ids: ["physio_glucose_metabolism", "mesh-d001786", "mesh-d005347"],
      meshIds: ["d001786", "d005347"],
      titleIncludes: ["metabolismo da glicose", "glucose metabolism"]
    },
    {
      url: "https://www.ncbi.nlm.nih.gov/books/NBK507838/",
      ids: ["physio_thermoregulation", "mesh-d001839"],
      meshIds: ["d001839"],
      titleIncludes: ["termorregulacao", "thermoregulation"]
    },
    {
      url: "https://www.ncbi.nlm.nih.gov/books/NBK10874/",
      ids: ["sport_neural_strength", "mesh-d009037"],
      meshIds: ["d009037"],
      titleIncludes: ["forca neural", "unidade motora", "motor unit", "neural strength"]
    },
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/40531343/",
      ids: ["sky_atmospheric_layers", "mesh-d001259"],
      meshIds: ["d001259"],
      titleIncludes: ["horizonte atmosferico", "atmospheric"]
    },
    {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6751071/",
      ids: ["sky_circadian_light", "mesh-d003975"],
      meshIds: ["d003975"],
      titleIncludes: ["luz e ritmo circadiano", "circadian"]
    },
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/38938510/",
      ids: ["neuro_focus_oscillations", "mesh-d001329"],
      meshIds: ["d001329"],
      titleIncludes: ["foco bioeletrico", "bioelectric focus"]
    },
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/38919211/",
      ids: ["sport_vo2max", "mesh-d010101", "mesh-d010066"],
      meshIds: ["d010101", "d010066"],
      titleIncludes: ["vo2max", "vo2 max"]
    },
    {
      url: "https://www.ncbi.nlm.nih.gov/books/NBK27954/",
      ids: ["neuro_myelin_saltatory", "mesh-d009220"],
      meshIds: ["d009220"],
      titleIncludes: ["mielina", "saltatoria", "myelin"]
    },
    {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12686030/",
      ids: ["nature_ecosystem_balance", "mesh-d004777"],
      meshIds: ["d004777"],
      titleIncludes: ["equilibrio ecologico", "ecological balance", "ecology"]
    },
    {
      url: "https://www.ncbi.nlm.nih.gov/sites/books/NBK539907/",
      ids: ["nature_lungs_forest", "mesh-d004814"],
      meshIds: ["d004814"],
      titleIncludes: ["respiracao e natureza", "breathing"]
    },
    {
      url: "https://pubmed.ncbi.nlm.nih.gov/27112802/",
      ids: ["adapt_physiological", "mesh-d000275"],
      meshIds: ["d000275"],
      titleIncludes: ["homeostase e adaptacao", "darwin", "adaptation"]
    }
  ].map((rule) => Object.freeze({
    url: rule.url,
    ids: Object.freeze((rule.ids || []).map(normalizePriorityText)),
    meshIds: Object.freeze((rule.meshIds || []).map(normalizePriorityText)),
    titleIncludes: Object.freeze((rule.titleIncludes || []).map(normalizePriorityText))
  })));

  function getCardSearchOverride(card = {}, titleOverride = "") {
    const direct = toHttpUrl(card.searchUrl || "");
    if (direct) return direct;

    const normalizedId = normalizePriorityText(card.id || "");
    const normalizedTitle = normalizePriorityText(titleOverride || card.title || "");
    const normalizedMeshId = normalizePriorityText(card.meshId || "");

    for (const rule of LOCKED_CARD_SOURCE_RULES) {
      if (rule.ids.includes(normalizedId)) return rule.url;
      if (rule.meshIds.includes(normalizedMeshId)) return rule.url;
      if (rule.titleIncludes.some((token) => token && normalizedTitle.includes(token))) return rule.url;
    }

    return "";
  }

  function auditLockedSourceRules() {
    const invalid = [];
    const seen = new Map();

    LOCKED_CARD_SOURCE_RULES.forEach((rule) => {
      if (!toHttpUrl(rule.url)) invalid.push(rule.url);
      if (seen.has(rule.url)) return;
      seen.set(rule.url, 1);
    });

    if (invalid.length > 0) {
      console.warn("[DOD] Locked source rules contain invalid URL(s):", invalid);
    }
  }

  auditLockedSourceRules();

  function toHttpUrl(url = "") {
    const value = String(url || "").trim();
    if (/^\/(?!\/)/.test(value)) return value;
    try {
      const parsed = new URL(value);
      return /^(http|https):$/.test(parsed.protocol) ? parsed.toString() : "";
    } catch (_) {
      return "";
    }
  }

  function getCardDirectSourceUrl(card = {}) {
    const candidates = [
      card.searchUrl,
      card.sourceUrl,
      card.meshUri
    ];

    for (const candidate of candidates) {
      const absolute = toHttpUrl(candidate);
      if (absolute) return absolute;
    }

    return "";
  }

  function buildCardSearchUrl(card = {}, titleOverride = "") {
    const override = getCardSearchOverride(card, titleOverride);
    if (override) return override;

    const directSource = getCardDirectSourceUrl(card);
    if (directSource) return directSource;

    const query = getCardSearchQuery(card, titleOverride);
    if (!query) return "";
    const params = new URLSearchParams({ term: query });
    return `https://pubmed.ncbi.nlm.nih.gov/?${params.toString()}`;
  }

  function openCardSearch(url = "") {
    if (!url) return;
    window.location.assign(url);
  }

  function getCardTitleFromElement(element) {
    const cardEl = element?.closest?.(".card");
    if (!cardEl) return "";
    const datasetTitle = String(cardEl.dataset.title || "").trim();
    if (datasetTitle) return datasetTitle;
    const heading = cardEl.querySelector("h4, h3, h2, .title");
    return String(heading?.textContent || "").trim();
  }

  function isSearchAction(control) {
    const text = normalizePriorityText(
      `${control?.textContent || ""} ${control?.getAttribute?.("aria-label") || ""}`
    );
    return text.includes("pesquisa") || text.includes("pesquisar") || text.includes("search");
  }

  function renderCardsGrid() {
    grid.innerHTML = CARDS.map((card) => {
      const searchUrl = buildCardSearchUrl(card);
      const starter = card.starter || {};
      const starterLines = [
        starter.question
          ? `<p class="card-starter-line"><strong>Pergunta:</strong> ${escapeHtml(starter.question)}</p>`
          : "",
        starter.finding
          ? `<p class="card-starter-line"><strong>Achado:</strong> ${escapeHtml(starter.finding)}</p>`
          : "",
        starter.practical
          ? `<p class="card-starter-line"><strong>Aplicação:</strong> ${escapeHtml(starter.practical)}</p>`
          : ""
      ].filter(Boolean).join("");

      const starterBlock = starterLines
        ? `
          <div class="card-starter">
            <span class="card-starter-kicker">Iniciação científica:</span>
            ${starterLines}
          </div>
        `
        : "";

      const searchButton = searchUrl
        ? `
          <a class="card-search-btn"
             href="${escapeHtml(searchUrl)}"
             target="_self"
             rel="noopener noreferrer nofollow external"
             referrerpolicy="no-referrer"
             data-card-search-url="${escapeHtml(searchUrl)}"
             data-card-search-title="${escapeHtml(card.title)}">
            ${escapeHtml(card.ctaLabel || "Abrir pesquisa")}
          </a>
        `
        : "";

      const isCortexCard = normalizePriorityText(`${card.id || ""} ${card.title || ""}`).includes("cortex");

      return `
        <article class="card is-live${isExposedCard(card) ? " card-exposed" : ""}${isCortexCard ? " card-cortex" : ""}"
                 data-id="${escapeHtml(card.id)}"
                 data-title="${escapeHtml(card.title)}">
          <div class="card-cover">
            <img src="${escapeHtml(card.cover)}" alt="${escapeHtml(card.title)}" loading="lazy" />
          </div>
          <div class="card-info">
            <div class="pillrow">${card.tags.map(tag => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}</div>
            <h4>${escapeHtml(card.title)}</h4>
            <p>${escapeHtml(card.oneLiner)}</p>
            ${starterBlock}
            ${searchButton}
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll(".card-cover img").forEach((img) => {
      const cardId = img.closest(".card")?.dataset?.id;
      const card = CARDS.find(item => item.id === cardId);
      if (!card) return;
      const fallbackSrc = card.coverFallback || fallbackCoverByTag(card.tags || []);
      const finalFallback = fallbackImage(card.title || "DOD", 1200, 750);
      img.addEventListener("error", function onImageError() {
        const stage = Number(img.dataset.fallbackStage || "0");
        if (stage === 0 && img.src !== fallbackSrc) {
          img.dataset.fallbackStage = "1";
          img.src = fallbackSrc;
          return;
        }
        if (stage <= 1 && img.src !== finalFallback) {
          img.dataset.fallbackStage = "2";
          img.src = finalFallback;
          return;
        }
        img.removeEventListener("error", onImageError);
      });
    });
  }

  CARDS = prioritizeExposedCards(MANUAL_CARDS.map(toUnifiedCard));
  renderCardsGrid();
  renderHeroExposedChips();
  hydrateCardsFromMeshJson();

  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalOneLiner = document.getElementById("modalOneLiner");
  const modalTags = document.getElementById("modalTags");
  const modalStarter = document.getElementById("modalStarter");
  const modalBullets = document.getElementById("modalBullets");
  const modalApply = document.getElementById("modalApply");
  const modalSource = document.getElementById("modalSource");
  const modalMeshLine = document.getElementById("modalMeshLine");
  const modalMeshUri = document.getElementById("modalMeshUri");
  const modalMeshTree = document.getElementById("modalMeshTree");
  const copyCite = document.getElementById("copyCite");
  const swapImg = document.getElementById("swapImg");
  const imgState = document.getElementById("imgState");
  const heroExposed = document.getElementById("heroExposed");

  if (!modalImg || !imgState || !modalTitle || !modalOneLiner || !modalTags || !modalStarter ||
      !modalBullets || !modalApply || !modalSource || !copyCite || !swapImg) {
    return;
  }

  let current = null;
  let activeImageIndex = 0;
  let meshRequestToken = 0;

  function renderMeshSmartTag(card, options = {}) {
    if (!modalMeshLine || !modalMeshUri || !modalMeshTree) return;

    const meshId = card.meshId || "";
    const meshUri = card.meshUri || "";
    const treeNumbers = Array.isArray(card.meshTreeNumbers) ? card.meshTreeNumbers : [];
    const smartTree = treeNumbers[0] || "";
    const loading = Boolean(options.loading);

    if (!loading && !meshId && !meshUri && !smartTree) {
      modalMeshLine.hidden = true;
      modalMeshUri.removeAttribute("href");
      modalMeshUri.textContent = "";
      modalMeshTree.textContent = "";
      return;
    }

    modalMeshLine.hidden = false;
    modalMeshUri.textContent = meshId || card.meshTerm || "MeSH";
    if (meshUri) {
      modalMeshUri.href = meshUri;
    } else {
      modalMeshUri.removeAttribute("href");
    }

    if (loading) {
      modalMeshTree.textContent = "Tree: consultando Open MeSH API...";
      return;
    }

    modalMeshTree.textContent = smartTree ? `Tree: ${smartTree}` : "Tree: sem hierarquia disponível";
  }

  async function hydrateCardMesh(card, requestToken) {
    if (!card.meshTerm || typeof resolveMeshTerm !== "function") return;

    if (card.meshId || card.meshUri || (Array.isArray(card.meshTreeNumbers) && card.meshTreeNumbers.length > 0)) {
      renderMeshSmartTag(card);
      return;
    }

    renderMeshSmartTag(card, { loading: true });

    try {
      const data = await resolveMeshTerm(card.meshTerm, { year: "current" });
      if (!data?.found) return;
      if (requestToken !== meshRequestToken || !current || current.id !== card.id) return;

      card.meshId = data.id || "";
      card.meshUri = data.resource || "";
      card.meshTreeNumbers = Array.isArray(data.treeNumbers) ? data.treeNumbers : [];
      renderMeshSmartTag(card);
    } catch (_) {
      if (requestToken === meshRequestToken && current && current.id === card.id) {
        renderMeshSmartTag(card);
      }
    }
  }

  function getImageSlots(card) {
    const candidates = [
      {
        src: card.imageA || card.cover,
        fallback: card.imageAFallback || card.coverFallback || card.cover
      },
      {
        src: card.imageB || card.imageA || card.cover,
        fallback: card.imageBFallback || card.imageAFallback || card.coverFallback || card.cover
      },
      {
        src: card.imageC || card.imageB || card.imageA || card.cover,
        fallback: card.imageCFallback || card.imageBFallback || card.imageAFallback || card.coverFallback || card.cover
      }
    ];

    const unique = [];
    const seen = new Set();

    candidates.forEach((item) => {
      const key = String(item.src || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(item);
    });

    return unique.length > 0
      ? unique
      : [{ src: card.cover, fallback: card.coverFallback || card.cover }];
  }

  function setImg() {
    if (!current) return;
    const slots = getImageSlots(current);
    if (activeImageIndex >= slots.length) activeImageIndex = 0;
    const selected = slots[activeImageIndex];
    modalImg.dataset.fallbackStage = "0";
    modalImg.onerror = () => {
      const stage = Number(modalImg.dataset.fallbackStage || "0");
      if (stage === 0) {
        modalImg.dataset.fallbackStage = "1";
        modalImg.src = selected.fallback;
        return;
      }
      modalImg.onerror = null;
      modalImg.src = fallbackImage(current.title || "DOD", 1200, 750);
    };
    modalImg.src = selected.src;
    modalImg.alt = `${current.title} - imagem ${activeImageIndex + 1}`;
    imgState.textContent = `Imagem ${activeImageIndex + 1}/${slots.length}`;
  }

  function openModal(card) {

    current = card;
    activeImageIndex = 0;
    meshRequestToken += 1;
    const requestToken = meshRequestToken;
    const starter = current.starter || {};
    const starterLines = [];
    const bullets = Array.isArray(current.bullets) ? current.bullets : [];
    const applyItems = Array.isArray(current.apply) ? current.apply : [];

    modalTitle.textContent = current.title;
    modalOneLiner.textContent = current.oneLiner;
    modalTags.innerHTML = current.tags.map(tag => `<span class="pill">${escapeHtml(tag)}</span>`).join("");

    if (starter.question) {
      starterLines.push(`<li><strong>Pergunta:</strong> ${escapeHtml(starter.question)}</li>`);
    }
    if (starter.finding) {
      starterLines.push(`<li><strong>Achado:</strong> ${escapeHtml(starter.finding)}</li>`);
    }
    if (starter.practical) {
      starterLines.push(`<li><strong>Aplicação prática:</strong> ${escapeHtml(starter.practical)}</li>`);
    }

    modalStarter.innerHTML = starterLines.join("");
    modalBullets.innerHTML = bullets.map(item => `<li>${escapeHtml(item)}</li>`).join("");
    modalApply.innerHTML = applyItems.map(item => `<li>${escapeHtml(item)}</li>`).join("");

    modalSource.href = current.sourceUrl;
    modalSource.textContent = "Fonte (abrir)";
    setImg();
    renderMeshSmartTag(current);
    hydrateCardMesh(current, requestToken);

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    meshRequestToken += 1;
    if (modalMeshLine) modalMeshLine.hidden = true;
    current = null;
  }

  function findHeroCard(heroKey = "") {
    const key = normalizePriorityText(heroKey);
    if (key === "orthostatic") {
      return CARDS.find((card) => getExposedCardScore(card) === 0) || null;
    }
    if (key === "insulin") {
      return CARDS.find((card) => getExposedCardScore(card) === 1) || null;
    }
    return null;
  }

  function renderHeroExposedChips() {
    if (!heroExposed) return;

    const chips = Array.from(heroExposed.querySelectorAll(".hero-exposed-chip"));
    chips.forEach((chip) => {
      const key = chip.dataset.heroCard || "";
      const card = findHeroCard(key);

      chip.classList.toggle("is-active", Boolean(card));
      chip.disabled = !card;
      chip.onclick = () => {
        const target = findHeroCard(key);
        if (target) openModal(target);
      };
    });
  }

  swapImg.addEventListener("click", () => {
    if (!current) return;
    const slots = getImageSlots(current);
    if (slots.length <= 1) return;
    activeImageIndex = (activeImageIndex + 1) % slots.length;
    setImg();
  });

  copyCite.addEventListener("click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.citation);
      copyCite.textContent = "Copiado ✓";
      setTimeout(() => {
        copyCite.textContent = "Copiar citação";
      }, 1100);
    } catch (_) {
      alert("Não consegui copiar automaticamente. Posso formatar em ABNT/APA.");
    }
  });

  grid.addEventListener("click", (event) => {
    const searchControl = event.target.closest("[data-card-search-url]");
    if (searchControl) {
      event.preventDefault();
      event.stopPropagation();
      const cardEl = searchControl.closest(".card");
      const card = cardEl ? CARDS.find(item => item.id === cardEl.dataset.id) : null;
      const url = searchControl.dataset.cardSearchUrl
        || searchControl.getAttribute("href")
        || buildCardSearchUrl(card || {}, searchControl.dataset.cardSearchTitle || "");
      openCardSearch(url);
      return;
    }

    const genericControl = event.target.closest("button, a");
    if (genericControl && genericControl.closest(".card") && isSearchAction(genericControl)) {
      event.preventDefault();
      event.stopPropagation();
      const cardEl = genericControl.closest(".card");
      const card = cardEl ? CARDS.find(item => item.id === cardEl.dataset.id) : null;
      const url = buildCardSearchUrl(card || {}, getCardTitleFromElement(genericControl));
      openCardSearch(url);
      return;
    }

    const cardEl = event.target.closest(".card");
    if (!cardEl) return;
    const card = CARDS.find(item => item.id === cardEl.dataset.id);
    if (!card) return;
    if (card.openDirectly) {
      openCardSearch(buildCardSearchUrl(card));
      return;
    }
    openModal(card);
  });

  modal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset && event.target.dataset.close) closeModal();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) closeModal();
  });
})();
// no renderFeed do index
const prioritized = prioritizeExposedCards(CARDS); // você já tem isso
const [anchor1, anchor2, ...rest] = prioritized;
// render anchor1 e anchor2 primeiro em cardsGrid, depois o resto
