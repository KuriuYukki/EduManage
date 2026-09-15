const CoursesModule = {
  state: { search: "", department: "", page: 1, perPage: 8 },

  render(main) {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageCourses");
    const canAssign = Auth.can("assignStudents") || Auth.can("manageGrades");
    const departments = [...new Set(StorageManager.getCourses().map((c) => c.department))];

    main.innerHTML = `
      <div class="toolbar">
        <div class="search-box"><span>🔍</span><input type="text" id="course-search" placeholder="${t("search")}..." value="${Utils.escapeHtml(this.state.search)}"/></div>
        <div class="toolbar-filters">
          <select id="filter-course-department"><option value="">${t("department")} - ${t("all")}</option>${departments.map((d) => `<option value="${d}" ${this.state.department === d ? "selected" : ""}>${d}</option>`).join("")}</select>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" id="export-courses-csv">${t("exportCsv")}</button>
          ${canAssign ? `<button class="btn btn-secondary" id="assign-btn">🔗 ${t("assignStudent")}</button>` : ""}
          ${canManage ? `<button class="btn btn-primary" id="add-course-btn">+ ${t("addCourse")}</button>` : ""}
        </div>
      </div>
      <div class="results-count" id="course-results-count"></div>
      <div class="table-responsive"><table class="data-table" id="courses-table"></table></div>
      <div class="pagination" id="courses-pagination"></div>
    `;

    document.getElementById("course-search").addEventListener("input", Utils.debounce((e) => { this.state.search = e.target.value; this.state.page = 1; this.renderTable(); }, 250));
    document.getElementById("filter-course-department").addEventListener("change", (e) => { this.state.department = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("export-courses-csv").addEventListener("click", () => this.exportCsv());
    if (canManage) document.getElementById("add-course-btn").addEventListener("click", () => this.openForm());
    if (canAssign) document.getElementById("assign-btn").addEventListener("click", () => this.openAssignForm());

    document.addEventListener("global-search", (e) => {
      if (App.currentView !== "courses") return;
      document.getElementById("course-search").value = e.detail;
      this.state.search = e.detail;
      this.renderTable();
    });

    this.renderTable();
  },

  getFiltered() {
    let list = StorageManager.getCourses();
    const q = this.state.search.toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.courseCode.toLowerCase().includes(q));
    if (this.state.department) list = list.filter((c) => c.department === this.state.department);
    return list;
  },

  renderTable() {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageCourses");
    const canAssign = Auth.can("assignStudents") || Auth.can("manageGrades");
    const filtered = this.getFiltered();
    const teachers = StorageManager.getTeachers();
    const enrollments = StorageManager.getEnrollments();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.state.perPage));
    if (this.state.page > totalPages) this.state.page = totalPages;
    const pageItems = Utils.paginate(filtered, this.state.page, this.state.perPage);

    document.getElementById("course-results-count").textContent = `${filtered.length} ${t("resultsFound")}`;
    const table = document.getElementById("courses-table");
    const wrap = table.parentElement;
    wrap.querySelector(".empty-state")?.remove();

    if (!filtered.length) {
      table.innerHTML = "";
      document.getElementById("courses-pagination").innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">📚</div><h4>${t("noResultsTitle")}</h4><p>${t("noResultsSubtitle")}</p>`;
      wrap.appendChild(empty);
      return;
    }

    table.innerHTML = `
      <thead><tr><th>${t("courseCode")}</th><th>${t("courseName")}</th><th>${t("department")}</th><th>${t("credits")}</th><th>${t("semester")}</th><th>${t("teacher")}</th><th>${t("enrolledStudents")}</th><th>${t("capacity")}</th><th>${t("status")}</th><th>${t("actions")}</th></tr></thead>
      <tbody>
        ${pageItems
          .map((c) => {
            const teacher = teachers.find((tc) => tc.id === c.teacherId);
            const enrolledCount = enrollments.filter((e) => e.courseId === c.id).length;
            const pct = Math.min(100, Math.round((enrolledCount / c.capacity) * 100));
            return `<tr class="table-row-anim">
              <td><b>${c.courseCode}</b></td>
              <td>${Utils.escapeHtml(c.name)}</td>
              <td>${Utils.escapeHtml(c.department)}</td>
              <td>${c.credits}</td>
              <td>${Utils.escapeHtml(c.semester)}</td>
              <td>${teacher ? Utils.escapeHtml(teacher.firstName + " " + teacher.lastName) : "-"}</td>
              <td><div class="capacity-bar"><div class="capacity-fill" style="width:${pct}%"></div></div><small>${enrolledCount}/${c.capacity}</small></td>
              <td>${c.capacity}</td>
              <td><span class="badge-status ${c.status}">${t(c.status)}</span></td>
              <td class="actions-cell">
                <button class="icon-btn-sm view-course-btn" data-id="${c.id}">👁</button>
                ${canManage ? `<button class="icon-btn-sm edit-btn" data-id="${c.id}">✏️</button><button class="icon-btn-sm delete-btn" data-id="${c.id}">🗑️</button>` : ""}
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>`;

    table.querySelectorAll(".view-course-btn").forEach((b) => b.addEventListener("click", () => this.viewCourse(parseInt(b.dataset.id))));
    if (canManage) {
      table.querySelectorAll(".edit-btn").forEach((b) => b.addEventListener("click", () => this.openForm(parseInt(b.dataset.id))));
      table.querySelectorAll(".delete-btn").forEach((b) =>
        b.addEventListener("click", () => {
          Utils.confirm(t("deleteCourseConfirm"), () => {
            StorageManager.deleteCourse(parseInt(b.dataset.id));
            Utils.toast(t("courseDeleted"), "success");
            this.renderTable();
          });
        })
      );
    }
    this.renderPagination(totalPages);
  },

  renderPagination(totalPages) {
    const t = (k) => I18N.t(k);
    const el = document.getElementById("courses-pagination");
    if (totalPages <= 1) { el.innerHTML = ""; return; }
    el.innerHTML = `<button class="btn btn-ghost" id="cp-prev" ${this.state.page === 1 ? "disabled" : ""}>${t("previous")}</button><span>${t("page")} ${this.state.page} ${t("of")} ${totalPages}</span><button class="btn btn-ghost" id="cp-next" ${this.state.page === totalPages ? "disabled" : ""}>${t("next")}</button>`;
    document.getElementById("cp-prev")?.addEventListener("click", () => { this.state.page--; this.renderTable(); });
    document.getElementById("cp-next")?.addEventListener("click", () => { this.state.page++; this.renderTable(); });
  },

  exportCsv() {
    const rows = this.getFiltered().map((c) => ({ CourseCode: c.courseCode, Name: c.name, Department: c.department, Credits: c.credits, Semester: c.semester, Capacity: c.capacity, Status: c.status }));
    Utils.exportToCsv(rows, "courses.csv");
  },

  viewCourse(id) {
    const t = (k) => I18N.t(k);
    const c = StorageManager.getCourse(id);
    const teacher = StorageManager.getTeacher(c.teacherId);
    const enrolled = StorageManager.getEnrollmentsForCourse(id).map((e) => StorageManager.getStudent(e.studentId)).filter(Boolean);
    Utils.openModal(`
      <div class="modal-header"><h3>${Utils.escapeHtml(c.name)} (${c.courseCode})</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body">
        <div class="info-grid">
          <div><span>${t("department")}</span><b>${Utils.escapeHtml(c.department)}</b></div>
          <div><span>${t("credits")}</span><b>${c.credits}</b></div>
          <div><span>${t("semester")}</span><b>${Utils.escapeHtml(c.semester)}</b></div>
          <div><span>${t("teacher")}</span><b>${teacher ? Utils.escapeHtml(teacher.firstName + " " + teacher.lastName) : "-"}</b></div>
        </div>
        <h4 style="margin-top:16px">${t("enrolledStudents")} (${enrolled.length})</h4>
        <div class="chip-list">
          ${enrolled.map((s) => `<span class="chip">${Utils.escapeHtml(s.firstName + " " + s.lastName)}${Auth.can("assignStudents") ? ` <button class="chip-remove" data-sid="${s.id}" data-cid="${c.id}">✕</button>` : ""}</span>`).join("") || `<p>${t("noResultsTitle")}</p>`}
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-ghost" id="close-btn">${t("close")}</button></div>
    `);
    document.getElementById("modal-close").onclick = Utils.closeModal;
    document.getElementById("close-btn").onclick = Utils.closeModal;
    document.querySelectorAll(".chip-remove").forEach((btn) =>
      btn.addEventListener("click", () => {
        StorageManager.removeEnrollment(parseInt(btn.dataset.sid), parseInt(btn.dataset.cid));
        Utils.toast(t("enrollmentRemoved"), "success");
        this.viewCourse(id);
        this.renderTable();
      })
    );
  },

  openForm(id) {
    const t = (k) => I18N.t(k);
    const editing = !!id;
    const c = editing ? StorageManager.getCourse(id) : {};
    const teachers = StorageManager.getTeachers();
    Utils.openModal(`
      <div class="modal-header"><h3>${editing ? t("editCourse") : t("addCourse")}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <form class="modal-body form-grid" novalidate>
        <div class="form-group"><label>${t("courseName")}</label><input id="cf-name" value="${Utils.escapeHtml(c.name || "")}"/><span class="field-error" data-for="name"></span></div>
        <div class="form-group"><label>${t("courseCode")}</label><input id="cf-code" value="${Utils.escapeHtml(c.courseCode || "")}"/><span class="field-error" data-for="code"></span></div>
        <div class="form-group"><label>${t("department")}</label><input id="cf-department" value="${Utils.escapeHtml(c.department || "")}"/></div>
        <div class="form-group"><label>${t("credits")}</label><input id="cf-credits" type="number" min="1" max="10" value="${c.credits || 3}"/></div>
        <div class="form-group"><label>${t("semester")}</label><input id="cf-semester" value="${Utils.escapeHtml(c.semester || "Fall 2026")}"/></div>
        <div class="form-group"><label>${t("teacher")}</label><select id="cf-teacher"><option value="">-</option>${teachers.map((tc) => `<option value="${tc.id}" ${c.teacherId === tc.id ? "selected" : ""}>${tc.firstName} ${tc.lastName}</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("capacity")}</label><input id="cf-capacity" type="number" min="1" value="${c.capacity || 30}"/></div>
        <div class="form-group"><label>${t("status")}</label><select id="cf-status"><option value="active" ${c.status === "active" ? "selected" : ""}>${t("active")}</option><option value="inactive" ${c.status === "inactive" ? "selected" : ""}>${t("inactive")}</option></select></div>
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
      name: val("cf-name"),
      courseCode: val("cf-code"),
      department: val("cf-department"),
      credits: parseInt(val("cf-credits")) || 3,
      semester: val("cf-semester"),
      teacherId: val("cf-teacher") ? parseInt(val("cf-teacher")) : null,
      capacity: parseInt(val("cf-capacity")) || 30,
      status: val("cf-status"),
    };
    document.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
    let valid = true;
    const setErr = (field, msg) => { const el = document.querySelector(`[data-for="${field}"]`); if (el) el.textContent = msg; valid = false; };
    if (!data.name) setErr("name", t("fieldRequired"));
    if (!data.courseCode) setErr("code", t("fieldRequired"));
    const dup = StorageManager.getCourses().find((c) => c.courseCode === data.courseCode && c.id !== id);
    if (dup) setErr("code", t("invalidGrade"));
    if (!valid) return;

    if (id) { StorageManager.updateCourse(id, data); Utils.toast(t("courseUpdated"), "success"); }
    else { StorageManager.addCourse(data); Utils.toast(t("courseAdded"), "success"); }
    Utils.closeModal();
    this.renderTable();
  },

  openAssignForm() {
    const t = (k) => I18N.t(k);
    const students = StorageManager.getStudents();
    const courses = StorageManager.getCourses();
    Utils.openModal(`
      <div class="modal-header"><h3>${t("assignStudent")}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body form-grid">
        <div class="form-group"><label>${t("selectStudent")}</label><select id="assign-student">${students.map((s) => `<option value="${s.id}">${s.firstName} ${s.lastName} (${s.studentId})</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("selectCourse")}</label><select id="assign-course">${courses.map((c) => `<option value="${c.id}">${c.courseCode} - ${c.name}</option>`).join("")}</select></div>
        <span class="field-error" id="assign-error" style="grid-column:1/-1"></span>
      </div>
      <div class="modal-footer"><button class="btn btn-ghost" id="cancel-btn">${t("cancel")}</button><button class="btn btn-primary" id="assign-save-btn">${t("assign")}</button></div>
    `);
    document.getElementById("modal-close").onclick = Utils.closeModal;
    document.getElementById("cancel-btn").onclick = Utils.closeModal;
    document.getElementById("assign-save-btn").onclick = () => {
      const t2 = (k) => I18N.t(k);
      const studentId = parseInt(document.getElementById("assign-student").value);
      const courseId = parseInt(document.getElementById("assign-course").value);
      const errEl = document.getElementById("assign-error");
      const course = StorageManager.getCourse(courseId);
      if (StorageManager.isEnrolled(studentId, courseId)) {
        errEl.textContent = t2("duplicateEnrollment");
        return;
      }
      const enrolledCount = StorageManager.getEnrollmentsForCourse(courseId).length;
      if (enrolledCount >= course.capacity) {
        errEl.textContent = t2("courseFull");
        return;
      }
      StorageManager.addEnrollment(studentId, courseId);
      Utils.toast(t2("enrollmentAdded"), "success");
      Utils.closeModal();
      this.renderTable();
    };
  },
};
