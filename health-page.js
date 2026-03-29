(function initHealthPage() {
  const tabs = Array.from(document.querySelectorAll(".health-tab[data-pillar]"));
  const panels = Array.from(document.querySelectorAll("[data-pillar-panel]"));
  const toggles = Array.from(document.querySelectorAll("[data-health-toggle]"));

  function activatePillar(pillar) {
    tabs.forEach((tab) => {
      const active = tab.dataset.pillar === pillar;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.getAttribute("data-pillar-panel") === pillar;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.addEventListener("click", () => {
      activatePillar(tab.dataset.pillar || "sleep");
    });
  });

  toggles.forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const item = button.closest(".health-item");
      const body = item ? item.querySelector(".health-body") : null;
      if (!(body instanceof HTMLElement)) return;

      const isOpening = body.hidden;
      body.hidden = !isOpening;
      button.classList.toggle("is-open", isOpening);
      button.setAttribute("aria-expanded", String(isOpening));
    });
  });

  activatePillar("sleep");
})();
