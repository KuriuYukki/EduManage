const Theme = {
  key: "edu_theme",

  init() {
    const saved = localStorage.getItem(this.key) || "light";
    this.apply(saved);
  },

  apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(this.key, theme);
    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.setAttribute("aria-pressed", theme === "dark");
  },

  toggle() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    this.apply(current === "light" ? "dark" : "light");
  },

  current() {
    return document.documentElement.getAttribute("data-theme") || "light";
  },
};
