/* ==========================================================================
   notifications.js — Notification center
   ========================================================================== */

const NotificationsModule = {
  render(main) {
    const t = (k) => I18N.t(k);
    const notifications = StorageManager.getNotifications();

    main.innerHTML = `
      <div class="toolbar">
        <div></div>
        <div></div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" id="mark-all-read-btn">${t("markAllRead")}</button>
        </div>
      </div>
      <div id="notif-list"></div>
    `;
    document.getElementById("mark-all-read-btn").addEventListener("click", () => {
      StorageManager.markAllNotificationsRead();
      this.renderList();
      App.updateNotifBadge();
    });
    this.renderList();
  },

  renderList() {
    const t = (k) => I18N.t(k);
    const list = StorageManager.getNotifications();
    const container = document.getElementById("notif-list");
    if (!list.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><h4>${t("noNotifications")}</h4></div>`;
      return;
    }
    const icons = { info: "ℹ️", warning: "⚠️", error: "❌", success: "✅" };
    container.innerHTML = `<div class="notif-list">
      ${list
        .map((n) => {
          const msg = I18N.current === "ru" ? n.message_ru : n.message_en;
          return `<div class="notif-item ${n.read ? "" : "unread"}">
            <span class="notif-icon">${icons[n.type] || "ℹ️"}</span>
            <div class="notif-body">
              <p>${Utils.escapeHtml(msg)}</p>
              <small>${new Date(n.date).toLocaleString(I18N.current === "ru" ? "ru-RU" : "en-US")}</small>
            </div>
            <div class="notif-actions">
              ${!n.read ? `<button class="icon-btn-sm mark-read-btn" data-id="${n.id}" title="${t("markAsRead")}">✔</button>` : ""}
              <button class="icon-btn-sm delete-notif-btn" data-id="${n.id}" title="${t("deleteNotification")}">🗑️</button>
            </div>
          </div>`;
        })
        .join("")}
    </div>`;

    container.querySelectorAll(".mark-read-btn").forEach((b) =>
      b.addEventListener("click", () => {
        StorageManager.markNotificationRead(parseInt(b.dataset.id));
        this.renderList();
        App.updateNotifBadge();
      })
    );
    container.querySelectorAll(".delete-notif-btn").forEach((b) =>
      b.addEventListener("click", () => {
        StorageManager.deleteNotification(parseInt(b.dataset.id));
        this.renderList();
        App.updateNotifBadge();
        Utils.toast(t("deleteNotification"), "success");
      })
    );
  },
};
