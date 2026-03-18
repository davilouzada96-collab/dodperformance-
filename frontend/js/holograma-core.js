(() => {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function colorFromActivation(activation) {
    // 0: azul frio, 0.5: roxo, 1: vermelho
    const t = clamp(activation, 0, 1);
    const mid = 0.5;
    if (t <= mid) {
      const k = t / mid; // 0 → 1
      const r = lerp(0.12, 0.55, k);
      const g = lerp(0.32, 0.24, k);
      const b = lerp(0.92, 0.75, k);
      return new THREE.Color(r, g, b);
    }
    const k = (t - mid) / (1 - mid); // 0 → 1
    const r = lerp(0.55, 1.0, k);
    const g = lerp(0.24, 0.16, k);
    const b = lerp(0.75, 0.22, k);
    return new THREE.Color(r, g, b);
  }

  function getHemisphere(x) {
    return x < 0 ? "left" : "right";
  }

  const REGION_COLORS = {
    frontal:        new THREE.Color(0.35, 0.75, 1.0),
    parietal:       new THREE.Color(0.55, 0.95, 0.65),
    temporal:       new THREE.Color(1.0, 0.70, 0.35),
    occipital:      new THREE.Color(0.75, 0.45, 1.0),
    motor:          new THREE.Color(1.0, 0.35, 0.35),
    somatosensory:  new THREE.Color(1.0, 0.90, 0.35),
    subcortical:    new THREE.Color(0.45, 0.45, 0.60),
    association:    new THREE.Color(0.65, 0.75, 0.95),
  };

  const ANATOMY_REGIONS = {
    prefrontal: { label: "Cortex pre-frontal", shortLabel: "Pre-frontal", function: "planejamento executivo, decisao e controle inibitorio", clinical: "alteracoes podem cursar com desinibicao, apatia e prejuizo executivo", vascular: "arteria cerebral anterior e media", route: "cortex pre-frontal -> talamo mediodorsal -> circuitos frontoestriatais", baseRegion: "frontal", brodmann: "BA9/10/46", network: "rede executiva" },
    broca: { label: "Area de Broca", shortLabel: "Broca", function: "programacao motora da fala", clinical: "lesao dominante pode gerar afasia de Broca", vascular: "ramo superior da arteria cerebral media", route: "broca -> fasciculo arqueado -> areas perisilvianas", baseRegion: "frontal", brodmann: "BA44/45", network: "rede de linguagem expressiva" },
    precentral: { label: "Giro pre-central", shortLabel: "Motor", function: "comando motor voluntario primario", clinical: "lesao pode causar hemiparesia contralateral", vascular: "arteria cerebral media", route: "giro pre-central -> capsula interna -> tronco encefalico -> trato corticoespinal", baseRegion: "motor", brodmann: "BA4", network: "rede motora" },
    postcentral: { label: "Giro pos-central", shortLabel: "Somatossensorial", function: "processamento somatossensorial primario", clinical: "lesao pode causar hipoestesia e astereognosia", vascular: "arteria cerebral media", route: "talamo -> giro pos-central -> cortex parietal associativo", baseRegion: "somatosensory", brodmann: "BA3/1/2", network: "rede somatossensorial" },
    superiorParietal: { label: "Lobulo parietal superior", shortLabel: "Parietal", function: "integracao visuoespacial e esquema corporal", clinical: "lesao pode cursar com negligencia e apraxia", vascular: "arteria cerebral media", route: "parietal superior -> redes frontoparietais -> controle visuomotor", baseRegion: "parietal", brodmann: "BA5/7", network: "rede dorsal atencional" },
    wernicke: { label: "Area de Wernicke", shortLabel: "Wernicke", function: "compreensao da linguagem", clinical: "lesao dominante pode gerar afasia de Wernicke", vascular: "ramo inferior da arteria cerebral media", route: "cortex temporal posterior -> fasciculo arqueado -> area de Broca", baseRegion: "temporal", brodmann: "BA22", network: "rede de linguagem receptiva" },
    temporalAssociation: { label: "Cortex temporal associativo", shortLabel: "Temporal", function: "memoria semantica e reconhecimento auditivo", clinical: "lesao pode comprometer reconhecimento e memoria verbal", vascular: "arteria cerebral media", route: "temporal associativo -> hipocampo -> redes limbicas", baseRegion: "temporal", brodmann: "BA21/37", network: "rede temporal-limbica" },
    visual: { label: "Cortex visual", shortLabel: "Visual", function: "processamento visual primario e secundario", clinical: "lesao pode causar escotomas ou hemianopsia", vascular: "arteria cerebral posterior", route: "retina -> corpo geniculado lateral -> cortex occipital -> vias dorsal e ventral", baseRegion: "occipital", brodmann: "BA17/18/19", network: "rede visual" },
    thalamus: { label: "Talamo", shortLabel: "Talamo", function: "rele sensorial e integracao corticotalamica", clinical: "lesao pode alterar sensibilidade, alerta e circuitos motores", vascular: "ramos perfurantes talamicos", route: "vias ascendentes -> talamo -> cortex", baseRegion: "subcortical", brodmann: "Subcortical", network: "hub talamocortical" },
    associationHub: { label: "Cortex associativo", shortLabel: "Associacao", function: "integracao multimodal e conectividade cortical", clinical: "disfuncao pode reduzir coerencia de redes cognitivas", vascular: "territorios de fronteira ACA/MCA/PCA", route: "redes associativas -> hubs frontoparietais -> integracao global", baseRegion: "association", brodmann: "BA39/40/46 mix", network: "rede de integracao" },
  };

  const MAP_MODE_LABELS = {
    anatomical: "Anatomico",
    functional: "Funcional",
    brodmann: "Brodmann",
    pathways: "Vias neurais",
  };

  const REGION_PATHWAYS = {
    prefrontal: ["prefrontal", "thalamus", "associationHub"],
    broca: ["broca", "wernicke", "associationHub"],
    precentral: ["precentral", "thalamus", "associationHub"],
    postcentral: ["thalamus", "postcentral", "superiorParietal"],
    superiorParietal: ["visual", "superiorParietal", "prefrontal"],
    wernicke: ["visual", "wernicke", "broca"],
    temporalAssociation: ["temporalAssociation", "thalamus", "associationHub"],
    visual: ["thalamus", "visual", "superiorParietal"],
    thalamus: ["thalamus", "postcentral", "precentral"],
    associationHub: ["associationHub", "prefrontal", "superiorParietal"],
  };

  function classifyCortexRegion(pos) {
    const { x, y, z } = pos;
    const r = Math.sqrt(x * x + y * y + z * z);
    if (r < 0.45) return "thalamus";
    if (z < -0.38) return "visual";
    if (x < -0.18 && y < 0.06 && z > 0.02 && z < 0.30) return "broca";
    if (Math.abs(x) > 0.34 && y < 0.06 && z > -0.22 && z < 0.22) return z > 0 ? "wernicke" : "temporalAssociation";
    if (Math.abs(z) < 0.10 && y > 0.14) return z >= 0 ? "precentral" : "postcentral";
    if (y > 0.24 && z >= -0.18 && z <= 0.22) return "superiorParietal";
    if (z > 0.30 && y > -0.14) return "prefrontal";
    return "associationHub";
  }

  function getRegionProfile(regionId) {
    return ANATOMY_REGIONS[regionId] || ANATOMY_REGIONS.associationHub;
  }

  function blendRegionActivation(regionColor, activationColor, t = 0.55) {
    const c = regionColor.clone();
    c.lerp(activationColor, t);
    return c;
  }

  function colorRegionHemisphere(region, hemisphere, activation) {
    const regionProfile = getRegionProfile(region);
    const base = REGION_COLORS[regionProfile.baseRegion] || REGION_COLORS.association;
    const hemi = hemisphere === "left" ? 0.85 : 1.15;
    const r = clamp(base.r * hemi + activation * 0.5, 0, 1);
    const g = clamp(base.g * hemi, 0, 1);
    const b = clamp(base.b * hemi - activation * 0.3, 0, 1);
    return new THREE.Color(r, g, b);
  }

  function functionalColor(regionId) {
    const network = getRegionProfile(regionId).network;
    if (network.includes("motora")) return new THREE.Color(1.0, 0.36, 0.36);
    if (network.includes("visual")) return new THREE.Color(0.72, 0.48, 1.0);
    if (network.includes("linguagem")) return new THREE.Color(1.0, 0.72, 0.32);
    if (network.includes("executiva")) return new THREE.Color(0.32, 0.82, 1.0);
    if (network.includes("atencional")) return new THREE.Color(0.52, 1.0, 0.62);
    if (network.includes("talamocortical")) return new THREE.Color(0.78, 0.78, 0.86);
    return new THREE.Color(0.72, 0.82, 0.98);
  }

  function brodmannColor(regionId) {
    const code = getRegionProfile(regionId).brodmann;
    if (code.includes("BA4")) return new THREE.Color(1.0, 0.28, 0.28);
    if (code.includes("BA3")) return new THREE.Color(1.0, 0.88, 0.28);
    if (code.includes("BA17")) return new THREE.Color(0.78, 0.46, 1.0);
    if (code.includes("BA44")) return new THREE.Color(1.0, 0.58, 0.26);
    if (code.includes("BA22")) return new THREE.Color(0.92, 0.78, 0.28);
    if (code.includes("BA9")) return new THREE.Color(0.36, 0.82, 1.0);
    if (code.includes("BA5")) return new THREE.Color(0.42, 0.95, 0.62);
    return new THREE.Color(0.76, 0.82, 0.96);
  }

  class HologramaCore {
    constructor(threeScene, hooks = {}, profile = {}) {
      this.scene = threeScene;
      this.hooks = hooks;
      this.profile = profile;
      this.labelContainer = document.getElementById("labelLayer") || document.body;

      this.group = new THREE.Group();
      this.scene.add(this.group);

      this.sceneName = "sphere";
      this.sourceMode = "pure";
      this.running = true;
      this.time = 0;
      this.modeTimer = 0;
      this.objectAccumulator = 0;
      this.referenceAccumulator = 0;
      this.clusterAccumulator = 0;
      this.xorAccumulator = 0;

      this.system = { mode: "idle" };
      this.nodes = [];
      this.edges = [];
      this.adjacency = [];
      this.edgeLookup = new Map();
      this.pulses = [];

      this.nodeMesh = null;
      this.edgeLines = null;
      this.pulseMesh = null;
      this.edgeColors = null;
      this.pulsePositions = null;
      this.pulseColors = null;

      this.specialGroup = null;
      this.objectBeamMesh = null;
      this.referenceBeamMesh = null;
      this.objectBeamEntryGlow = null;
      this.referenceBeamAnchorGlow = null;
      this.energyCore = null;
      this.memoryClusters = [];

      this.topologyRadius = 6;
      this.objectBeamDirection = new THREE.Vector3(-1, 0.25, 0.15).normalize();
      this.referenceBeamDirection = new THREE.Vector3(0, 1, 0);
      this.referenceSeedIds = [];

      this.roleIds = { inputs: [], hidden: [], output: null };
      this.xorData = [
        { x: [0, 0], y: 0 },
        { x: [0, 1], y: 1 },
        { x: [1, 0], y: 1 },
        { x: [1, 1], y: 0 },
      ];
      this.xorStep = 0;
      this.lossEMA = 0;
      this.predictionText = "-";
      this.regionLabels = {};
      this.labelContainer = document.getElementById("labelLayer") || document.body;
      this.gestureState = {
        active: false,
        type: "idle",
        rotationX: 0,
        rotationY: 0,
        zoomDelta: 0,
        layerSpread: 0,
        strength: 0,
        pointer: [0.5, 0.5],
        pulseRoute: null,
      };
      this.selectedNodeId = null;
      this.selectedRegionId = null;
      this.selectedRegionRoute = null;
      this.mapMode = "anatomical";
      this.pathwayAccumulator = 0;
    }

    setProfile(profile) {
      this.profile = profile || this.profile;
    }

    setMapMode(mode = "anatomical") {
      this.mapMode = mode;
      this._initRegionLabels();
      if (this.selectedNodeId !== null && this.nodes[this.selectedNodeId]) {
        this._emitRegionDetail(this.nodes[this.selectedNodeId]);
      }
    }

    pause(value = true) {
      this.running = !value;
    }

    describeScene() {
      const sourceCopy = this.sourceMode === "api"
        ? "topologia via FastAPI"
        : "topologia local em Three.js";

      if (this.sceneName === "sphere") {
        return `Esfera holografica viva ativa, com beam sensorial, beam de referencia e memoria distribuida (${sourceCopy}).`;
      }
      if (this.sceneName === "pulses") {
        return `Rede holografica em propagacao intensa, com ondas, cascatas e interferencia luminosa (${sourceCopy}).`;
      }
      return `Rede experimental XOR ativa, com plasticidade e reforco de caminhos em tempo real (${sourceCopy}).`;
    }

    dispose() {
      this._removeLabels();
      this.nodes = [];
      this.edges = [];
      this.adjacency = [];
      this.edgeLookup.clear();
      this.pulses = [];
      while (this.group.children.length) {
        const child = this.group.children.pop();
        this.group.remove(child);
        this._disposeObject(child);
      }
    }

    rebuild(topology, sceneName, sourceMode, profile) {
      this.setProfile(profile);
      this.dispose();

      this.sceneName = sceneName;
      this.sourceMode = sourceMode;
      this.time = 0;
      this.modeTimer = 0;
      this.objectAccumulator = 0;
      this.referenceAccumulator = 0;
      this.clusterAccumulator = 0;
      this.xorAccumulator = 0;
      this.xorStep = 0;
      this.lossEMA = 0;
      this.predictionText = "-";

      this._buildNodes(topology.nodes || []);
      this._buildEdges(topology.edges || []);
      this._assignXorRoles();
      this._ensureXorEdges();
      this._rebuildAdjacency();
      this._buildNodeMesh();
      this._buildEdgeLines();
      this._buildPulseLayer();
      this._buildSpecialVisuals();
      this._selectReferenceSeeds();
      this._initRegionLabels();

      if (sceneName === "xor") this._setSystemMode("learning", true);
      else if (sceneName === "pulses") this._setSystemMode("processing", true);
      else this._setSystemMode("idle", true);

      this._emitXorStats();
    }

    getPickTarget(raycaster) {
      if (!this.nodeMesh) return null;
      const hits = raycaster.intersectObject(this.nodeMesh, false);
      return hits.length ? hits[0] : null;
    }

    inject(nodeId, amount = 1, spread = 0.15) {
      const node = this.nodes[nodeId];
      if (!node) return;

      node.activation = clamp(node.activation + amount * 0.24, 0, 1.45);
      node.energy = clamp(node.energy - amount * 0.03, 0.05, 1.35);
      node.memory.push(node.activation);
      if (node.memory.length > 8) node.memory.shift();
      node.memoryValue = this._average(node.memory);

      const edgeIndices = this.adjacency[nodeId] || [];
      for (let i = 0; i < edgeIndices.length; i += 1) {
        if (Math.random() < spread && i !== 0) continue;
        this._spawnPulse(this.edges[edgeIndices[i]], nodeId, amount * (0.7 + Math.random() * 0.35));
      }
    }

    setGestureState(nextState = {}) {
      this.gestureState = {
        ...this.gestureState,
        ...nextState,
        active: Boolean(nextState.active ?? true),
      };
    }

    clearGestureState() {
      this.gestureState = {
        active: false,
        type: "idle",
        rotationX: 0,
        rotationY: 0,
        zoomDelta: 0,
        layerSpread: 0,
        strength: 0,
        pointer: [0.5, 0.5],
        pulseRoute: null,
      };
    }

    focusNode(nodeId, amount = 1.2) {
      if (typeof nodeId !== "number" || !this.nodes[nodeId]) return;
      this.selectedNodeId = nodeId;
      this.selectedRegionId = this.nodes[nodeId].region;
      this.inject(nodeId, amount, 0.04);
      this._emitRegionDetail(this.nodes[nodeId]);
    }

    focusRegion(regionId, hemisphere = null, amount = 1.1) {
      const candidates = this.nodes.filter((node) => node.region === regionId && (!hemisphere || node.hemisphere === hemisphere));
      if (!candidates.length) return null;
      const target = candidates[Math.floor(candidates.length / 2)];
      this.focusNode(target.id, amount);
      return target.id;
    }

    _findRepresentativeNode(regionId) {
      const candidates = this.nodes.filter((node) => node.region === regionId);
      if (!candidates.length) return null;
      return candidates
        .map((node) => ({
          node,
          score: node.activation * 0.4 + node.memoryValue * 0.2 + node.coherence * 0.2 + (1 - node.pos.length() / Math.max(this.topologyRadius, 0.001)) * 0.2,
        }))
        .sort((a, b) => b.score - a.score)[0].node;
    }

    _emitRegionalPathway(dt) {
      if (this.mapMode !== "pathways" || !this.selectedRegionId) return;
      this.pathwayAccumulator += dt;
      if (this.pathwayAccumulator < 0.28) return;
      this.pathwayAccumulator = 0;

      const route = REGION_PATHWAYS[this.selectedRegionId] || [this.selectedRegionId];
      for (let i = 0; i < route.length; i += 1) {
        const currentNode = this._findRepresentativeNode(route[i]);
        if (!currentNode) continue;
        this.inject(currentNode.id, 0.68 + i * 0.08, 0.05);

        if (i === route.length - 1) continue;
        const nextNode = this._findRepresentativeNode(route[i + 1]);
        if (!nextNode) continue;

        const adjacency = this.adjacency[currentNode.id] || [];
        let bestEdge = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let j = 0; j < adjacency.length; j += 1) {
          const edge = this.edges[adjacency[j]];
          const otherId = edge.a === currentNode.id ? edge.b : edge.a;
          const distance = this.nodes[otherId].pos.distanceToSquared(nextNode.pos);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestEdge = edge;
          }
        }

        if (bestEdge) {
          this._spawnPulse(bestEdge, currentNode.id, 1.15 + i * 0.12);
        }
      }
    }

    update(deltaTime, camera) {
      if (!this.running || !this.nodeMesh || !this.edgeLines || !this.pulseMesh) return;

      const dt = Math.min(deltaTime, 0.033);
      this.time += dt;
      this.modeTimer += dt;

      this._updateSceneMode();
      this._updateAmbientNodes();
      this._autoInject(dt);
      this._emitRegionalPathway(dt);
      this._updatePulses(dt);
      this._propagate();

      if (this.sceneName === "xor") {
        this.xorAccumulator += dt;
        while (this.xorAccumulator >= 0.08) {
          this._trainXorStep();
          this.xorAccumulator -= 0.08;
        }
      }

      this._updateBeamVisuals();
      this._updateMemoryClusters();
      this._updateNodeVisuals();
      this._updateEdgeVisuals();
      this._updateCoreVisuals();
      this._updateGestureEffects(dt);
      this._updateLabels(camera);

      const gestureInfluence = this.gestureState.active ? this.gestureState.strength : 0;
      const gestureRotX = this.gestureState.rotationX * 0.4 * gestureInfluence;
      const gestureRotY = this.gestureState.rotationY * 0.45 * gestureInfluence;
      this.group.rotation.x = Math.sin(this.time * 0.24) * 0.045 + gestureRotX;
      this.group.rotation.y += dt * (0.082 + gestureRotY * 0.08);
      this.group.rotation.z = gestureRotY * 0.08;
    }

    _disposeObject(object) {
      object.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose());
          else node.material.dispose();
        }
      });
    }

    _removeLabels() {
      Object.values(this.regionLabels || {}).forEach((label) => {
        if (label && label.remove) label.remove();
      });
      this.regionLabels = {};
      this.selectedRegionId = null;
      this.selectedRegionRoute = null;
    }

    _average(values) {
      if (!values.length) return 0;
      return values.reduce((acc, value) => acc + value, 0) / values.length;
    }

    _buildNodes(rawNodes) {
      let maxRadius = 0;
      this.nodes = rawNodes.map((coords, index) => {
        const position = new THREE.Vector3(coords[0], coords[1], coords[2]);
        maxRadius = Math.max(maxRadius, position.length());
        const normalized = position.clone();
        return {
          id: index,
          pos: position,
          activation: 0,
          nextActivation: 0,
          energy: 1,
          bias: (Math.random() - 0.5) * 0.18,
          memory: [],
          memoryValue: 0,
          coherence: 0,
          isInput: false,
          isHidden: false,
          isOutput: false,
          region: "associationHub",
          hemisphere: "left",
          regionProfile: ANATOMY_REGIONS.associationHub,
        };
      });

      this.topologyRadius = maxRadius || this.profile?.defaults?.radius || 6;

      // classificar regiões corticais a partir das coordenadas normalizadas
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        const norm = node.pos.clone().divideScalar(this.topologyRadius || 1);
        node.region = classifyCortexRegion(norm);
        node.hemisphere = getHemisphere(norm.x);
        node.regionProfile = getRegionProfile(node.region);
      }
    }

    _buildEdges(rawEdges) {
      this.edges = rawEdges.map((pair) => ({
        a: pair[0],
        b: pair[1],
        weight: (Math.random() - 0.5) * 1.2,
        signal: 0,
        glow: 0,
        speed: 0.75 + Math.random() * 0.75,
        decay: 0.93 + Math.random() * 0.04,
      }));
    }

    _assignXorRoles() {
      const radius = this.topologyRadius;
      const targets = [
        new THREE.Vector3(-radius * 0.82, radius * 0.32, radius * 0.22),
        new THREE.Vector3(-radius * 0.82, -radius * 0.32, radius * 0.22),
        new THREE.Vector3(-radius * 0.1, radius * 0.52, radius * 0.34),
        new THREE.Vector3(-radius * 0.08, radius * 0.14, radius * 0.4),
        new THREE.Vector3(-radius * 0.1, -radius * 0.16, radius * 0.34),
        new THREE.Vector3(-radius * 0.08, -radius * 0.5, radius * 0.24),
        new THREE.Vector3(radius * 0.84, 0, radius * 0.24),
      ];
      const used = new Set();
      const picked = targets.map((target) => this._closestNodeTo(target, used));

      this.roleIds.inputs = picked.slice(0, 2);
      this.roleIds.hidden = picked.slice(2, 6);
      this.roleIds.output = picked[6];

      this.nodes.forEach((node) => {
        node.isInput = this.roleIds.inputs.includes(node.id);
        node.isHidden = this.roleIds.hidden.includes(node.id);
        node.isOutput = node.id === this.roleIds.output;
      });
    }

    _closestNodeTo(target, used) {
      let bestId = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < this.nodes.length; i += 1) {
        if (used.has(i)) continue;
        const distance = this.nodes[i].pos.distanceToSquared(target);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = i;
        }
      }
      used.add(bestId);
      return bestId;
    }

    _edgeKey(a, b) {
      return a < b ? `${a}:${b}` : `${b}:${a}`;
    }

    _ensureXorEdges() {
      this.edgeLookup.clear();
      this.edges.forEach((edge, index) => {
        this.edgeLookup.set(this._edgeKey(edge.a, edge.b), index);
      });

      const ensure = (a, b, weight) => {
        const key = this._edgeKey(a, b);
        if (this.edgeLookup.has(key)) return;
        const edge = {
          a: Math.min(a, b),
          b: Math.max(a, b),
          weight,
          signal: 0,
          glow: 0,
          speed: 1.08,
          decay: 0.968,
        };
        this.edgeLookup.set(key, this.edges.length);
        this.edges.push(edge);
      };

      this.roleIds.inputs.forEach((inputId) => {
        this.roleIds.hidden.forEach((hiddenId) => {
          ensure(inputId, hiddenId, (Math.random() - 0.5) * 1.9);
        });
      });

      this.roleIds.hidden.forEach((hiddenId) => {
        ensure(hiddenId, this.roleIds.output, (Math.random() - 0.5) * 1.9);
      });
    }

    _rebuildAdjacency() {
      this.adjacency = Array.from({ length: this.nodes.length }, () => []);
      this.edgeLookup.clear();
      this.edges.forEach((edge, index) => {
        this.adjacency[edge.a].push(index);
        this.adjacency[edge.b].push(index);
        this.edgeLookup.set(this._edgeKey(edge.a, edge.b), index);
      });
    }

    _buildNodeMesh() {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.InstancedMesh(geometry, material, this.nodes.length);
      const dummy = new THREE.Object3D();

      for (let i = 0; i < this.nodes.length; i += 1) {
        dummy.position.copy(this.nodes[i].pos);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(0x7ad7ff));
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      this.nodeMesh = mesh;
      this.group.add(mesh);
    }

    _buildEdgeLines() {
      const positions = new Float32Array(this.edges.length * 2 * 3);
      this.edgeColors = new Float32Array(this.edges.length * 2 * 3);

      for (let i = 0; i < this.edges.length; i += 1) {
        const edge = this.edges[i];
        const a = this.nodes[edge.a].pos;
        const b = this.nodes[edge.b].pos;
        const offset = i * 6;

        positions[offset] = a.x;
        positions[offset + 1] = a.y;
        positions[offset + 2] = a.z;
        positions[offset + 3] = b.x;
        positions[offset + 4] = b.y;
        positions[offset + 5] = b.z;

        for (let p = 0; p < 2; p += 1) {
          this.edgeColors[offset + p * 3] = 0.12;
          this.edgeColors[offset + p * 3 + 1] = 0.26;
          this.edgeColors[offset + p * 3 + 2] = 0.56;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(this.edgeColors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.28,
      });

      this.edgeLines = new THREE.LineSegments(geometry, material);
      this.group.add(this.edgeLines);
    }

    _buildPulseLayer() {
      const maxPulses = 1200;
      const geometry = new THREE.BufferGeometry();
      this.pulsePositions = new Float32Array(maxPulses * 3);
      this.pulseColors = new Float32Array(maxPulses * 3);
      geometry.setAttribute("position", new THREE.BufferAttribute(this.pulsePositions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(this.pulseColors, 3));
      geometry.setDrawRange(0, 0);

      const material = new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.pulseMesh = new THREE.Points(geometry, material);
      this.group.add(this.pulseMesh);
    }

    _buildSpecialVisuals() {
      this.specialGroup = new THREE.Group();
      this.group.add(this.specialGroup);

      const coreOuter = new THREE.Mesh(
        new THREE.SphereGeometry(this.topologyRadius * 0.18, 18, 18),
        new THREE.MeshBasicMaterial({
          color: 0x5bcbff,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
        })
      );
      const coreInner = new THREE.Mesh(
        new THREE.SphereGeometry(this.topologyRadius * 0.1, 18, 18),
        new THREE.MeshBasicMaterial({
          color: 0xb46dff,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
        })
      );
      this.energyCore = new THREE.Group();
      this.energyCore.add(coreOuter);
      this.energyCore.add(coreInner);
      this.specialGroup.add(this.energyCore);

      this.objectBeamMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          this.topologyRadius * 0.012,
          this.topologyRadius * 0.045,
          this.topologyRadius * 1.25,
          18,
          1,
          true
        ),
        new THREE.MeshBasicMaterial({
          color: 0x69d7ff,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      this.referenceBeamMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          this.topologyRadius * 0.01,
          this.topologyRadius * 0.032,
          this.topologyRadius * 0.85,
          18,
          1,
          true
        ),
        new THREE.MeshBasicMaterial({
          color: 0xb66dff,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      this.objectBeamEntryGlow = new THREE.Mesh(
        new THREE.SphereGeometry(this.topologyRadius * 0.075, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0x72e5ff,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.referenceBeamAnchorGlow = new THREE.Mesh(
        new THREE.SphereGeometry(this.topologyRadius * 0.055, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0xc18cff,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.specialGroup.add(this.objectBeamMesh);
      this.specialGroup.add(this.referenceBeamMesh);
      this.specialGroup.add(this.objectBeamEntryGlow);
      this.specialGroup.add(this.referenceBeamAnchorGlow);

      this.memoryClusters = [];
      for (let i = 0; i < 8; i += 1) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(this.topologyRadius * 0.06, 16, 16),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x72f5ff : 0xd590ff,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        mesh.visible = false;
        this.memoryClusters.push(mesh);
        this.specialGroup.add(mesh);
      }
    }

    _selectReferenceSeeds() {
      const ranked = [...this.nodes]
        .map((node) => ({ id: node.id, radius: node.pos.length() }))
        .sort((a, b) => a.radius - b.radius);
      this.referenceSeedIds = ranked.slice(0, 6).map((item) => item.id);
    }

    _currentProfile() {
      const defaults = this.profile?.defaults || {};
      const objectIntensity = defaults.beamIntensity?.object ?? 1.0;
      const referenceIntensity = defaults.beamIntensity?.reference ?? 0.72;

      switch (this.system.mode) {
        case "processing":
          return { pulseSpeed: 1.08, leak: 0.946, cascade: 0.22, objectIntensity, referenceIntensity };
        case "learning":
          return { pulseSpeed: 1.22, leak: 0.952, cascade: 0.28, objectIntensity: objectIntensity * 0.92, referenceIntensity: referenceIntensity * 1.05 };
        case "stress":
          return { pulseSpeed: 1.82, leak: 0.962, cascade: 0.36, objectIntensity: objectIntensity * 1.18, referenceIntensity: referenceIntensity * 0.85 };
        case "idle":
        default:
          return { pulseSpeed: 0.62, leak: 0.932, cascade: 0.12, objectIntensity: objectIntensity * 0.72, referenceIntensity: referenceIntensity * 0.82 };
      }
    }

    _setSystemMode(mode, force = false) {
      if (!force && this.system.mode === mode) return;
      this.system.mode = mode;
      if (this.hooks.onGlobalMode) this.hooks.onGlobalMode(mode);
      if (this.hooks.onInfo) this.hooks.onInfo(this.describeScene());
    }

    _updateSceneMode() {
      if (this.sceneName === "xor") {
        this._setSystemMode("learning");
        return;
      }
      if (this.sceneName === "pulses") {
        const phase = Math.floor(this.time / 4.4) % 2;
        this._setSystemMode(phase === 0 ? "processing" : "stress");
        return;
      }
      const phases = ["idle", "processing", "learning", "stress"];
      this._setSystemMode(phases[Math.floor(this.time / 6.4) % phases.length]);
    }

    _updateAmbientNodes() {
      const profile = this._currentProfile();
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        node.activation *= profile.leak;
        node.nextActivation = 0;
        node.energy = clamp(node.energy + 0.012 - node.activation * 0.008, 0.05, 1.35);
        node.memoryValue *= 0.988;
        node.coherence = this._interferenceForNode(node);
      }
    }

    _interferenceForNode(node) {
      const surfaceInfluence = this._surfaceInfluence(node);
      const referenceInfluence = this._referenceInfluence(node);
      return clamp(surfaceInfluence * 0.6 + referenceInfluence * 0.4 + surfaceInfluence * referenceInfluence * 0.75, 0, 1.6);
    }

    _surfaceInfluence(node) {
      const direction = node.pos.clone().normalize();
      const beamFocus = clamp(direction.dot(this.objectBeamDirection.clone().multiplyScalar(-1)), 0, 1);
      const shellFactor = clamp(node.pos.length() / this.topologyRadius, 0, 1);
      return beamFocus * shellFactor;
    }

    _referenceInfluence(node) {
      const radial = clamp(node.pos.length() / this.topologyRadius, 0, 1);
      return 1 - radial;
    }

    _surfaceSeedNode() {
      let bestId = 0;
      let bestScore = -1;
      for (let i = 0; i < this.nodes.length; i += 1) {
        const score = this._surfaceInfluence(this.nodes[i]);
        if (score > bestScore) {
          bestScore = score;
          bestId = i;
        }
      }
      return bestId;
    }

    _autoInject(dt) {
      const profile = this._currentProfile();
      this.objectAccumulator += dt * profile.objectIntensity;
      this.referenceAccumulator += dt * profile.referenceIntensity;

      while (this.objectAccumulator >= (this.sceneName === "sphere" ? 0.32 : 0.2)) {
        this.objectAccumulator -= this.sceneName === "sphere" ? 0.32 : 0.2;
        const sourceId = this._surfaceSeedNode();
        const amount = this.sceneName === "sphere" ? 0.52 : 0.78;
        this.inject(sourceId, amount * profile.objectIntensity, this.sceneName === "sphere" ? 0.24 : 0.1);
      }

      while (this.referenceAccumulator >= 0.48) {
        this.referenceAccumulator -= 0.48;
        for (let i = 0; i < this.referenceSeedIds.length; i += 1) {
          this.inject(this.referenceSeedIds[i], 0.24 * profile.referenceIntensity, 0.45);
        }
      }
    }

    _spawnPulse(edge, sourceNodeId, amplitude = 1) {
      if (this.pulses.length >= this.pulsePositions.length / 3) return;
      const forward = edge.a === sourceNodeId;
      this.pulses.push({
        edge,
        forward,
        amplitude: clamp(amplitude, 0.08, 1.8),
        t: 0,
      });
      edge.glow = clamp(edge.glow + amplitude * 0.52, 0, 2.2);
      edge.signal = clamp(edge.signal + amplitude * 0.42, 0, 2.2);
    }

    _updatePulses(dt) {
      const profile = this._currentProfile();
      let activeCount = 0;

      for (let i = this.pulses.length - 1; i >= 0; i -= 1) {
        const pulse = this.pulses[i];
        const edge = pulse.edge;
        const a = this.nodes[edge.a].pos;
        const b = this.nodes[edge.b].pos;
        pulse.t += dt * profile.pulseSpeed * edge.speed * (0.65 + pulse.amplitude * 0.55);

        if (pulse.t >= 1) {
          const targetId = pulse.forward ? edge.b : edge.a;
          const sourceId = pulse.forward ? edge.a : edge.b;
          const sourceNode = this.nodes[sourceId];
          const targetNode = this.nodes[targetId];
          const transfer = sourceNode.activation * edge.weight * 0.26 + pulse.amplitude * 0.19 + targetNode.coherence * 0.08;

          targetNode.nextActivation += transfer;
          targetNode.energy = clamp(targetNode.energy - Math.abs(transfer) * 0.02, 0.05, 1.35);
          targetNode.memory.push(Math.abs(transfer) * 0.6 + targetNode.coherence * 0.4);
          if (targetNode.memory.length > 8) targetNode.memory.shift();
          targetNode.memoryValue = this._average(targetNode.memory);

          edge.weight = clamp(edge.weight + transfer * 0.0018, -2.5, 2.5);
          edge.glow = clamp(edge.glow + Math.abs(transfer) * 0.9, 0, 2.5);

          if (Math.abs(transfer) > 0.16 && this.sceneName !== "sphere") {
            const nextEdges = this.adjacency[targetId] || [];
            for (let n = 0; n < nextEdges.length; n += 1) {
              const nextEdge = this.edges[nextEdges[n]];
              const otherId = nextEdge.a === targetId ? nextEdge.b : nextEdge.a;
              if (otherId === sourceId) continue;
              if (Math.random() < profile.cascade) {
                this._spawnPulse(nextEdge, targetId, Math.abs(transfer) * 0.88);
              }
            }
          }

          this.pulses.splice(i, 1);
          continue;
        }

        if (activeCount >= this.pulsePositions.length / 3) continue;

        const t = pulse.forward ? pulse.t : 1 - pulse.t;
        const offset = activeCount * 3;
        this.pulsePositions[offset] = a.x + (b.x - a.x) * t;
        this.pulsePositions[offset + 1] = a.y + (b.y - a.y) * t;
        this.pulsePositions[offset + 2] = a.z + (b.z - a.z) * t;

        const glow = clamp(0.58 + pulse.amplitude * 0.28, 0, 1.2);
        this.pulseColors[offset] = 1.0;
        this.pulseColors[offset + 1] = 0.62 + glow * 0.22;
        this.pulseColors[offset + 2] = 0.24 + glow * 0.1;
        activeCount += 1;
      }

      this.pulseMesh.geometry.setDrawRange(0, activeCount);
      this.pulseMesh.geometry.attributes.position.needsUpdate = true;
      this.pulseMesh.geometry.attributes.color.needsUpdate = true;
    }

    _propagate() {
      const learningRate = 0.02;

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        node.activation = clamp(node.activation + node.nextActivation * 0.42 + node.coherence * 0.03, 0, 1.4);
        node.memoryValue = clamp(node.memoryValue * 0.985 + node.activation * 0.025, 0, 1.4);
      }

      for (let i = 0; i < this.edges.length; i += 1) {
        const edge = this.edges[i];
        edge.glow *= edge.decay;
        edge.signal *= edge.decay;
        const a = this.nodes[edge.a];
        const b = this.nodes[edge.b];
        const hebb = a.activation * b.activation * learningRate;
        edge.weight = clamp(edge.weight * 0.9994 + hebb, -2.5, 2.5);
        if (hebb > 0.001) edge.glow = clamp(edge.glow + hebb * 4.2, 0, 2.6);
      }
    }

    _xorEdge(a, b) {
      return this.edges[this.edgeLookup.get(this._edgeKey(a, b))];
    }

    _sigmoid(value) {
      return 1 / (1 + Math.exp(-value));
    }

    _trainXorStep() {
      const sample = this.xorData[this.xorStep % this.xorData.length];
      const inputIds = this.roleIds.inputs;
      const hiddenIds = this.roleIds.hidden;
      const outputId = this.roleIds.output;

      for (let i = 0; i < this.nodes.length; i += 1) {
        this.nodes[i].activation *= 0.82;
        this.nodes[i].nextActivation = 0;
      }

      this.nodes[inputIds[0]].activation = sample.x[0];
      this.nodes[inputIds[1]].activation = sample.x[1];

      if (sample.x[0] > 0) this.inject(inputIds[0], 1.0, 0);
      if (sample.x[1] > 0) this.inject(inputIds[1], 1.0, 0);

      const hiddenOutputs = [];
      for (let i = 0; i < hiddenIds.length; i += 1) {
        const hiddenId = hiddenIds[i];
        const hiddenNode = this.nodes[hiddenId];
        let sum = hiddenNode.bias;
        for (let j = 0; j < inputIds.length; j += 1) {
          const inputId = inputIds[j];
          sum += this.nodes[inputId].activation * this._xorEdge(inputId, hiddenId).weight;
        }
        const hiddenActivation = this._sigmoid(sum);
        hiddenNode.activation = hiddenActivation;
        hiddenOutputs.push(hiddenActivation);
        if (hiddenActivation > 0.18) this.inject(hiddenId, hiddenActivation * 0.82, 0);
      }

      let outputSum = this.nodes[outputId].bias;
      for (let i = 0; i < hiddenIds.length; i += 1) {
        outputSum += hiddenOutputs[i] * this._xorEdge(hiddenIds[i], outputId).weight;
      }

      const prediction = this._sigmoid(outputSum);
      this.nodes[outputId].activation = prediction;
      this.inject(outputId, prediction * 0.72, 0);

      const target = sample.y;
      const error = target - prediction;
      const loss = error * error;
      this.lossEMA = this.lossEMA === 0 ? loss : this.lossEMA * 0.92 + loss * 0.08;
      const dOut = error * prediction * (1 - prediction);
      const hiddenDeltas = [];

      for (let i = 0; i < hiddenIds.length; i += 1) {
        const hiddenId = hiddenIds[i];
        const hiddenActivation = hiddenOutputs[i];
        const outputEdge = this._xorEdge(hiddenId, outputId);
        const previousWeight = outputEdge.weight;
        outputEdge.weight = clamp(outputEdge.weight + 0.1 * dOut * hiddenActivation, -2.5, 2.5);
        outputEdge.glow = clamp(outputEdge.glow + Math.abs(dOut) * 3.8, 0, 2.5);
        hiddenDeltas.push(hiddenActivation * (1 - hiddenActivation) * dOut * previousWeight);
      }

      for (let i = 0; i < hiddenIds.length; i += 1) {
        const hiddenId = hiddenIds[i];
        const hiddenNode = this.nodes[hiddenId];
        hiddenNode.bias = clamp(hiddenNode.bias + 0.08 * hiddenDeltas[i], -1.8, 1.8);
        for (let j = 0; j < inputIds.length; j += 1) {
          const inputId = inputIds[j];
          const edge = this._xorEdge(inputId, hiddenId);
          edge.weight = clamp(edge.weight + 0.08 * hiddenDeltas[i] * this.nodes[inputId].activation, -2.5, 2.5);
          edge.glow = clamp(edge.glow + Math.abs(hiddenDeltas[i]) * 3.0, 0, 2.2);
        }
      }

      this.nodes[outputId].bias = clamp(this.nodes[outputId].bias + 0.11 * dOut, -1.8, 1.8);
      this.predictionText = `${sample.x[0]} xor ${sample.x[1]} => ${prediction.toFixed(3)} ~ ${prediction >= 0.5 ? 1 : 0} | alvo ${target}`;
      this.xorStep += 1;
      this._emitXorStats();
    }

    _emitXorStats() {
      if (!this.hooks.onXorStats) return;
      this.hooks.onXorStats({
        loss: this.lossEMA,
        steps: this.xorStep,
        prediction: this.predictionText,
      });
    }

    _updateBeamVisuals() {
      const angle = this.time * 0.22;
      this.objectBeamDirection.set(Math.cos(angle), 0.22 + Math.sin(angle * 0.45) * 0.16, Math.sin(angle)).normalize();
      this.referenceBeamDirection.set(Math.sin(angle * 0.3) * 0.2, 1.0, Math.cos(angle * 0.3) * 0.2).normalize();

      const profile = this._currentProfile();
      const objectStart = this.objectBeamDirection.clone().multiplyScalar(-this.topologyRadius * 0.93);
      const objectEnd = this.objectBeamDirection.clone().multiplyScalar(-this.topologyRadius * 0.18);
      const referenceStart = this.referenceBeamDirection.clone().multiplyScalar(-this.topologyRadius * 0.08);
      const referenceEnd = this.referenceBeamDirection.clone().multiplyScalar(this.topologyRadius * 0.58);

      this._placeBeam(
        this.objectBeamMesh,
        objectStart,
        objectEnd,
        0.1 + profile.objectIntensity * 0.05
      );
      this._placeBeam(
        this.referenceBeamMesh,
        referenceStart,
        referenceEnd,
        0.08 + profile.referenceIntensity * 0.04
      );

      if (this.objectBeamEntryGlow) {
        this.objectBeamEntryGlow.position.copy(objectStart);
        this.objectBeamEntryGlow.scale.setScalar(0.85 + profile.objectIntensity * 0.22 + Math.sin(this.time * 2.4) * 0.08);
        this.objectBeamEntryGlow.material.opacity = 0.14 + profile.objectIntensity * 0.08;
      }

      if (this.referenceBeamAnchorGlow) {
        this.referenceBeamAnchorGlow.position.copy(referenceStart.clone().multiplyScalar(0.45));
        this.referenceBeamAnchorGlow.scale.setScalar(0.8 + profile.referenceIntensity * 0.18 + Math.sin(this.time * 1.9) * 0.06);
        this.referenceBeamAnchorGlow.material.opacity = 0.1 + profile.referenceIntensity * 0.05;
      }
    }

    _updateGestureEffects(dt) {
      const state = this.gestureState || {};
      const strength = clamp(state.strength || 0, 0, 1);
      const layerSpread = clamp(state.layerSpread || 0, 0, 1);

      if (this.specialGroup) {
        this.specialGroup.rotation.y += dt * strength * 0.25;
      }

      if (this.energyCore) {
        const scale = 1 + strength * 0.28 + Math.sin(this.time * 6.5) * 0.04;
        this.energyCore.scale.setScalar(scale);
      }

      if (this.objectBeamEntryGlow) {
        this.objectBeamEntryGlow.scale.setScalar(1 + strength * 1.6);
        this.objectBeamEntryGlow.material.opacity = 0.18 + strength * 0.25;
      }

      if (this.referenceBeamAnchorGlow) {
        this.referenceBeamAnchorGlow.scale.setScalar(1 + layerSpread * 2.2);
        this.referenceBeamAnchorGlow.material.opacity = 0.16 + layerSpread * 0.2;
      }

      if (this.nodeMesh) {
        const explode = state.type === "two_hand_expand" ? layerSpread * 0.42 : 0;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < this.nodes.length; i += 1) {
          const node = this.nodes[i];
          const direction = node.pos.clone().normalize();
          const selectedBoost = i === this.selectedNodeId ? 0.42 : node.region === this.selectedRegionId ? 0.18 : 0;
          const scale = 1 + strength * 0.18 + selectedBoost;
          dummy.position.copy(node.pos).addScaledVector(direction, this.topologyRadius * explode);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          this.nodeMesh.setMatrixAt(i, dummy.matrix);
        }
        this.nodeMesh.instanceMatrix.needsUpdate = true;
      }

      if (state.pulseRoute && this.selectedRegionId) {
        this.selectedRegionRoute = state.pulseRoute;
      }
    }

    _placeBeam(mesh, start, end, opacity) {
      const direction = end.clone().sub(start);
      const length = direction.length();
      mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
      mesh.scale.set(1, length / Math.max(this.topologyRadius * 2.4, 0.001), 1);
      mesh.material.opacity = opacity;
      const up = new THREE.Vector3(0, 1, 0);
      mesh.quaternion.setFromUnitVectors(up, direction.normalize());
    }

    _updateMemoryClusters() {
      this.clusterAccumulator += 1;
      if (this.clusterAccumulator % 6 !== 0) return;

      const threshold = this.profile?.defaults?.memoryThreshold ?? 0.62;
      const ranked = [...this.nodes]
        .map((node) => ({
          node,
          score: node.activation * 0.5 + node.memoryValue * 0.35 + node.coherence * 0.45,
        }))
        .filter((item) => item.score >= threshold * 0.45)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.memoryClusters.length);

      for (let i = 0; i < this.memoryClusters.length; i += 1) {
        const clusterMesh = this.memoryClusters[i];
        const item = ranked[i];
        if (!item) {
          clusterMesh.visible = false;
          clusterMesh.material.opacity = 0;
          continue;
        }

        clusterMesh.visible = true;
        clusterMesh.position.copy(item.node.pos.clone().multiplyScalar(0.62 + item.node.coherence * 0.12));
        clusterMesh.scale.setScalar(0.7 + item.score * 1.35);
        clusterMesh.material.opacity = clamp(0.08 + item.score * 0.16, 0.06, 0.28);
      }
    }

    _updateNodeVisuals() {
      const dummy = new THREE.Object3D();

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        const activation = clamp(node.activation, 0, 1.5);
        const wobble = 1 + Math.sin(this.time * 2.2 + i * 0.17) * 0.03;
        const scale = 1 + activation * 2.3 + node.memoryValue * 0.48 + node.coherence * 0.32;

        dummy.position.copy(node.pos);
        dummy.scale.setScalar(scale * wobble);
        dummy.updateMatrix();
        this.nodeMesh.setMatrixAt(i, dummy.matrix);

        let color = colorRegionHemisphere(node.region, node.hemisphere, activation);
        if (this.mapMode === "functional") {
          color = blendRegionActivation(functionalColor(node.region), colorFromActivation(activation), 0.42);
        } else if (this.mapMode === "brodmann") {
          color = blendRegionActivation(brodmannColor(node.region), colorFromActivation(activation), 0.38);
        } else if (this.mapMode === "pathways") {
          color = blendRegionActivation(new THREE.Color(0.36, 0.92, 1.0), colorFromActivation(activation), 0.62);
        }
        if (node.region === this.selectedRegionId) {
          color.lerp(new THREE.Color(1.0, 0.96, 0.72), 0.35);
        }
        this.nodeMesh.setColorAt(i, color);
      }

      this.nodeMesh.instanceMatrix.needsUpdate = true;
      if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;
    }

    _updateEdgeVisuals() {
      for (let i = 0; i < this.edges.length; i += 1) {
        const edge = this.edges[i];
        const selectedEdge = this.selectedRegionId
          && (this.nodes[edge.a].region === this.selectedRegionId || this.nodes[edge.b].region === this.selectedRegionId);
        const intensity = clamp(0.12 + edge.glow * 0.32 + Math.abs(edge.weight) * 0.08 + edge.signal * 0.16, 0.12, 1.0);
        const warm = edge.weight >= 0 ? 1 : 0.65;
        const offset = i * 6;
        const baseR = this.mapMode === "pathways" ? 0.12 : 0.08 * warm;
        const baseG = this.mapMode === "pathways" ? 0.34 : 0.18;
        const baseB = this.mapMode === "pathways" ? 0.68 : 0.42;

        for (let p = 0; p < 2; p += 1) {
          this.edgeColors[offset + p * 3] = (selectedEdge ? 0.32 : baseR) + intensity * 0.16;
          this.edgeColors[offset + p * 3 + 1] = (selectedEdge ? 0.42 : baseG) + intensity * 0.34;
          this.edgeColors[offset + p * 3 + 2] = (selectedEdge ? 0.88 : baseB) + intensity * 0.56;
        }
      }

      this.edgeLines.geometry.attributes.color.needsUpdate = true;
    }

    _updateCoreVisuals() {
      if (!this.energyCore) return;
      const pulse = 1 + Math.sin(this.time * 1.8) * 0.06;
      this.energyCore.scale.setScalar(pulse);
      this.energyCore.children.forEach((child, index) => {
        child.material.opacity = 0.08 + Math.sin(this.time * (1.4 + index * 0.3)) * 0.02 + (this.system.mode === "learning" ? 0.05 : 0) + (this.selectedRegionId ? 0.04 : 0);
      });
    }

    _initRegionLabels() {
      this._removeLabels();
      const regions = new Set(this.nodes.map((n) => n.region));
      regions.forEach((region) => {
        const div = document.createElement("div");
        div.className = "brain-label";
        const profile = getRegionProfile(region);
        div.textContent = this.mapMode === "brodmann"
          ? profile.brodmann.toUpperCase()
          : this.mapMode === "functional"
            ? profile.network.toUpperCase()
            : profile.shortLabel.toUpperCase();
        this.labelContainer.appendChild(div);
        this.regionLabels[region] = div;
      });
    }

    _updateLabels(camera) {
      if (!camera || !this.regionLabels) return;
      const rect = this.labelContainer.getBoundingClientRect();
      const regionCenters = {};

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        if (node.activation <= 0.4) continue;
        if (!regionCenters[node.region]) {
          regionCenters[node.region] = { pos: node.pos.clone(), count: 1 };
        } else {
          regionCenters[node.region].pos.add(node.pos);
          regionCenters[node.region].count += 1;
        }
      }

      const vector = new THREE.Vector3();
      Object.keys(regionCenters).forEach((region) => {
        const center = regionCenters[region];
        center.pos.divideScalar(center.count);
        vector.copy(center.pos).project(camera);
        const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
        const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;
        const label = this.regionLabels[region];
        if (label) {
          label.style.opacity = region === this.selectedRegionId ? 1 : 0.86;
          label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        }
      });

      Object.keys(this.regionLabels).forEach((region) => {
        if (!regionCenters[region]) {
          this.regionLabels[region].style.opacity = 0;
        }
      });
    }

    _emitRegionDetail(node) {
      if (!node || !this.hooks.onRegionFocus) return;
      const profile = node.regionProfile || getRegionProfile(node.region);
      let functionLine = profile.function;
      let routeLine = this.selectedRegionRoute || profile.route;
      if (this.mapMode === "functional") {
        functionLine = `${profile.function}. Rede: ${profile.network}`;
      } else if (this.mapMode === "brodmann") {
        functionLine = `${profile.function}. Mapa: ${profile.brodmann}`;
      } else if (this.mapMode === "pathways") {
        functionLine = `${profile.function}. Via ativa: ${profile.route}`;
        routeLine = this.selectedRegionRoute || profile.route;
      }
      this.hooks.onRegionFocus({
        regionId: node.region,
        hemisphere: node.hemisphere,
        label: `${profile.label} (${node.hemisphere === "left" ? "hemisferio esquerdo" : "hemisferio direito"})`,
        function: functionLine,
        clinical: profile.clinical,
        vascular: profile.vascular,
        route: routeLine,
        pathwayRegions: REGION_PATHWAYS[node.region] || [node.region],
        mapMode: this.mapMode,
        mapModeLabel: MAP_MODE_LABELS[this.mapMode] || this.mapMode,
      });
    }
  }

  window.HologramaCore = HologramaCore;
})();
