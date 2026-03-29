(function initSportPhysioPage() {
  const tabs = Array.from(document.querySelectorAll(".zone-tab[data-zone]"));
  const panels = Array.from(document.querySelectorAll("[data-zone-panel]"));
  const toggles = Array.from(document.querySelectorAll("[data-protocol-toggle]"));

  function activateZone(zone) {
    tabs.forEach((tab) => {
      const active = tab.dataset.zone === zone;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.getAttribute("data-zone-panel") === zone;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.addEventListener("click", () => {
      activateZone(tab.dataset.zone || "strength");
    });
  });

  toggles.forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const container = button.closest(".protocol-card");
      const body = container ? container.querySelector(".protocol-body") : null;
      if (!(body instanceof HTMLElement)) return;

      const isOpening = body.hidden;
      body.hidden = !isOpening;
      button.classList.toggle("is-open", isOpening);
      button.setAttribute("aria-expanded", String(isOpening));
    });
  });

  activateZone("strength");
})();
