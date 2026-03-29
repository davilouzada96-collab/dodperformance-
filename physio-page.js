(function initPhysioPage() {
  const tabs = Array.from(document.querySelectorAll(".physio-tab[data-module]"));
  const modules = Array.from(document.querySelectorAll("[data-module-panel]"));
  const toggles = Array.from(document.querySelectorAll("[data-check-toggle]"));

  function activateModule(moduleKey) {
    tabs.forEach((tab) => {
      const active = tab.dataset.module === moduleKey;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    modules.forEach((module) => {
      const active = module.getAttribute("data-module-panel") === moduleKey;
      module.classList.toggle("is-active", active);
      module.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.addEventListener("click", () => {
      activateModule(tab.dataset.module || "autonomic");
    });
  });

  toggles.forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const card = button.closest(".check-card");
      const body = card ? card.querySelector(".check-body") : null;
      if (!(body instanceof HTMLElement)) return;

      const isOpening = body.hidden;
      body.hidden = !isOpening;
      button.classList.toggle("is-open", isOpening);
      button.setAttribute("aria-expanded", String(isOpening));
    });
  });

  activateModule("autonomic");
})();
