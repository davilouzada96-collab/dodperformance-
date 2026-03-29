(function meshUpdatesFallback() {
  // Fallback bundle to avoid 404/runtime noise when the production mesh updates bundle is unavailable.
  if (!window.__DOD_MESH_UPDATES__) {
    window.__DOD_MESH_UPDATES__ = { status: 'fallback', loadedAt: new Date().toISOString() };
  }
})();
