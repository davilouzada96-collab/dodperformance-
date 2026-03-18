(() => {
  const params = new URLSearchParams(window.location.search);

  const DEFAULT_PROFILE = {
    version: "20260317-alpha",
    defaults: {
      nodeCount: 180,
      synapseDensity: 0.3,
      learningRate: 0.08,
      decayRate: 0.94,
      pruningRate: 0.002,
      waveSpeed: 1.15,
      beamIntensity: {
        object: 1.0,
        reference: 0.72,
      },
      memoryThreshold: 0.62,
      synchronizationGain: 0.18,
      clusterStability: 0.78,
      cameraMode: "orbital",
      renderQuality: "high",
      radius: 5.9,
      latLines: 22,
      lonLines: 30,
      connectionDistance: 2.65,
    },
    systemModes: ["idle", "processing", "learning", "stress"],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDeep(target, source) {
    const output = Array.isArray(target) ? [...target] : { ...target };
    Object.keys(source || {}).forEach((key) => {
      const sourceValue = source[key];
      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        target &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        output[key] = mergeDeep(target[key], sourceValue);
      } else {
        output[key] = sourceValue;
      }
    });
    return output;
  }

  async function loadSimulationProfile() {
    try {
      const response = await fetch("../shared/simulation-profile.json", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remoteProfile = await response.json();
      return mergeDeep(clone(DEFAULT_PROFILE), remoteProfile);
    } catch (error) {
      return clone(DEFAULT_PROFILE);
    }
  }

  window.HologramaConfig = {
    BUILD_ID: "20260318-1010",
    API_BASE: params.get("apiBase") || "",
    DEFAULT_PROFILE,
    clone,
    mergeDeep,
    loadSimulationProfile,
  };
})();
