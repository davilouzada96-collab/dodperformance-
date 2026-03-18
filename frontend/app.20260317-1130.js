(() => {
  const BUILD_ID = "20260317-1130";
  const params = new URLSearchParams(window.location.search);
  const API_BASE = params.get("apiBase") || "";
  const allowedScenes = new Set(["sphere", "pulses", "xor"]);
  const allowedModes = new Set(["api", "pure"]);

  const canvas = document.getElementById("holoCanvas");
  const sceneSelect = document.getElementById("sceneSelect");
  const dataModeSelect = document.getElementById("dataModeSelect");
  const rebuildBtn = document.getElementById("rebuildBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  const statusScene = document.getElementById("statusScene");
  const statusMode = document.getElementById("statusMode");
  const statusGlobal = document.getElementById("statusGlobal");
  const statusLoss = document.getElementById("statusLoss");
  const statusSteps = document.getElementById("statusSteps");
  const statusPredictions = document.getElementById("statusPredictions");
  const statusInfo = document.getElementById("statusInfo");

  const state = {
    sceneName: allowedScenes.has(params.get("scene")) ? params.get("scene") : "sphere",
    dataMode: allowedModes.has(params.get("mode")) ? params.get("mode") : "pure",
    running: true,
    buildToken: 0,
    resolvedMode: "pure",
    core: null,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
  };

  sceneSelect.value = state.sceneName;
  dataModeSelect.value = state.dataMode;
  state.raycaster.params.Mesh.threshold = 0.25;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x031126, 0.014);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1200);
  camera.position.set(0, 0.7, 16);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 36;
  controls.autoRotate = false;

  const ambientLight = new THREE.AmbientLight(0xd5e6ff, 0.78);
  scene.add(ambientLight);

  const keyLight = new THREE.PointLight(0x8fb9ff, 0.95, 200, 2);
  keyLight.position.set(10, 12, 8);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x1b6cff, 0.45, 160, 2);
  rimLight.position.set(-11, -7, -9);
  scene.add(rimLight);

  const stars = buildStars(1400, 90);
  scene.add(stars);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatModeLabel(requested, resolved) {
    if (requested === resolved) return requested;
    return `${requested} (fallback ${resolved})`;
  }

  function setInfo(text) {
    statusInfo.textContent = `${text} | build ${BUILD_ID}`;
  }

  function resetXorStatus() {
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

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("scene", state.sceneName);
    url.searchParams.set("mode", state.dataMode);
    window.history.replaceState({}, "", url);
  }

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  function buildStars(count, spread) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * spread;
      positions[idx + 1] = (Math.random() - 0.5) * spread;
      positions[idx + 2] = (Math.random() - 0.5) * spread;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x6a8fd9,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
    });
    return new THREE.Points(geometry, material);
  }

  function generateSphereData(radius = 5.9, latLines = 22, lonLines = 30) {
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

  function generatePulseNetwork(nodeCount = 160, connectionDistance = 2.65) {
    const nodes = [];
    for (let i = 0; i < nodeCount; i += 1) {
      nodes.push([
        (Math.random() - 0.5) * 9.8,
        (Math.random() - 0.5) * 9.8,
        (Math.random() - 0.5) * 9.8,
      ]);
    }

    const edges = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[i][0] - nodes[j][0];
        const dy = nodes[i][1] - nodes[j][1];
        const dz = nodes[i][2] - nodes[j][2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < connectionDistance && Math.random() < 0.29) {
          edges.push([i, j]);
        }
      }
    }

    if (edges.length === 0) edges.push([0, 1]);
    return { nodes, edges };
  }

  async function loadTopology(sceneName, requestedMode) {
    const localFactory = sceneName === "pulses"
      ? () => generatePulseNetwork()
      : () => generateSphereData();

    if (requestedMode !== "api") {
      return {
        topology: localFactory(),
        resolvedMode: "pure",
        message: "Topologia gerada no navegador.",
      };
    }

    const apiPath = sceneName === "pulses" ? "/api/pulse-network" : "/api/sphere";
    try {
      const topology = await fetchJson(apiPath);
      if (!Array.isArray(topology.nodes) || !Array.isArray(topology.edges)) {
        throw new Error("Payload invalido");
      }
      return {
        topology,
        resolvedMode: "api",
        message: "Topologia carregada via FastAPI.",
      };
    } catch (error) {
      return {
        topology: localFactory(),
        resolvedMode: "pure",
        message: `FastAPI indisponivel, usando gerador local (${error.message}).`,
      };
    }
  }

  class NeuroCore {
    constructor(threeScene, hooks = {}) {
      this.scene = threeScene;
      this.hooks = hooks;
      this.group = new THREE.Group();
      this.scene.add(this.group);

      this.sceneName = "sphere";
      this.sourceMode = "pure";
      this.running = true;
      this.time = 0;
      this.modeTimer = 0;
      this.triggerAccumulator = 0;
      this.xorAccumulator = 0;
      this.topologyRadius = 6;
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
    }

    pause(value = true) {
      this.running = !value;
    }

    describeScene() {
      return this._sceneMessage();
    }

    dispose() {
      this.pulses.length = 0;
      this.nodes = [];
      this.edges = [];
      this.adjacency = [];
      this.edgeLookup.clear();
      while (this.group.children.length) {
        const child = this.group.children.pop();
        this.group.remove(child);
        this._disposeObject(child);
      }
    }

    rebuild(topology, sceneName, sourceMode) {
      this.dispose();
      this.sceneName = sceneName;
      this.sourceMode = sourceMode;
      this.time = 0;
      this.modeTimer = 0;
      this.triggerAccumulator = 0;
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

      if (sceneName === "xor") this._setSystemMode("learning", true);
      else if (sceneName === "pulses") this._setSystemMode("processing", true);
      else this._setSystemMode("idle", true);

      this._emitStats();
    }

    inject(nodeId, amount = 1, spread = 0.18) {
      const node = this.nodes[nodeId];
      if (!node) return;

      node.activation = clamp(node.activation + amount * 0.24, 0, 1.35);
      node.energy = clamp(node.energy - amount * 0.03, 0.08, 1.3);
      node.memory.push(node.activation);
      if (node.memory.length > 6) node.memory.shift();

      const edgeIndices = this.adjacency[nodeId] || [];
      for (let i = 0; i < edgeIndices.length; i += 1) {
        const edge = this.edges[edgeIndices[i]];
        const amp = amount * (0.75 + Math.random() * 0.35);
        if (Math.random() < 1 - spread || i === 0) {
          this._spawnPulse(edge, nodeId, amp);
        }
      }
    }

    getPickTarget(raycaster) {
      if (!this.nodeMesh) return null;
      const hits = raycaster.intersectObject(this.nodeMesh, false);
      if (!hits.length) return null;
      return hits[0];
    }

    update(deltaTime) {
      if (!this.running || !this.nodeMesh || !this.edgeLines || !this.pulseMesh) return;

      const dt = Math.min(deltaTime, 0.033);
      this.time += dt;
      this.modeTimer += dt;

      if (this.sceneName === "xor") {
        this._setSystemMode("learning");
        this._updateAmbientNodes(dt, 0.986);
        this._updatePulses(dt);
        this.xorAccumulator += dt;
        while (this.xorAccumulator >= 0.08) {
          this._trainXorStep();
          this.xorAccumulator -= 0.08;
        }
      } else {
        this._updateSceneMode(dt);
        this._updateAmbientNodes(dt, this._currentProfile().activationLeak);
        this._autoInject(dt);
        this._updatePulses(dt);
        this._propagate(dt);
      }

      this._updateNodeVisuals();
      this._updateEdgeVisuals();
      this.group.rotation.x = Math.sin(this.time * 0.28) * 0.05;
      this.group.rotation.y += dt * 0.085;
      this.group.rotation.z = Math.sin(this.time * 0.12) * 0.015;
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

    _buildNodes(rawNodes) {
      let maxRadius = 0;
      this.nodes = rawNodes.map((coords, index) => {
        const position = new THREE.Vector3(coords[0], coords[1], coords[2]);
        maxRadius = Math.max(maxRadius, position.length());
        return {
          id: index,
          pos: position,
          activation: 0,
          nextActivation: 0,
          energy: 1,
          bias: (Math.random() - 0.5) * 0.18,
          memory: [],
          memoryValue: 0,
          isInput: false,
          isHidden: false,
          isOutput: false,
        };
      });
      this.topologyRadius = maxRadius || 6;
    }

    _buildEdges(rawEdges) {
      this.edges = rawEdges.map((pair) => ({
        a: pair[0],
        b: pair[1],
        weight: (Math.random() - 0.5) * 1.1,
        signal: 0,
        glow: 0,
        speed: 0.78 + Math.random() * 0.65,
        decay: 0.94 + Math.random() * 0.03,
      }));
    }

    _assignXorRoles() {
      const radius = this.topologyRadius;
      const targets = [
        new THREE.Vector3(-radius * 0.78, radius * 0.34, radius * 0.22),
        new THREE.Vector3(-radius * 0.78, -radius * 0.34, radius * 0.22),
        new THREE.Vector3(-radius * 0.08, radius * 0.52, radius * 0.34),
        new THREE.Vector3(-radius * 0.08, radius * 0.12, radius * 0.38),
        new THREE.Vector3(-radius * 0.08, -radius * 0.18, radius * 0.34),
        new THREE.Vector3(-radius * 0.08, -radius * 0.52, radius * 0.26),
        new THREE.Vector3(radius * 0.82, 0, radius * 0.24),
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
          speed: 1.18,
          decay: 0.968,
        };
        this.edgeLookup.set(key, this.edges.length);
        this.edges.push(edge);
      };

      this.roleIds.inputs.forEach((inputId) => {
        this.roleIds.hidden.forEach((hiddenId) => {
          ensure(inputId, hiddenId, (Math.random() - 0.5) * 1.8);
        });
      });

      this.roleIds.hidden.forEach((hiddenId) => {
        ensure(hiddenId, this.roleIds.output, (Math.random() - 0.5) * 1.8);
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
        const node = this.nodes[i];
        dummy.position.copy(node.pos);
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
          this.edgeColors[offset + p * 3] = 0.18;
          this.edgeColors[offset + p * 3 + 1] = 0.42;
          this.edgeColors[offset + p * 3 + 2] = 0.7;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(this.edgeColors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.36,
      });

      this.edgeLines = new THREE.LineSegments(geometry, material);
      this.group.add(this.edgeLines);
    }

    _buildPulseLayer() {
      const maxPulses = 960;
      const geometry = new THREE.BufferGeometry();
      this.pulsePositions = new Float32Array(maxPulses * 3);
      this.pulseColors = new Float32Array(maxPulses * 3);

      geometry.setAttribute("position", new THREE.BufferAttribute(this.pulsePositions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(this.pulseColors, 3));
      geometry.setDrawRange(0, 0);

      const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });

      this.pulseMesh = new THREE.Points(geometry, material);
      this.group.add(this.pulseMesh);
    }

    _setSystemMode(mode, force = false) {
      if (!force && this.system.mode === mode) return;
      this.system.mode = mode;
      if (this.hooks.onGlobalMode) this.hooks.onGlobalMode(mode);
      if (this.hooks.onInfo) {
        this.hooks.onInfo(this._sceneMessage());
      }
    }

    _currentProfile() {
      switch (this.system.mode) {
        case "processing":
          return {
            pulseSpeed: 1.08,
            emission: 0.95,
            cascadeChance: 0.22,
            activationLeak: 0.948,
            energyDrain: 0.010,
            energyRecover: 0.016,
            plasticity: 0.010,
          };
        case "learning":
          return {
            pulseSpeed: 1.3,
            emission: 0.9,
            cascadeChance: 0.28,
            activationLeak: 0.952,
            energyDrain: 0.012,
            energyRecover: 0.018,
            plasticity: 0.022,
          };
        case "stress":
          return {
            pulseSpeed: 1.82,
            emission: 1.2,
            cascadeChance: 0.38,
            activationLeak: 0.962,
            energyDrain: 0.019,
            energyRecover: 0.011,
            plasticity: 0.007,
          };
        case "idle":
        default:
          return {
            pulseSpeed: 0.58,
            emission: 0.65,
            cascadeChance: 0.13,
            activationLeak: 0.932,
            energyDrain: 0.006,
            energyRecover: 0.014,
            plasticity: 0.004,
          };
      }
    }

    _sceneMessage() {
      const sourceCopy = this.sourceMode === "api"
        ? "topologia via FastAPI"
        : "topologia local em Three.js";

      const modeCopy = `campo global: ${this.system.mode}`;
      if (this.sceneName === "sphere") {
        return `Esfera 3D viva ativa, com pulsacao por no, memoria curta e ondas na malha (${sourceCopy}, ${modeCopy}).`;
      }
      if (this.sceneName === "pulses") {
        return `Rede com pulsos ativa, com propagacao em cascata e caminhos que ganham ou perdem forca (${sourceCopy}, ${modeCopy}).`;
      }
      return `Rede aprendendo XOR ativa, com entradas, camada oculta e saida reorganizando pesos em tempo real (${sourceCopy}, ${modeCopy}).`;
    }

    _updateSceneMode() {
      if (this.sceneName === "pulses") {
        const cycle = Math.floor(this.time / 4.5) % 2;
        this._setSystemMode(cycle === 0 ? "processing" : "stress");
        return;
      }

      const phases = ["idle", "processing", "learning", "stress"];
      const phase = Math.floor(this.time / 6.2) % phases.length;
      this._setSystemMode(phases[phase]);
    }

    _updateAmbientNodes(dt, activationLeak) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        node.activation *= activationLeak;
        node.nextActivation = 0;
        node.energy = clamp(node.energy + 0.012 - node.activation * 0.006, 0.08, 1.35);
        node.memoryValue *= 0.988;
      }
    }

    _autoInject(dt) {
      const profile = this._currentProfile();
      this.triggerAccumulator += dt * profile.emission;

      const threshold = this.sceneName === "sphere" ? 0.34 : 0.22;
      while (this.triggerAccumulator >= threshold) {
        this.triggerAccumulator -= threshold;
        const sourceId = this._pickSeedNode();
        const amplitude = this.sceneName === "sphere"
          ? 0.4 + Math.random() * 0.35
          : 0.65 + Math.random() * 0.45;
        this.inject(sourceId, amplitude, this.sceneName === "sphere" ? 0.28 : 0.12);
      }
    }

    _pickSeedNode() {
      if (!this.nodes.length) return 0;
      const angle = this.time * 0.55;
      const orbit = new THREE.Vector3(
        Math.cos(angle) * this.topologyRadius,
        Math.sin(angle * 0.8) * this.topologyRadius * 0.55,
        Math.sin(angle) * this.topologyRadius
      );
      let bestId = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < this.nodes.length; i += 1) {
        const distance = this.nodes[i].pos.distanceToSquared(orbit);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = i;
        }
      }
      return bestId;
    }

    _spawnPulse(edge, sourceNodeId, amplitude = 1) {
      if (this.pulses.length >= this.pulsePositions.length / 3) return;
      const forward = edge.a === sourceNodeId;
      const amp = clamp(amplitude, 0.08, 1.8);

      this.pulses.push({
        edge,
        forward,
        amplitude: amp,
        t: 0,
      });

      edge.glow = clamp(edge.glow + amp * 0.55, 0, 1.8);
      edge.signal = clamp(edge.signal + amp * 0.42, 0, 1.8);
    }

    _propagate() {
      const profile = this._currentProfile();

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        const signal = clamp(node.nextActivation, -0.95, 0.95);
        node.activation = clamp(node.activation + signal * 0.44, 0, 1.32);
        node.energy = clamp(
          node.energy - Math.abs(signal) * profile.energyDrain + profile.energyRecover * 0.2,
          0.08,
          1.35
        );
        node.memory.push(node.activation);
        if (node.memory.length > 6) node.memory.shift();
        const sum = node.memory.reduce((acc, item) => acc + item, 0);
        node.memoryValue = sum / Math.max(node.memory.length, 1);
      }

      for (let i = 0; i < this.edges.length; i += 1) {
        const edge = this.edges[i];
        edge.glow *= edge.decay;
        edge.signal *= edge.decay;
        edge.weight = clamp(edge.weight * (0.9991 - profile.plasticity * 0.0012), -2.4, 2.4);
      }
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
          const transfer = sourceNode.activation * edge.weight * 0.28 + pulse.amplitude * 0.18;

          targetNode.nextActivation += transfer;
          targetNode.energy = clamp(targetNode.energy - Math.abs(transfer) * 0.02, 0.08, 1.35);
          targetNode.memory.push(Math.abs(transfer));
          if (targetNode.memory.length > 6) targetNode.memory.shift();
          const memorySum = targetNode.memory.reduce((acc, item) => acc + item, 0);
          targetNode.memoryValue = memorySum / Math.max(targetNode.memory.length, 1);

          edge.weight = clamp(
            edge.weight + transfer * this._currentProfile().plasticity * 0.035,
            -2.4,
            2.4
          );
          edge.glow = clamp(edge.glow + Math.abs(transfer) * 0.9, 0, 2.2);

          if (Math.abs(transfer) > 0.16 && this.sceneName !== "sphere") {
            const nextEdges = this.adjacency[targetId] || [];
            for (let n = 0; n < nextEdges.length; n += 1) {
              const nextEdge = this.edges[nextEdges[n]];
              const otherId = nextEdge.a === targetId ? nextEdge.b : nextEdge.a;
              if (otherId === sourceId) continue;
              if (Math.random() < profile.cascadeChance) {
                this._spawnPulse(nextEdge, targetId, Math.abs(transfer) * 0.92);
              }
            }
          }

          this.pulses.splice(i, 1);
          continue;
        }

        if (activeCount >= this.pulsePositions.length / 3) continue;

        const mix = pulse.forward ? pulse.t : 1 - pulse.t;
        const x = a.x + (b.x - a.x) * mix;
        const y = a.y + (b.y - a.y) * mix;
        const z = a.z + (b.z - a.z) * mix;
        const offset = activeCount * 3;

        this.pulsePositions[offset] = x;
        this.pulsePositions[offset + 1] = y;
        this.pulsePositions[offset + 2] = z;

        const glow = clamp(0.58 + pulse.amplitude * 0.32, 0, 1.2);
        this.pulseColors[offset] = 1.0;
        this.pulseColors[offset + 1] = 0.56 + glow * 0.25;
        this.pulseColors[offset + 2] = 0.22 + glow * 0.12;

        activeCount += 1;
      }

      this.pulseMesh.geometry.setDrawRange(0, activeCount);
      this.pulseMesh.geometry.attributes.position.needsUpdate = true;
      this.pulseMesh.geometry.attributes.color.needsUpdate = true;
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
          const edge = this._xorEdge(inputId, hiddenId);
          sum += this.nodes[inputId].activation * edge.weight;
        }

        const hiddenActivation = this._sigmoid(sum);
        hiddenNode.activation = hiddenActivation;
        hiddenOutputs.push(hiddenActivation);

        if (hiddenActivation > 0.18) {
          this.inject(hiddenId, hiddenActivation * 0.82, 0);
        }
      }

      const outputNode = this.nodes[outputId];
      let outputSum = outputNode.bias;
      for (let i = 0; i < hiddenIds.length; i += 1) {
        const edge = this._xorEdge(hiddenIds[i], outputId);
        outputSum += hiddenOutputs[i] * edge.weight;
      }

      const prediction = this._sigmoid(outputSum);
      outputNode.activation = prediction;
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
        outputEdge.weight = clamp(
          outputEdge.weight + 0.1 * dOut * hiddenActivation,
          -2.5,
          2.5
        );
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
          const inputActivation = this.nodes[inputId].activation;
          edge.weight = clamp(
            edge.weight + 0.08 * hiddenDeltas[i] * inputActivation,
            -2.5,
            2.5
          );
          edge.glow = clamp(edge.glow + Math.abs(hiddenDeltas[i]) * 3.1, 0, 2.2);
        }
      }

      outputNode.bias = clamp(outputNode.bias + 0.11 * dOut, -1.8, 1.8);
      outputNode.energy = clamp(outputNode.energy - Math.abs(error) * 0.03 + 0.02, 0.1, 1.35);

      const predictionRounded = prediction >= 0.5 ? 1 : 0;
      this.predictionText = `${sample.x[0]} xor ${sample.x[1]} => ${prediction.toFixed(3)} ~ ${predictionRounded} | alvo ${target}`;
      this.xorStep += 1;
      this._emitStats();
    }

    _emitStats() {
      if (this.hooks.onXorStats) {
        this.hooks.onXorStats({
          loss: this.lossEMA,
          steps: this.xorStep,
          prediction: this.predictionText,
        });
      }
    }

    _updateNodeVisuals() {
      const dummy = new THREE.Object3D();
      const systemMode = this.system.mode;

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        const activation = clamp(node.activation, 0, 1.5);
        const wobble = 1 + Math.sin(this.time * 2.2 + i * 0.17) * 0.035;
        const scale = 1 + activation * 2.25 + node.memoryValue * 0.4;

        dummy.position.copy(node.pos);
        dummy.scale.setScalar(scale * wobble);
        dummy.updateMatrix();
        this.nodeMesh.setMatrixAt(i, dummy.matrix);

        const color = new THREE.Color();
        if (node.isInput) {
          color.setRGB(0.3, 0.68 + activation * 0.3, 1.0);
        } else if (node.isOutput) {
          color.setRGB(1.0, 0.34 + activation * 0.58, 0.34 + activation * 0.45);
        } else if (node.isHidden) {
          color.setRGB(0.38 + activation * 0.22, 0.86, 1.0);
        } else if (systemMode === "stress") {
          color.setRGB(0.52 + activation * 0.28, 0.46 + activation * 0.18, 1.0);
        } else {
          color.setRGB(
            0.28 + activation * 0.26 + node.memoryValue * 0.08,
            0.62 + activation * 0.22,
            0.98
          );
        }

        this.nodeMesh.setColorAt(i, color);
      }

      this.nodeMesh.instanceMatrix.needsUpdate = true;
      if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;
    }

    _updateEdgeVisuals() {
      for (let i = 0; i < this.edges.length; i += 1) {
        const edge = this.edges[i];
        const intensity = clamp(
          0.15 + edge.glow * 0.45 + Math.abs(edge.weight) * 0.08 + edge.signal * 0.14,
          0.1,
          1.0
        );
        const warm = edge.weight >= 0 ? 1 : 0.65;
        const offset = i * 6;

        for (let p = 0; p < 2; p += 1) {
          this.edgeColors[offset + p * 3] = 0.12 * warm + intensity * 0.18;
          this.edgeColors[offset + p * 3 + 1] = 0.28 + intensity * 0.4;
          this.edgeColors[offset + p * 3 + 2] = 0.56 + intensity * 0.42;
        }
      }

      this.edgeLines.geometry.attributes.color.needsUpdate = true;
    }
  }

  function screenToPointer(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function attachCore() {
    state.core = new NeuroCore(scene, {
      onGlobalMode: (mode) => {
        statusGlobal.textContent = mode;
      },
      onXorStats: ({ loss, steps, prediction }) => {
        if (state.sceneName === "xor") {
          statusLoss.textContent = steps > 0 ? loss.toFixed(6) : "-";
          statusSteps.textContent = steps > 0 ? String(steps) : "-";
          statusPredictions.textContent = `predicoes: ${prediction || "-"}`;
        }
      },
      onInfo: (message) => {
        setInfo(message);
      },
    });
  }

  async function rebuildScene() {
    const token = ++state.buildToken;
    setInfo("Reconstruindo holograma...");

    if (state.sceneName !== "xor") resetXorStatus();
    statusScene.textContent = state.sceneName;
    statusMode.textContent = state.dataMode;
    statusGlobal.textContent = "-";

    const load = await loadTopology(state.sceneName, state.dataMode);
    if (token !== state.buildToken) return;

    state.resolvedMode = load.resolvedMode;
    statusMode.textContent = formatModeLabel(state.dataMode, load.resolvedMode);
    state.core.rebuild(load.topology, state.sceneName, load.resolvedMode);
    state.core.pause(!state.running);

    if (state.sceneName !== "xor") {
      statusLoss.textContent = "-";
      statusSteps.textContent = "-";
      statusPredictions.textContent = "predicoes: -";
    }

    setInfo(`${load.message} ${state.core.describeScene()}`);
    syncUrl();
  }

  sceneSelect.addEventListener("change", () => {
    state.sceneName = sceneSelect.value;
    rebuildScene();
  });

  dataModeSelect.addEventListener("change", () => {
    state.dataMode = dataModeSelect.value;
    rebuildScene();
  });

  rebuildBtn.addEventListener("click", () => {
    rebuildScene();
  });

  pauseBtn.addEventListener("click", () => {
    state.running = !state.running;
    if (state.core) state.core.pause(!state.running);
    pauseBtn.textContent = state.running ? "pausar" : "retomar";
    setInfo(
      state.running
        ? "Animacao retomada."
        : "Animacao pausada. O estado neural foi congelado."
    );
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.core) return;

    screenToPointer(event);
    state.raycaster.setFromCamera(state.pointer, camera);
    const hit = state.core.getPickTarget(state.raycaster);
    if (!hit || typeof hit.instanceId !== "number") return;

    const amount = state.sceneName === "sphere" ? 0.8 : 1.15;
    state.core.inject(hit.instanceId, amount, 0.05);
    if (state.sceneName !== "xor") {
      setInfo(`Estimulo manual aplicado ao no ${hit.instanceId}.`);
    }
  });

  window.addEventListener("resize", resize);
  resize();

  attachCore();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    stars.rotation.y += dt * 0.01;
    controls.update();
    if (state.core) state.core.update(dt);
    renderer.render(scene, camera);
  }

  statusScene.textContent = state.sceneName;
  statusMode.textContent = state.dataMode;
  statusGlobal.textContent = "-";
  resetXorStatus();
  animate();
  rebuildScene();
})();
