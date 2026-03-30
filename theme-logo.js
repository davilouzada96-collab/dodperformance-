(function () {
  var LEGACY_LOGO = "/assets/hh-neuron.png";
  var NEW_LOGO = "/assets/logo-eagle-v1.png";

  function getThemeFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var theme = (params.get("theme") || "").toLowerCase();
      return theme === "new" ? "new" : "legacy";
    } catch (_) {
      return "legacy";
    }
  }

  function applyHeaderLogo(theme) {
    var headerLogo = document.querySelector(".brand .avatar img");
    if (!headerLogo) return;
    headerLogo.src = theme === "new" ? NEW_LOGO : LEGACY_LOGO;
    headerLogo.alt = "DOD Profile";
  }

  function init() {
    applyHeaderLogo(getThemeFromQuery());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
