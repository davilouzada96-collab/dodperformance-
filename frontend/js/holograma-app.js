(() => {
  const { BUILD_ID, API_BASE, loadSimulationProfile } = window.HologramaConfig;
  const HologramaCore = window.HologramaCore;

  const canvas = document.getElementById("holoCanvas");
  const sceneSelect = document.getElementById("sceneSelect");
  const dataModeSelect = document.getElementById("dataModeSelect");
  const gestureModeSelect = document.getElementById("gestureModeSelect");
  const mapModeSelect = document.getElementById("mapModeSelect");
  const rebuildBtn = document.getElementById("rebuildBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  const statusScene = document.getElementById("statusScene");
  const statusMode = document.getElementById("statusMode");
  const statusGesture = document.getElementById("statusGesture");
  const statusRegion = document.getElementById("statusRegion");
  const statusMap = document.getElementById("statusMap");
  const statusGlobal = document.getElementById("statusGlobal");
  const statusLoss = document.getElementById("statusLoss");
  const statusSteps = document.getElementById("statusSteps");
  const statusPredictions = document.getElementById("statusPredictions");
  const gestureDebug = document.getElementById("gestureDebug");
  const statusInfo = document.getElementById("statusInfo");
  const regionName = document.getElementById("regionName");
  const regionMeta = document.getElementById("regionMeta");
  const regionClinical = document.getElementById("regionClinical");

  const allowedScenes = new Set(["sphere", "pulses", "xor"]);
  const allowedModes = new Set(["api", "pure"]);
  const allowedGestureModes = new Set(["ws", "off"]);
  const allowedMapModes = new Set(["anatomical", "functional", "brodmann", "pathways"]);
  const params = new URLSearchParams(window.location.search);

  const state = {
    sceneName: allowedScenes.has(params.get("scene")) ? params.get("scene") : "sphere",
    dataMode: allowedModes.has(params.get("mode")) ? params.get("mode") : "pure",
    gestureMode: allowedGestureModes.has(params.get("gestures")) ? params.get("gestures") : "ws",
    mapMode: allowedMapModes.has(params.get("map")) ? params.get("map") : "anatomical",
    running: true,
    buildToken: 0,
    resolvedMode: "pure",
    profile: null,
    core: null,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    apiSyncTimer: null,
    gestureSocket: null,
    gestureOverlayUntil: 0,
    selectedRegion: "-",
  };

  sceneSelect.value = state.sceneName;
  dataModeSelect.value = state.dataMode;
  gestureModeSelect.value = state.gestureMode;
  mapModeSelect.value = state.mapMode;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  scene.add(new THREE.AmbientLight(0xdce8ff, 0.78));
  const keyLight = new THREE.PointLight(0x8fb9ff, 1.0, 220, 2);
  keyLight.position.set(11, 13, 9);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x274eff, 0.45, 160, 2);
  rimLight.position.set(-12, -8, -10);
  scene.add(rimLight);

  const haze = buildStars(1700, 95);
  scene.add(haze);

  function setInfo(text) {
    statusInfo.textContent = `${text} | build ${BUILD_ID}`;
  }

  function updateGestureDebug(message) {
    if (gestureDebug) gestureDebug.textContent = message;
  }

  function updateRegionDetail(detail = null) {
    if (!detail) {
      regionName.textContent = "Nenhuma regiao em foco.";
      regionMeta.textContent = "Funcao: -";
      regionClinical.textContent = "Clinica: -";
      statusMap.textContent = state.mapMode;
      return;
    }
    regionName.textContent = detail.label;
    regionMeta.textContent = `Funcao: ${detail.function}. Vascularizacao: ${detail.vascular}.`;
    const pathwayText = detail.pathwayRegions ? ` Regioes: ${detail.pathwayRegions.join(" -> ")}.` : "";
    regionClinical.textContent = `Clinica: ${detail.clinical}. Rota: ${detail.route}.${pathwayText}`;
    statusMap.textContent = detail.mapModeLabel || state.mapMode;
  }

  function resetXorStatus() {
    statusLoss.textContent = "-";
    statusSteps.textContent = "-";
    statusPredictions.textContent = "predicoes: -";
  }

  function applyApiSnapshot(payload) {
    if (!payload || typeof payload !== "object") return;
    if (statusGlobal && payload.systemMode) statusGlobal.textContent = payload.systemMode;
    const metrics = payload.metrics || {};
    if (statusLoss && typeof metrics.xorLoss === "number") {
      statusLoss.textContent = metrics.xorSteps > 0 ? metrics.xorLoss.toFixed(6) : "-";
    }
    if (statusSteps && typeof metrics.xorSteps === "number") {
      statusSteps.textContent = metrics.xorSteps > 0 ? String(metrics.xorSteps) : "-";
    }
    if (statusPredictions) {
      statusPredictions.textContent = `predicoes: ${payload.predictionText || "-"}`;
    }
    if (statusScene && payload.scene) statusScene.textContent = payload.scene;
  }

  function stopApiSync() {
    if (state.apiSyncTimer) {
      clearInterval(state.apiSyncTimer);
      state.apiSyncTimer = null;
    }
  }

  function startApiSync() {
    stopApiSync();
    if (state.dataMode !== "api") return;
    const intervalMs = 1200;
    state.apiSyncTimer = setInterval(async () => {
      try {
        const snapshot = await fetchJson("/api/simulation/export");
        applyApiSnapshot(snapshot);
      } catch (error) {
        // silêncio: se API cair, não travar animação
      }
    }, intervalMs);
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
    url.searchParams.set("gestures", state.gestureMode);
    url.searchParams.set("map", state.mapMode);
    window.history.replaceState({}, "", url);
  }

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function buildStars(count, spread) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      positions[offset] = (Math.random() - 0.5) * spread;
      positions[offset + 1] = (Math.random() - 0.5) * spread;
      positions[offset + 2] = (Math.random() - 0.5) * spread;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x6b89c9,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
    });
    return new THREE.Points(geometry, material);
  }

  function gestureSocketUrl() {
    const baseUrl = new URL(window.location.href);
    const protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${baseUrl.host}/ws/gestures`;
  }

  function disconnectGestureSocket() {
    if (state.gestureSocket) {
      state.gestureSocket.close();
      state.gestureSocket = null;
    }
    if (state.core) state.core.clearGestureState();
    statusGesture.textContent = "desligado";
    state.selectedRegion = "-";
    statusRegion.textContent = "-";
    statusMap.textContent = state.mapMode;
    updateGestureDebug("gesture: desligado");
    updateRegionDetail(null);
  }

  function pickNodeFromNormalizedPointer(pointer) {
    if (!pointer || pointer.length < 2 || !state.core) return null;
    state.pointer.x = clamp(pointer[0] * 2 - 1, -1, 1);
    state.pointer.y = clamp(-(pointer[1] * 2 - 1), -1, 1);
    state.raycaster.setFromCamera(state.pointer, camera);
    const hit = state.core.getPickTarget(state.raycaster);
    return hit && typeof hit.instanceId === "number" ? hit.instanceId : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyGestureEnvelope(envelope) {
    if (!envelope || !envelope.gesture || !state.core) return;
    const gesture = envelope.gesture;
    const strength = clamp(gesture.strength ?? 0, 0, 1);

    state.core.setGestureState({
      active: true,
      type: gesture.type,
      rotationX: gesture.rotation?.[0] || 0,
      rotationY: gesture.rotation?.[1] || 0,
      zoomDelta: gesture.zoomDelta || 0,
      layerSpread: gesture.layerSpread || 0,
      strength,
      pointer: gesture.pointer || [0.5, 0.5],
      pulseRoute: gesture.pulseRoute || null,
    });

    if (gesture.type === "pinch") {
      const distance = camera.position.length();
      const targetDistance = clamp(distance - (gesture.zoomDelta || 0) * 0.12, controls.minDistance, controls.maxDistance);
      camera.position.setLength(targetDistance);
    }

    if (gesture.type === "fist") {
      const nodeId = pickNodeFromNormalizedPointer(gesture.pointer);
      if (nodeId !== null) state.core.focusNode(nodeId, 1.3 + strength * 0.8);
    }

    if (gesture.type === "point" || gesture.type === "air_tap") {
      const nodeId = pickNodeFromNormalizedPointer(gesture.pointer);
      if (nodeId !== null) {
        state.core.focusNode(nodeId, gesture.type === "air_tap" ? 1.6 : 1.05);
        const node = state.core.nodes[nodeId];
        state.selectedRegion = `${node.regionProfile?.shortLabel || node.region} / ${node.hemisphere}`;
        statusRegion.textContent = state.selectedRegion;
        if (gesture.type === "air_tap") {
          setInfo(`Regiao cortical em foco: ${state.selectedRegion}.`);
        }
      }
    }

    if (gesture.type === "two_hand_expand") {
      setInfo("Modo anatomico expandido ativado por gesto bimanual.");
    }

    if (gesture.type === "open_palm" && strength > 0.92) {
      const cycle = ["anatomical", "functional", "brodmann", "pathways"];
      const nextIndex = (cycle.indexOf(state.mapMode) + 1) % cycle.length;
      state.mapMode = cycle[nextIndex];
      mapModeSelect.value = state.mapMode;
      state.core.setMapMode(state.mapMode);
      statusMap.textContent = state.mapMode;
      syncUrl();
    }

    statusGesture.textContent = `${gesture.type} (${gesture.handedness || "n/a"})`;
    updateGestureDebug(
      `gesture: ${gesture.type}\nstrength: ${strength.toFixed(2)}\nrotation: ${(gesture.rotation?.[0] || 0).toFixed(2)}, ${(gesture.rotation?.[1] || 0).toFixed(2)}\nzoom: ${(gesture.zoomDelta || 0).toFixed(2)}\nlayer: ${(gesture.layerSpread || 0).toFixed(2)}`
    );
    state.gestureOverlayUntil = performance.now() + 900;
  }

  function connectGestureSocket() {
    disconnectGestureSocket();
    if (state.gestureMode !== "ws") return;

    const socket = new WebSocket(gestureSocketUrl());
    state.gestureSocket = socket;
    statusGesture.textContent = "conectando...";
    updateGestureDebug("gesture: aguardando ponte");

    socket.addEventListener("open", () => {
      statusGesture.textContent = "stream ativo";
      socket.send(JSON.stringify({ type: "frontend-ready" }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const envelope = JSON.parse(event.data);
        applyGestureEnvelope(envelope);
      } catch (error) {
        updateGestureDebug(`gesture: erro de parse (${error.message})`);
      }
    });

    socket.addEventListener("close", () => {
      if (state.gestureSocket === socket) {
        state.gestureSocket = null;
        statusGesture.textContent = "offline";
      }
    });

    socket.addEventListener("error", () => {
      statusGesture.textContent = "erro";
    });
  }

  function generateLocalSphere(profile) {
    const defaults = profile.defaults;
    const nodes = [];
    const edges = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < defaults.nodeCount; i += 1) {
      const t = i / Math.max(defaults.nodeCount - 1, 1);
      const y = 1 - t * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      nodes.push([
        Math.cos(theta) * radial * defaults.radius,
        y * defaults.radius,
        Math.sin(theta) * radial * defaults.radius,
      ]);
    }

    for (let i = 0; i < defaults.latLines; i += 1) {
      const lat = Math.PI * (-0.5 + i / Math.max(defaults.latLines - 1, 1));
      for (let j = 0; j < defaults.lonLines; j += 1) {
        const lon = 2 * Math.PI * (j / defaults.lonLines);
        nodes.push([
          defaults.radius * Math.cos(lat) * Math.cos(lon),
          defaults.radius * Math.sin(lat),
          defaults.radius * Math.cos(lat) * Math.sin(lon),
        ]);
      }
    }

    const offset = defaults.nodeCount;
    for (let i = 0; i < defaults.latLines; i += 1) {
      for (let j = 0; j < defaults.lonLines; j += 1) {
        const p1 = offset + i * defaults.lonLines + j;
        const p2 = offset + i * defaults.lonLines + ((j + 1) % defaults.lonLines);
        edges.push([p1, p2]);
        if (i < defaults.latLines - 1) edges.push([p1, offset + (i + 1) * defaults.lonLines + j]);
      }
    }

    for (let i = 0; i < defaults.nodeCount; i += 1) {
      const neighbor = (i + 7) % defaults.nodeCount;
      edges.push([i, neighbor]);
      if (i + 13 < defaults.nodeCount) edges.push([i, i + 13]);
    }

    return { nodes, edges, radius: defaults.radius };
  }

  function generateLocalConnectome(profile) {
    const defaults = profile.defaults;
    const nodes = [];
    const edges = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < defaults.nodeCount; i += 1) {
      const t = i / Math.max(defaults.nodeCount - 1, 1);
      const y = 1 - t * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      nodes.push([
        Math.cos(theta) * radial * defaults.radius,
        y * defaults.radius,
        Math.sin(theta) * radial * defaults.radius,
      ]);
    }

    const maxNeighbors = Math.max(4, Math.round(4 + defaults.synapseDensity * 5));
    for (let i = 0; i < nodes.length; i += 1) {
      const distances = [];
      for (let j = 0; j < nodes.length; j += 1) {
        if (i === j) continue;
        const dx = nodes[i][0] - nodes[j][0];
        const dy = nodes[i][1] - nodes[j][1];
        const dz = nodes[i][2] - nodes[j][2];
        distances.push({ j, d: Math.sqrt(dx * dx + dy * dy + dz * dz) });
      }
      distances.sort((a, b) => a.d - b.d);
      distances.slice(0, maxNeighbors).forEach(({ j, d }) => {
        if (j <= i) return;
        if (d <= defaults.connectionDistance * 1.5 && Math.random() <= defaults.synapseDensity) {
          edges.push([i, j]);
        }
      });
    }

    if (!edges.length) edges.push([0, 1]);
    return { nodes, edges, radius: defaults.radius };
  }

  async function loadTopology(sceneName, requestedMode, profile) {
    const localFactory = sceneName === "pulses"
      ? () => generateLocalConnectome(profile)
      : () => generateLocalSphere(profile);

    if (requestedMode !== "api") {
      return {
        topology: localFactory(),
        resolvedMode: "pure",
        message: "Topologia gerada localmente a partir do perfil compartilhado.",
      };
    }

    const apiPath = sceneName === "pulses"
      ? "/api/topology/connectome"
      : "/api/topology/sphere";

    try {
      const topology = await fetchJson(apiPath);
      return {
        topology,
        resolvedMode: "api",
        message: "Topologia recebida da API FastAPI.",
      };
    } catch (error) {
      return {
        topology: localFactory(),
        resolvedMode: "pure",
        message: `API indisponivel, usando fallback local (${error.message}).`,
      };
    }
  }

  function attachCore(profile) {
    state.core = new HologramaCore(scene, {
      onGlobalMode: (mode) => {
        statusGlobal.textContent = mode;
      },
      onXorStats: ({ loss, steps, prediction }) => {
        if (state.sceneName !== "xor") return;
        statusLoss.textContent = steps > 0 ? loss.toFixed(6) : "-";
        statusSteps.textContent = steps > 0 ? String(steps) : "-";
        statusPredictions.textContent = `predicoes: ${prediction || "-"}`;
      },
      onInfo: (message) => {
        setInfo(message);
      },
      onRegionFocus: (detail) => {
        updateRegionDetail(detail);
      },
    }, profile);
    state.core.setMapMode(state.mapMode);
  }

  async function rebuildScene() {
    const token = ++state.buildToken;
    setInfo("Reconstruindo campo holografico...");
    if (state.sceneName !== "xor") resetXorStatus();
    stopApiSync();

    const loaded = await loadTopology(state.sceneName, state.dataMode, state.profile);
    if (token !== state.buildToken) return;

    state.resolvedMode = loaded.resolvedMode;
    statusScene.textContent = state.sceneName;
    statusMode.textContent = state.resolvedMode === state.dataMode
      ? state.dataMode
      : `${state.dataMode} (fallback ${state.resolvedMode})`;

    state.core.rebuild(loaded.topology, state.sceneName, state.resolvedMode, state.profile);
    state.core.pause(!state.running);

    if (state.sceneName !== "xor") {
      statusLoss.textContent = "-";
      statusSteps.textContent = "-";
      statusPredictions.textContent = "predicoes: -";
    }

    setInfo(`${loaded.message} ${state.core.describeScene()}`);
    syncUrl();
    startApiSync();
  }

  sceneSelect.addEventListener("change", () => {
    state.sceneName = sceneSelect.value;
    rebuildScene();
  });

  dataModeSelect.addEventListener("change", () => {
    state.dataMode = dataModeSelect.value;
    rebuildScene();
  });

  gestureModeSelect.addEventListener("change", () => {
    state.gestureMode = gestureModeSelect.value;
    connectGestureSocket();
    syncUrl();
  });

  mapModeSelect.addEventListener("change", () => {
    state.mapMode = mapModeSelect.value;
    if (state.core) state.core.setMapMode(state.mapMode);
    statusMap.textContent = state.mapMode;
    syncUrl();
  });

  rebuildBtn.addEventListener("click", () => {
    rebuildScene();
  });

  pauseBtn.addEventListener("click", () => {
    state.running = !state.running;
    state.core.pause(!state.running);
    pauseBtn.textContent = state.running ? "pausar" : "retomar";
    setInfo(state.running ? "Animacao retomada." : "Animacao pausada.");
  });

  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    state.raycaster.setFromCamera(state.pointer, camera);
    const hit = state.core.getPickTarget(state.raycaster);
    if (!hit || typeof hit.instanceId !== "number") return;
    state.core.inject(hit.instanceId, state.sceneName === "sphere" ? 0.9 : 1.15, 0.05);
    if (state.sceneName !== "xor") {
      setInfo(`Estimulo manual aplicado ao no ${hit.instanceId}.`);
    }
  });

  window.addEventListener("resize", resize);
  resize();

  loadSimulationProfile().then((profile) => {
    state.profile = profile;
    attachCore(profile);
    statusScene.textContent = state.sceneName;
    statusMode.textContent = state.dataMode;
    statusGesture.textContent = "-";
    statusRegion.textContent = "-";
    statusMap.textContent = state.mapMode;
    statusGlobal.textContent = "-";
    updateRegionDetail(null);
    resetXorStatus();
    rebuildScene();
    startApiSync();
    connectGestureSocket();
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    haze.rotation.y += dt * 0.006;
    controls.update();
    if (state.core) state.core.update(dt, camera);
    if (state.core && state.gestureOverlayUntil && performance.now() > state.gestureOverlayUntil) {
      state.core.clearGestureState();
      state.gestureOverlayUntil = 0;
    }
    renderer.render(scene, camera);
  }
  animate();
})();
