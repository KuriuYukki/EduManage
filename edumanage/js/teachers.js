const TeachersModule = {
  state: { search: "", department: "", page: 1, perPage: 8 },

  render(main) {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageTeachers");
    const departments = [...new Set(StorageManager.getTeachers().map((tc) => tc.department))];

    main.innerHTML = `
      <div class="toolbar">
        <div class="search-box"><span>🔍</span><input type="text" id="teacher-search" placeholder="${t("search")}..." value="${Utils.escapeHtml(this.state.search)}"/></div>
        <div class="toolbar-filters">
          <select id="filter-teacher-department"><option value="">${t("department")} - ${t("all")}</option>${departments.map((d) => `<option value="${d}" ${this.state.department === d ? "selected" : ""}>${d}</option>`).join("")}</select>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" id="export-teachers-csv">${t("exportCsv")}</button>
          ${canManage ? `<button class="btn btn-primary" id="add-teacher-btn">+ ${t("addTeacher")}</button>` : ""}
        </div>
      </div>
      <div class="results-count" id="teacher-results-count"></div>
      <div class="table-responsive"><table class="data-table" id="teachers-table"></table></div>
      <div class="pagination" id="teachers-pagination"></div>
    `;

    document.getElementById("teacher-search").addEventListener("input", Utils.debounce((e) => { this.state.search = e.target.value; this.state.page = 1; this.renderTable(); }, 250));
    document.getElementById("filter-teacher-department").addEventListener("change", (e) => { this.state.department = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("export-teachers-csv").addEventListener("click", () => this.exportCsv());
    if (canManage) document.getElementById("add-teacher-btn").addEventListener("click", () => this.openForm());

    document.addEventListener("global-search", (e) => {
      if (App.currentView !== "teachers") return;
      document.getElementById("teacher-search").value = e.detail;
      this.state.search = e.detail;
      this.renderTable();
    });

    this.renderTable();
  },

  getFiltered() {
    let list = StorageManager.getTeachers();
    const q = this.state.search.toLowerCase();
    if (q) list = list.filter((tc) => `${tc.firstName} ${tc.lastName}`.toLowerCase().includes(q) || tc.email.toLowerCase().includes(q) || tc.teacherId.toLowerCase().includes(q));
    if (this.state.department) list = list.filter((tc) => tc.department === this.state.department);
    return list;
  },

  renderTable() {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageTeachers");
    const filtered = this.getFiltered();
    const courses = StorageManager.getCourses();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.state.perPage));
    if (this.state.page > totalPages) this.state.page = totalPages;
    const pageItems = Utils.paginate(filtered, this.state.page, this.state.perPage);

    document.getElementById("teacher-results-count").textContent = `${filtered.length} ${t("resultsFound")}`;
    const table = document.getElementById("teachers-table");
    const wrap = table.parentElement;
    wrap.querySelector(".empty-state")?.remove();

    if (!filtered.length) {
      table.innerHTML = "";
      document.getElementById("teachers-pagination").innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">🔍</div><h4>${t("noResultsTitle")}</h4><p>${t("noResultsSubtitle")}</p>`;
      wrap.appendChild(empty);
      return;
    }

    table.innerHTML = `
      <thead><tr><th>${t("photo")}</th><th>${t("name")}</th><th>${t("email")}</th><th>${t("phone")}</th><th>${t("department")}</th><th>${t("specialization")}</th><th>${t("coursesTaught")}</th><th>${t("status")}</th><th>${t("actions")}</th></tr></thead>
      <tbody>
        ${pageItems
          .map((tc) => {
            const numCourses = courses.filter((c) => c.teacherId === tc.id).length;
            return `<tr class="table-row-anim">
              <td><div class="table-avatar" style="background:${Utils.avatarColor(tc.email)}">${Utils.initials(tc.firstName, tc.lastName)}</div></td>
              <td>${Utils.escapeHtml(tc.firstName + " " + tc.lastName)}<br/><small>${tc.teacherId}</small></td>
              <td>${Utils.escapeHtml(tc.email)}</td>
              <td>${Utils.escapeHtml(tc.phone)}</td>
              <td>${Utils.escapeHtml(tc.department)}</td>
              <td>${Utils.escapeHtml(tc.specialization)}</td>
              <td>${numCourses}</td>
              <td><span class="badge-status ${tc.status}">${t(tc.status)}</span></td>
              <td class="actions-cell">
                ${canManage ? `<button class="icon-btn-sm edit-btn" data-id="${tc.id}">✏️</button><button class="icon-btn-sm delete-btn" data-id="${tc.id}">🗑️</button>` : ""}
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>`;

    if (canManage) {
      table.querySelectorAll(".edit-btn").forEach((b) => b.addEventListener("click", () => this.openForm(parseInt(b.dataset.id))));
      table.querySelectorAll(".delete-btn").forEach((b) =>
        b.addEventListener("click", () => {
          Utils.confirm(t("deleteTeacherConfirm"), () => {
            StorageManager.deleteTeacher(parseInt(b.dataset.id));
            Utils.toast(t("teacherDeleted"), "success");
            this.renderTable();
          });
        })
      );
    }
    this.renderPagination(totalPages);
  },

  renderPagination(totalPages) {
    const t = (k) => I18N.t(k);
    const el = document.getElementById("teachers-pagination");
    if (totalPages <= 1) { el.innerHTML = ""; return; }
    el.innerHTML = `<button class="btn btn-ghost" id="tp-prev" ${this.state.page === 1 ? "disabled" : ""}>${t("previous")}</button><span>${t("page")} ${this.state.page} ${t("of")} ${totalPages}</span><button class="btn btn-ghost" id="tp-next" ${this.state.page === totalPages ? "disabled" : ""}>${t("next")}</button>`;
    document.getElementById("tp-prev")?.addEventListener("click", () => { this.state.page--; this.renderTable(); });
    document.getElementById("tp-next")?.addEventListener("click", () => { this.state.page++; this.renderTable(); });
  },

  exportCsv() {
    const rows = this.getFiltered().map((tc) => ({ TeacherID: tc.teacherId, FirstName: tc.firstName, LastName: tc.lastName, Email: tc.email, Phone: tc.phone, Department: tc.department, Specialization: tc.specialization, Status: tc.status }));
    Utils.exportToCsv(rows, "teachers.csv");
  },

  openForm(id) {
    const t = (k) => I18N.t(k);
    const editing = !!id;
    const tc = editing ? StorageManager.getTeacher(id) : {};
    Utils.openModal(`
      <div class="modal-header"><h3>${editing ? t("editTeacher") : t("addTeacher")}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <form id="teacher-form" class="modal-body form-grid" novalidate>
        <div class="form-group"><label>${t("firstName")}</label><input id="tf-firstName" value="${Utils.escapeHtml(tc.firstName || "")}"/><span class="field-error" data-for="firstName"></span></div>
        <div class="form-group"><label>${t("lastName")}</label><input id="tf-lastName" value="${Utils.escapeHtml(tc.lastName || "")}"/><span class="field-error" data-for="lastName"></span></div>
        <div class="form-group"><label>${t("email")}</label><input id="tf-email" type="email" value="${Utils.escapeHtml(tc.email || "")}"/><span class="field-error" data-for="email"></span></div>
        <div class="form-group"><label>${t("phone")}</label><input id="tf-phone" value="${Utils.escapeHtml(tc.phone || "")}"/><span class="field-error" data-for="phone"></span></div>
        <div class="form-group"><label>${t("teacherId")}</label><input id="tf-teacherId" value="${Utils.escapeHtml(tc.teacherId || "T-" + Math.floor(1000 + Math.random() * 900))}"/></div>
        <div class="form-group"><label>${t("department")}</label><input id="tf-department" value="${Utils.escapeHtml(tc.department || "")}"/></div>
        <div class="form-group"><label>${t("specialization")}</label><input id="tf-specialization" value="${Utils.escapeHtml(tc.specialization || "")}"/></div>
        <div class="form-group"><label>${t("status")}</label><select id="tf-status"><option value="active" ${tc.status === "active" ? "selected" : ""}>${t("active")}</option><option value="inactive" ${tc.status === "inactive" ? "selected" : ""}>${t("inactive")}</option></select></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" id="cancel-btn">${t("cancel")}</button><button class="btn btn-primary" id="save-btn">${t("save")}</button></div>
    `);
    document.getElementById("modal-close").onclick = Utils.closeModal;
    document.getElementById("cancel-btn").onclick = Utils.closeModal;
    document.getElementById("save-btn").onclick = () => this.saveForm(editing ? id : null);
  },

  saveForm(id) {
    const t = (k) => I18N.t(k);
    const val = (elId) => document.getElementById(elId).value.trim();
    const data = {
      firstName: val("tf-firstName"),
      lastName: val("tf-lastName"),
      email: val("tf-email"),
      phone: val("tf-phone"),
      teacherId: val("tf-teacherId"),
      department: val("tf-department"),
      specialization: val("tf-specialization"),
      status: val("tf-status"),
    };
    document.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
    let valid = true;
    const setErr = (field, msg) => { const el = document.querySelector(`[data-for="${field}"]`); if (el) el.textContent = msg; valid = false; };
    if (!data.firstName) setErr("firstName", t("fieldRequired"));
    if (!data.lastName) setErr("lastName", t("fieldRequired"));
    if (!data.email || !Utils.isValidEmail(data.email)) setErr("email", t("invalidEmail"));
    if (!valid) return;

    if (id) { StorageManager.updateTeacher(id, data); Utils.toast(t("teacherUpdated"), "success"); }
    else { StorageManager.addTeacher(data); Utils.toast(t("teacherAdded"), "success"); }
    Utils.closeModal();
    this.renderTable();
  },
};
