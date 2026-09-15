/* ==========================================================================
   utils.js — Reusable helper utilities
   ========================================================================== */

const Utils = {
  /* ---------- sanitization ---------- */
  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /* ---------- validation ---------- */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  isValidPhone(phone) {
    return /^[0-9+\-\s()]{6,20}$/.test(phone);
  },

  /* ---------- formatting ---------- */
  initials(first, last) {
    return `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase();
  },
  avatarColor(seed) {
    const colors = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
    let hash = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },
  formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(I18N.current === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  },
  gradeLabel(grade) {
    if (grade >= 16) return { key: "excellent", cls: "excellent" };
    if (grade >= 14) return { key: "veryGood", cls: "very-good" };
    if (grade >= 12) return { key: "good", cls: "good" };
    if (grade >= 10) return { key: "pass", cls: "pass" };
    return { key: "fail", cls: "fail" };
  },
  attendanceLabel(rate) {
    if (rate >= 90) return { key: "attendanceExcellent", cls: "excellent" };
    if (rate >= 75) return { key: "attendanceGood", cls: "good" };
    if (rate >= 60) return { key: "attendanceWarning", cls: "warning" };
    return { key: "attendanceCritical", cls: "critical" };
  },

  /* ---------- id generator for forms ---------- */
  uid() {
    return "id-" + Math.random().toString(36).slice(2, 10);
  },

  /* ---------- debounce ---------- */
  debounce(fn, delay = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  },

  /* ---------- toast notifications ---------- */
  toast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const icons = {
      success: "✔",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${this.escapeHtml(message)}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  },

  /* ---------- confirmation modal ---------- */
  confirm(message, onConfirm) {
    const container = document.getElementById("modal-container");
    if (!container) return;
    const t = (k) => I18N.t(k);
    container.innerHTML = `
      <div class="modal-backdrop" id="confirm-backdrop">
        <div class="modal modal-sm" role="alertdialog" aria-modal="true">
          <div class="modal-body confirm-body">
            <div class="confirm-icon">⚠</div>
            <p>${this.escapeHtml(message)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="confirm-cancel">${t("cancel")}</button>
            <button class="btn btn-danger" id="confirm-ok">${t("delete")}</button>
          </div>
        </div>
      </div>`;
    const close = () => (container.innerHTML = "");
    document.getElementById("confirm-cancel").onclick = close;
    document.getElementById("confirm-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "confirm-backdrop") close();
    });
    document.getElementById("confirm-ok").onclick = () => {
      close();
      onConfirm();
    };
  },

  /* ---------- generic modal ---------- */
  openModal(innerHtml, size = "") {
    const container = document.getElementById("modal-container");
    container.innerHTML = `
      <div class="modal-backdrop" id="generic-backdrop">
        <div class="modal ${size}" role="dialog" aria-modal="true">
          ${innerHtml}
        </div>
      </div>`;
    document.getElementById("generic-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "generic-backdrop") Utils.closeModal();
    });
  },
  closeModal() {
    const container = document.getElementById("modal-container");
    if (container) container.innerHTML = "";
  },

  /* ---------- pagination helper ---------- */
  paginate(list, page, perPage) {
    const start = (page - 1) * perPage;
    return list.slice(start, start + perPage);
  },

  /* ---------- number counter animation ---------- */
  animateCounter(el, target, duration = 800) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    const isFloat = !Number.isInteger(target);
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = start + (target - start) * progress;
      el.textContent = isFloat ? value.toFixed(1) : Math.round(value);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = isFloat ? target.toFixed(1) : target;
    }
    requestAnimationFrame(step);
  },

  /* ---------- CSV / JSON export ---------- */
  downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  exportToCsv(rows, filename) {
    if (!rows.length) {
      this.toast(I18N.t("noResultsTitle"), "warning");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(",")];
    rows.forEach((row) => {
      csvRows.push(
        headers
          .map((h) => {
            let val = row[h] === null || row[h] === undefined ? "" : String(row[h]);
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
          })
          .join(",")
      );
    });
    this.downloadBlob(csvRows.join("\n"), filename, "text/csv;charset=utf-8;");
    this.toast(I18N.t("export") + " ✔", "success");
  },
  exportToJson(rows, filename) {
    this.downloadBlob(JSON.stringify(rows, null, 2), filename, "application/json;charset=utf-8;");
    this.toast(I18N.t("export") + " ✔", "success");
  },
};
