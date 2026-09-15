/* ==========================================================================
   export.js — Global data export helpers + Settings page
   ========================================================================== */

const ExportModule = {
  exportAll(format) {
    const data = {
      students: StorageManager.getStudents(),
      teachers: StorageManager.getTeachers(),
      courses: StorageManager.getCourses(),
      enrollments: StorageManager.getEnrollments(),
      grades: StorageManager.getGrades(),
      attendance: StorageManager.getAttendance(),
      notifications: StorageManager.getNotifications(),
    };
    if (format === "csv") {
      Object.keys(data).forEach((key) => {
        if (data[key].length) Utils.exportToCsv(data[key], `${key}.csv`);
      });
    } else {
      Utils.exportToJson(data, "edumanage_full_export.json");
    }
  },
};

const SettingsModule = {
  render(main) {
    const t = (k) => I18N.t(k);
    const session = Auth.getSession();
    const theme = Theme.current();

    main.innerHTML = `
      <div class="settings-grid">
        <div class="panel">
          <h3>${t("appearance")}</h3>
          <div class="settings-row">
            <span>${t("appearance")}</span>
            <div class="segmented" id="theme-segmented">
              <button class="segment ${theme === "light" ? "active" : ""}" data-theme="light">☀️ ${t("light")}</button>
              <button class="segment ${theme === "dark" ? "active" : ""}" data-theme="dark">🌙 ${t("dark")}</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>${t("language")}</h3>
          <div class="settings-row">
            <span>${t("language")}</span>
            <div class="segmented" id="lang-segmented">
              <button class="segment ${I18N.current === "en" ? "active" : ""}" data-lang="en">🇬🇧 English</button>
              <button class="segment ${I18N.current === "ru" ? "active" : ""}" data-lang="ru">🇷🇺 Русский</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>${t("data")}</h3>
          <div class="settings-row"><span>${t("exportAllData")}</span>
            <div class="settings-btn-group">
              <button class="btn btn-ghost" id="export-all-csv">${t("exportCsv")}</button>
              <button class="btn btn-ghost" id="export-all-json">${t("exportJson")}</button>
            </div>
          </div>
          <div class="settings-row"><span>${t("resetDemoData")}</span><button class="btn btn-danger" id="reset-data-btn">${t("reset")}</button></div>
        </div>

        <div class="panel">
          <h3>${t("account")}</h3>
          <div class="info-grid">
            <div><span>${t("currentUser")}</span><b>${Utils.escapeHtml(session.name)}</b></div>
            <div><span>${t("email")}</span><b>${Utils.escapeHtml(session.email)}</b></div>
            <div><span>${t("role")}</span><b>${t(session.role)}</b></div>
          </div>
          <button class="btn btn-danger" id="settings-logout-btn" style="margin-top:16px">${t("logout")}</button>
        </div>
      </div>
    `;

    document.querySelectorAll("#theme-segmented .segment").forEach((btn) =>
      btn.addEventListener("click", () => {
        Theme.apply(btn.dataset.theme);
        this.render(main);
      })
    );
    document.querySelectorAll("#lang-segmented .segment").forEach((btn) =>
      btn.addEventListener("click", () => I18N.setLang(btn.dataset.lang))
    );
    document.getElementById("export-all-csv").addEventListener("click", () => ExportModule.exportAll("csv"));
    document.getElementById("export-all-json").addEventListener("click", () => ExportModule.exportAll("json"));
    document.getElementById("reset-data-btn").addEventListener("click", () => {
      Utils.confirm(t("resetConfirm"), () => {
        StorageManager.resetAllData();
        Utils.toast(t("resetSuccess"), "success");
        App.navigate("dashboard");
        location.hash = "dashboard";
      });
    });
    document.getElementById("settings-logout-btn").addEventListener("click", () => {
      Auth.logout();
      App.renderLogin();
    });
  },
};
