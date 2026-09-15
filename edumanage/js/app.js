const App = {
  currentView: "dashboard",
  currentParams: {},

  navItems: [
    { group: "main", items: [{ id: "dashboard", icon: "grid", perm: "viewDashboard" }] },
    {
      group: "academic",
      items: [
        { id: "students", icon: "students", perm: null },
        { id: "teachers", icon: "teachers", perm: "viewStudents" },
        { id: "courses", icon: "courses", perm: null },
        { id: "grades", icon: "grades", perm: null },
        { id: "attendance", icon: "attendance", perm: null },
        { id: "ranking", icon: "ranking", perm: "viewRanking" },
      ],
    },
    { group: "system", items: [{ id: "notifications", icon: "bell", perm: "viewNotifications" }, { id: "settings", icon: "settings", perm: null }] },
  ],

  init() {
    Theme.init();
    StorageManager.seedData();

    if (!Auth.isLoggedIn()) {
      this.renderLogin();
      return;
    }
    this.renderShell();
    this.navigate("dashboard");
    window.addEventListener("hashchange", () => this.handleHash());
    this.handleHash();
  },

  handleHash() {
    const hash = location.hash.replace("#", "") || "dashboard";
    const [view, param] = hash.split("/");
    this.navigate(view, param);
  },

  rerender() {
    if (!Auth.isLoggedIn()) {
      this.renderLogin();
      return;
    }
    this.renderShell();
    this.navigate(this.currentView, this.currentParams.id);
  },

  renderLogin() {
    const root = document.getElementById("app-root");
    const t = (k) => I18N.t(k);
    root.innerHTML = `
      <div class="login-screen">
        <div class="login-lang-switch">
          <button class="lang-btn ${I18N.current === "en" ? "active" : ""}" data-lang="en">EN</button>
          <button class="lang-btn ${I18N.current === "ru" ? "active" : ""}" data-lang="ru">RU</button>
        </div>
        <div class="login-panel">
          <div class="login-brand">
            <div class="brand-logo">🎓</div>
            <h1>EduManage</h1>
            <p class="login-subtitle">${t("loginSubtitle")}</p>
          </div>
          <form id="login-form" novalidate>
            <div class="form-group">
              <label for="login-email">${t("emailOrUsername")}</label>
              <input type="text" id="login-email" autocomplete="username" />
              <span class="field-error" id="err-email"></span>
            </div>
            <div class="form-group">
              <label for="login-password">${t("password")}</label>
              <div class="password-wrap">
                <input type="password" id="login-password" autocomplete="current-password" />
                <button type="button" id="toggle-password" aria-label="${t("showPassword")}">👁</button>
              </div>
              <span class="field-error" id="err-password"></span>
            </div>
            <div class="form-row-between">
              <label class="checkbox-label">
                <input type="checkbox" id="login-remember" /> ${t("rememberMe")}
              </label>
            </div>
            <span class="field-error" id="err-general"></span>
            <button type="submit" class="btn btn-primary btn-block" id="login-submit">
              <span id="login-btn-text">${t("login")}</span>
            </button>
          </form>
          <div class="demo-accounts">
            <p class="demo-title">${t("demoAccounts")}</p>
            <div class="demo-list">
              <button class="demo-chip" data-email="admin@edumanage.com" data-password="admin123">👤 ${t("admin")}</button>
              <button class="demo-chip" data-email="teacher@edumanage.com" data-password="teacher123">👨‍🏫 ${t("teacher")}</button>
              <button class="demo-chip" data-email="student@edumanage.com" data-password="student123">🎓 ${t("student")}</button>
            </div>
          </div>
        </div>
      </div>`;

    root.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        I18N.setLang(btn.dataset.lang);
      });
    });

    root.querySelectorAll(".demo-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("login-email").value = btn.dataset.email;
        document.getElementById("login-password").value = btn.dataset.password;
      });
    });

    document.getElementById("toggle-password").addEventListener("click", (e) => {
      const input = document.getElementById("login-password");
      input.type = input.type === "password" ? "text" : "password";
      e.target.textContent = input.type === "password" ? "👁" : "🙈";
    });

    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLoginSubmit();
    });
  },

  handleLoginSubmit() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("login-remember").checked;
    const errEmail = document.getElementById("err-email");
    const errPassword = document.getElementById("err-password");
    const errGeneral = document.getElementById("err-general");
    errEmail.textContent = "";
    errPassword.textContent = "";
    errGeneral.textContent = "";

    let valid = true;
    if (!email) {
      errEmail.textContent = I18N.t("fieldRequired");
      valid = false;
    }
    if (!password) {
      errPassword.textContent = I18N.t("fieldRequired");
      valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById("login-submit");
    const btnText = document.getElementById("login-btn-text");
    btn.disabled = true;
    btn.classList.add("loading");
    btnText.textContent = I18N.t("loggingIn");

    setTimeout(() => {
      const result = Auth.login(email, password, remember);
      if (!result.success) {
        errGeneral.textContent = I18N.t(result.error);
        btn.disabled = false;
        btn.classList.remove("loading");
        btnText.textContent = I18N.t("login");
        return;
      }
      this.renderShell();
      location.hash = "dashboard";
      this.navigate("dashboard");
      Utils.toast(`${I18N.t("notifWelcome")}, ${result.session.name}!`, "success");
    }, 600);
  },

  icon(name) {
    const icons = {
      grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
      students: '<path d="M12 3 2 8l10 5 8-4.2V16h2V8L12 3z"/><path d="M6 12.2V16c0 2 3 4 6 4s6-2 6-4v-3.8l-6 3-6-3z"/>',
      teachers: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>',
      courses: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M18 4v13"/>',
      grades: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
      attendance: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      ranking: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4"/>',
      bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.1.6.5 1.2 1 1.5.5.3 1 .4 1.5.3H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/>',
    };
    return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.grid}</svg>`;
  },

  renderShell() {
    const session = Auth.getSession();
    const t = (k) => I18N.t(k);
    const root = document.getElementById("app-root");

    const sidebarGroups = this.navItems
      .map((group) => {
        const items = group.items
          .filter((item) => !item.perm || Auth.can(item.perm) || this.viewAllowedForRole(item.id, session.role))
          .map(
            (item) => `
          <a href="#${item.id}" class="nav-link" data-view="${item.id}">
            ${this.icon(item.icon)}
            <span>${t(item.id)}</span>
          </a>`
          )
          .join("");
        if (!items) return "";
        return `<div class="nav-group"><p class="nav-group-title">${t(group.group)}</p>${items}</div>`;
      })
      .join("");

    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <span class="brand-logo-small">🎓</span>
            <span class="brand-name">${t("appName")}</span>
            <button class="sidebar-close" id="sidebar-close" aria-label="${t("close")}">✕</button>
          </div>
          <nav class="sidebar-nav">${sidebarGroups}</nav>
          <div class="sidebar-footer">
            <button class="nav-link logout-link" id="logout-btn">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
              <span>${t("logout")}</span>
            </button>
          </div>
        </aside>
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <div class="main-wrap">
          <header class="topbar">
            <button class="icon-btn mobile-menu-btn" id="mobile-menu-btn" aria-label="Menu">☰</button>
            <h2 class="page-title" id="page-title">${t("dashboard")}</h2>
            <div class="topbar-search">
              <input type="text" id="global-search" placeholder="${t("search")}..." />
            </div>
            <div class="topbar-actions">
              <div class="lang-switch">
                <button class="lang-btn ${I18N.current === "en" ? "active" : ""}" data-lang="en">EN</button>
                <button class="lang-btn ${I18N.current === "ru" ? "active" : ""}" data-lang="ru">RU</button>
              </div>
              <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme">
                <span class="theme-icon-light">☀️</span><span class="theme-icon-dark">🌙</span>
              </button>
              <button class="icon-btn notif-btn" id="notif-shortcut" aria-label="${t("notifications")}">
                🔔<span class="badge" id="notif-badge" style="display:none">0</span>
              </button>
              <div class="user-chip">
                <div class="user-avatar" style="background:${Utils.avatarColor(session.email)}">${Utils.initials(session.name.split(" ")[0], session.name.split(" ")[1] || "")}</div>
                <div class="user-meta">
                  <span class="user-name">${Utils.escapeHtml(session.name)}</span>
                  <span class="user-role">${t(session.role)}</span>
                </div>
              </div>
            </div>
          </header>
          <main class="main-content" id="main-content"></main>
        </div>
      </div>
      <div id="modal-container"></div>
      <div id="toast-container" class="toast-container"></div>`;

    document.getElementById("logout-btn").addEventListener("click", () => {
      Auth.logout();
      Utils.toast(t("logout"), "info");
      this.renderLogin();
    });
    document.getElementById("theme-toggle").addEventListener("click", () => Theme.toggle());
    root.querySelectorAll(".lang-btn").forEach((btn) => btn.addEventListener("click", () => I18N.setLang(btn.dataset.lang)));
    document.getElementById("mobile-menu-btn").addEventListener("click", () => {
      document.getElementById("sidebar").classList.add("open");
      document.getElementById("sidebar-overlay").classList.add("show");
    });
    document.getElementById("sidebar-close").addEventListener("click", () => this.closeMobileSidebar());
    document.getElementById("sidebar-overlay").addEventListener("click", () => this.closeMobileSidebar());
    document.getElementById("notif-shortcut").addEventListener("click", () => (location.hash = "notifications"));
    root.querySelectorAll(".nav-link[data-view]").forEach((link) => {
      link.addEventListener("click", () => this.closeMobileSidebar());
    });

    const searchInput = document.getElementById("global-search");
    searchInput.addEventListener(
      "input",
      Utils.debounce(() => {
        const q = searchInput.value.trim();
        if (!q) return;
        if (["students", "teachers", "courses", "grades"].includes(this.currentView)) {
          const evt = new CustomEvent("global-search", { detail: q });
          document.dispatchEvent(evt);
        }
      }, 300)
    );

    this.updateNotifBadge();
  },

  closeMobileSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("show");
  },

  updateNotifBadge() {
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    const count = StorageManager.unreadCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
  },

  viewAllowedForRole(view, role) {
    const map = {
      dashboard: ["admin", "teacher", "student"],
      students: ["admin", "teacher", "student"],
      teachers: ["admin", "teacher"],
      courses: ["admin", "teacher", "student"],
      grades: ["admin", "teacher", "student"],
      attendance: ["admin", "teacher", "student"],
      ranking: ["admin", "teacher", "student"],
      notifications: ["admin", "teacher", "student"],
      settings: ["admin", "teacher", "student"],
    };
    return (map[view] || []).includes(role);
  },

  navigate(view, param) {
    if (!Auth.isLoggedIn()) {
      this.renderLogin();
      return;
    }
    const session = Auth.getSession();
    if (!this.viewAllowedForRole(view, session.role)) {
      view = "dashboard";
    }
    this.currentView = view;
    this.currentParams = { id: param };

    document.querySelectorAll(".nav-link[data-view]").forEach((l) => {
      l.classList.toggle("active", l.dataset.view === view);
    });
    const titleEl = document.getElementById("page-title");
    if (titleEl) titleEl.textContent = I18N.t(view === "student-profile" ? "studentProfile" : view);

    const main = document.getElementById("main-content");
    main.innerHTML = '<div class="skeleton-wrap">' + '<div class="skeleton-card"></div>'.repeat(4) + "</div>";

    setTimeout(() => {
      switch (view) {
        case "dashboard":
          Dashboard.render(main);
          break;
        case "students":
          if (param) StudentsModule.renderProfile(main, parseInt(param));
          else StudentsModule.render(main);
          break;
        case "teachers":
          TeachersModule.render(main);
          break;
        case "courses":
          CoursesModule.render(main);
          break;
        case "grades":
          GradesModule.render(main);
          break;
        case "attendance":
          AttendanceModule.render(main);
          break;
        case "ranking":
          GradesModule.renderRanking(main);
          break;
        case "notifications":
          NotificationsModule.render(main);
          break;
        case "settings":
          SettingsModule.render(main);
          break;
        default:
          Dashboard.render(main);
      }
      this.updateNotifBadge();
    }, 180);
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
