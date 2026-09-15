const AttendanceModule = {
  state: { search: "", courseId: "", studentId: "", date: "", status: "", page: 1, perPage: 8 },

  render(main) {
    const t = (k) => I18N.t(k);
    const session = Auth.getSession();
    const canManage = Auth.can("manageAttendance");
    const students = StorageManager.getStudents();
    const courses = StorageManager.getCourses();
    const attendance = session.role === "student" ? StorageManager.getAttendanceForStudent(session.linkedId) : StorageManager.getAttendance();

    main.innerHTML = `
      <div class="stat-grid stat-grid-4" id="attendance-stats"></div>

      <div class="toolbar">
        <div class="search-box"><span>🔍</span><input type="text" id="att-search" placeholder="${t("search")}..." value="${Utils.escapeHtml(this.state.search)}"/></div>
        <div class="toolbar-filters">
          <select id="filter-att-course"><option value="">${t("filterByCourse")}</option>${courses.map((c) => `<option value="${c.id}" ${this.state.courseId == c.id ? "selected" : ""}>${c.courseCode}</option>`).join("")}</select>
          ${session.role !== "student" ? `<select id="filter-att-student"><option value="">${t("filterByStudent")}</option>${students.map((s) => `<option value="${s.id}" ${this.state.studentId == s.id ? "selected" : ""}>${s.firstName} ${s.lastName}</option>`).join("")}</select>` : ""}
          <input type="date" id="filter-att-date" value="${this.state.date}"/>
          <select id="filter-att-status">
            <option value="">${t("status")} - ${t("all")}</option>
            <option value="present" ${this.state.status === "present" ? "selected" : ""}>${t("present")}</option>
            <option value="absent" ${this.state.status === "absent" ? "selected" : ""}>${t("absent")}</option>
            <option value="late" ${this.state.status === "late" ? "selected" : ""}>${t("late")}</option>
            <option value="excused" ${this.state.status === "excused" ? "selected" : ""}>${t("excused")}</option>
          </select>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" id="export-att-csv">${t("exportCsv")}</button>
          ${canManage ? `<button class="btn btn-primary" id="mark-att-btn">+ ${t("markAttendance")}</button>` : ""}
        </div>
      </div>
      <div class="results-count" id="att-results-count"></div>
      <div class="table-responsive"><table class="data-table" id="attendance-table"></table></div>
      <div class="pagination" id="attendance-pagination"></div>
    `;

    document.getElementById("att-search").addEventListener("input", Utils.debounce((e) => { this.state.search = e.target.value; this.state.page = 1; this.renderTable(); }, 250));
    document.getElementById("filter-att-course").addEventListener("change", (e) => { this.state.courseId = e.target.value; this.state.page = 1; this.renderTable(); });
    if (session.role !== "student") document.getElementById("filter-att-student").addEventListener("change", (e) => { this.state.studentId = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-att-date").addEventListener("change", (e) => { this.state.date = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-att-status").addEventListener("change", (e) => { this.state.status = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("export-att-csv").addEventListener("click", () => this.exportCsv());
    if (canManage) document.getElementById("mark-att-btn").addEventListener("click", () => this.openForm());

    this.renderStats(attendance);
    this.renderTable();
  },

  renderStats(attendance) {
    const t = (k) => I18N.t(k);
    const container = document.getElementById("attendance-stats");
    if (!container) return;
    const total = attendance.length || 1;
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const excused = attendance.filter((a) => a.status === "excused").length;
    const overallRate = ((present + late) / total) * 100;

    container.innerHTML = `
      <div class="stat-card"><div class="stat-icon" style="background:#ECFDF5;color:#10B981">✅</div><div class="stat-info"><span class="stat-value">${((present / total) * 100).toFixed(0)}%</span><span class="stat-label">${t("present")}</span></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#FEF2F2;color:#EF4444">❌</div><div class="stat-info"><span class="stat-value">${((absent / total) * 100).toFixed(0)}%</span><span class="stat-label">${t("absent")}</span></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#FFF7ED;color:#F59E0B">⏰</div><div class="stat-info"><span class="stat-value">${((late / total) * 100).toFixed(0)}%</span><span class="stat-label">${t("late")}</span></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#F5F3FF;color:#8B5CF6">📋</div><div class="stat-info"><span class="stat-value">${overallRate.toFixed(0)}%</span><span class="stat-label">${t("overallAttendance")}</span></div></div>
    `;
  },

  getFiltered() {
    const session = Auth.getSession();
    let list = session.role === "student" ? StorageManager.getAttendanceForStudent(session.linkedId) : StorageManager.getAttendance();
    if (this.state.courseId) list = list.filter((a) => String(a.courseId) === String(this.state.courseId));
    if (this.state.studentId) list = list.filter((a) => String(a.studentId) === String(this.state.studentId));
    if (this.state.date) list = list.filter((a) => a.date === this.state.date);
    if (this.state.status) list = list.filter((a) => a.status === this.state.status);
    const q = this.state.search.toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const s = StorageManager.getStudent(a.studentId);
        return s && `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  renderTable() {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageAttendance");
    const filtered = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.state.perPage));
    if (this.state.page > totalPages) this.state.page = totalPages;
    const pageItems = Utils.paginate(filtered, this.state.page, this.state.perPage);

    document.getElementById("att-results-count").textContent = `${filtered.length} ${t("resultsFound")}`;
    const table = document.getElementById("attendance-table");
    const wrap = table.parentElement;
    wrap.querySelector(".empty-state")?.remove();

    if (!filtered.length) {
      table.innerHTML = "";
      document.getElementById("attendance-pagination").innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">🗓️</div><h4>${t("noResultsTitle")}</h4><p>${t("noResultsSubtitle")}</p>`;
      wrap.appendChild(empty);
      return;
    }

    table.innerHTML = `
      <thead><tr><th>${t("student")}</th><th>${t("courses")}</th><th>${t("date")}</th><th>${t("status")}</th>${canManage ? `<th>${t("actions")}</th>` : ""}</tr></thead>
      <tbody>
        ${pageItems
          .map((a) => {
            const s = StorageManager.getStudent(a.studentId);
            const c = StorageManager.getCourse(a.courseId);
            return `<tr class="table-row-anim">
              <td>${s ? Utils.escapeHtml(s.firstName + " " + s.lastName) : "-"}</td>
              <td>${c ? Utils.escapeHtml(c.courseCode) : "-"}</td>
              <td>${Utils.formatDate(a.date)}</td>
              <td><span class="badge-att ${a.status}">${t(a.status)}</span></td>
              ${canManage ? `<td class="actions-cell"><button class="icon-btn-sm edit-att-btn" data-id="${a.id}">✏️</button><button class="icon-btn-sm delete-att-btn" data-id="${a.id}">🗑️</button></td>` : ""}
            </tr>`;
          })
          .join("")}
      </tbody>`;

    if (canManage) {
      table.querySelectorAll(".edit-att-btn").forEach((b) => b.addEventListener("click", () => this.openForm(parseInt(b.dataset.id))));
      table.querySelectorAll(".delete-att-btn").forEach((b) =>
        b.addEventListener("click", () => {
          Utils.confirm(t("delete") + "?", () => {
            StorageManager.deleteAttendance(parseInt(b.dataset.id));
            Utils.toast(t("attendanceUpdated"), "success");
            this.render(document.getElementById("main-content"));
          });
        })
      );
    }
    this.renderPagination(totalPages);
  },

  renderPagination(totalPages) {
    const t = (k) => I18N.t(k);
    const el = document.getElementById("attendance-pagination");
    if (totalPages <= 1) { el.innerHTML = ""; return; }
    el.innerHTML = `<button class="btn btn-ghost" id="ap-prev" ${this.state.page === 1 ? "disabled" : ""}>${t("previous")}</button><span>${t("page")} ${this.state.page} ${t("of")} ${totalPages}</span><button class="btn btn-ghost" id="ap-next" ${this.state.page === totalPages ? "disabled" : ""}>${t("next")}</button>`;
    document.getElementById("ap-prev")?.addEventListener("click", () => { this.state.page--; this.renderTable(); });
    document.getElementById("ap-next")?.addEventListener("click", () => { this.state.page++; this.renderTable(); });
  },

  exportCsv() {
    const rows = this.getFiltered().map((a) => {
      const s = StorageManager.getStudent(a.studentId);
      const c = StorageManager.getCourse(a.courseId);
      return { Student: s ? `${s.firstName} ${s.lastName}` : "-", Course: c ? c.courseCode : "-", Date: a.date, Status: a.status };
    });
    Utils.exportToCsv(rows, "attendance.csv");
  },

  openForm(id) {
    const t = (k) => I18N.t(k);
    const editing = !!id;
    const a = editing ? StorageManager.getAttendance().find((x) => x.id === id) : {};
    const students = StorageManager.getStudents();
    const courses = StorageManager.getCourses();
    Utils.openModal(`
      <div class="modal-header"><h3>${editing ? t("editAttendance") : t("markAttendance")}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body form-grid">
        <div class="form-group"><label>${t("selectStudent")}</label><select id="af-student">${students.map((s) => `<option value="${s.id}" ${a.studentId === s.id ? "selected" : ""}>${s.firstName} ${s.lastName}</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("selectCourse")}</label><select id="af-course">${courses.map((c) => `<option value="${c.id}" ${a.courseId === c.id ? "selected" : ""}>${c.courseCode} - ${c.name}</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("date")}</label><input id="af-date" type="date" value="${a.date || new Date().toISOString().slice(0, 10)}"/></div>
        <div class="form-group"><label>${t("status")}</label><select id="af-status">
          <option value="present" ${a.status === "present" ? "selected" : ""}>${t("present")}</option>
          <option value="absent" ${a.status === "absent" ? "selected" : ""}>${t("absent")}</option>
          <option value="late" ${a.status === "late" ? "selected" : ""}>${t("late")}</option>
          <option value="excused" ${a.status === "excused" ? "selected" : ""}>${t("excused")}</option>
        </select></div>
        <span class="field-error" id="af-error" style="grid-column:1/-1"></span>
      </div>
      <div class="modal-footer"><button class="btn btn-ghost" id="cancel-btn">${t("cancel")}</button><button class="btn btn-primary" id="save-btn">${t("save")}</button></div>
    `);
    document.getElementById("modal-close").onclick = Utils.closeModal;
    document.getElementById("cancel-btn").onclick = Utils.closeModal;
    document.getElementById("save-btn").onclick = () => this.saveForm(editing ? id : null);
  },

  saveForm(id) {
    const t = (k) => I18N.t(k);
    const studentId = parseInt(document.getElementById("af-student").value);
    const courseId = parseInt(document.getElementById("af-course").value);
    const date = document.getElementById("af-date").value;
    const status = document.getElementById("af-status").value;
    const errEl = document.getElementById("af-error");
    errEl.textContent = "";

    if (!id && StorageManager.hasAttendanceRecord(studentId, courseId, date)) {
      errEl.textContent = t("duplicateAttendance");
      return;
    }
    if (id) { StorageManager.updateAttendance(id, { studentId, courseId, date, status }); Utils.toast(t("attendanceUpdated"), "success"); }
    else { StorageManager.addAttendance({ studentId, courseId, date, status }); Utils.toast(t("attendanceAdded"), "success"); }
    Utils.closeModal();
    this.render(document.getElementById("main-content"));
  },
};
