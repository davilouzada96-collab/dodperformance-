(function initNeuroPage() {
  const tabs = Array.from(document.querySelectorAll(".neuro-tab[data-neuro-module]"));
  const panels = Array.from(document.querySelectorAll("[data-neuro-panel]"));
  const toggles = Array.from(document.querySelectorAll("[data-neuro-toggle]"));

  function activateModule(moduleKey) {
    tabs.forEach((tab) => {
      const active = tab.dataset.neuroModule === moduleKey;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.getAttribute("data-neuro-panel") === moduleKey;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.addEventListener("click", () => {
      activateModule(tab.dataset.neuroModule || "attention");
    });
  });

  toggles.forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const item = button.closest(".neuro-item");
      const body = item ? item.querySelector(".neuro-body") : null;
      if (!(body instanceof HTMLElement)) return;

      const isOpening = body.hidden;
      body.hidden = !isOpening;
      button.classList.toggle("is-open", isOpening);
      button.setAttribute("aria-expanded", String(isOpening));
    });
  });

  activateModule("attention");
})();
