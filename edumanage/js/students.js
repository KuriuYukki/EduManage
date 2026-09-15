/* ==========================================================================
   students.js — Student management (CRUD, search, filter, profile)
   ========================================================================== */

const StudentsModule = {
  state: { search: "", department: "", year: "", gender: "", status: "", sort: "name", page: 1, perPage: 8 },

  render(main) {
    const t = (k) => I18N.t(k);
    const session = Auth.getSession();
    const canManage = Auth.can("manageStudents");
    const departments = [...new Set(StorageManager.getStudents().map((s) => s.department))];

    main.innerHTML = `
      <div class="toolbar">
        <div class="search-box">
          <span>🔍</span>
          <input type="text" id="student-search" placeholder="${t("search")}..." value="${Utils.escapeHtml(this.state.search)}" />
        </div>
        <div class="toolbar-filters">
          <select id="filter-department"><option value="">${t("department")} - ${t("all")}</option>${departments.map((d) => `<option value="${d}" ${this.state.department === d ? "selected" : ""}>${d}</option>`).join("")}</select>
          <select id="filter-year">
            <option value="">${t("year")} - ${t("all")}</option>
            ${[1, 2, 3, 4].map((y) => `<option value="${y}" ${this.state.year == y ? "selected" : ""}>${y}</option>`).join("")}
          </select>
          <select id="filter-gender">
            <option value="">${t("gender")} - ${t("all")}</option>
            <option value="male" ${this.state.gender === "male" ? "selected" : ""}>${t("male")}</option>
            <option value="female" ${this.state.gender === "female" ? "selected" : ""}>${t("female")}</option>
          </select>
          <select id="filter-status">
            <option value="">${t("status")} - ${t("all")}</option>
            <option value="active" ${this.state.status === "active" ? "selected" : ""}>${t("active")}</option>
            <option value="inactive" ${this.state.status === "inactive" ? "selected" : ""}>${t("inactive")}</option>
          </select>
          <select id="sort-select">
            <option value="name" ${this.state.sort === "name" ? "selected" : ""}>${t("sortByName")}</option>
            <option value="gpa" ${this.state.sort === "gpa" ? "selected" : ""}>${t("sortByGpa")}</option>
            <option value="enrollment" ${this.state.sort === "enrollment" ? "selected" : ""}>${t("sortByEnrollment")}</option>
          </select>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" id="export-students-csv">${t("exportCsv")}</button>
          ${canManage ? `<button class="btn btn-primary" id="add-student-btn">+ ${t("addStudent")}</button>` : ""}
        </div>
      </div>
      <div class="results-count" id="results-count"></div>
      <div class="table-responsive"><table class="data-table" id="students-table"></table></div>
      <div class="pagination" id="students-pagination"></div>
    `;

    document.getElementById("student-search").addEventListener("input", Utils.debounce((e) => {
      this.state.search = e.target.value;
      this.state.page = 1;
      this.renderTable();
    }, 250));
    document.getElementById("filter-department").addEventListener("change", (e) => { this.state.department = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-year").addEventListener("change", (e) => { this.state.year = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-gender").addEventListener("change", (e) => { this.state.gender = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-status").addEventListener("change", (e) => { this.state.status = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("sort-select").addEventListener("change", (e) => { this.state.sort = e.target.value; this.renderTable(); });
    document.getElementById("export-students-csv").addEventListener("click", () => this.exportCsv());
    if (canManage) document.getElementById("add-student-btn").addEventListener("click", () => this.openForm());

    document.addEventListener("global-search", (e) => {
      if (App.currentView !== "students") return;
      document.getElementById("student-search").value = e.detail;
      this.state.search = e.detail;
      this.renderTable();
    });

    this.renderTable();
  },

  getFiltered() {
    const session = Auth.getSession();
    let list = StorageManager.getStudents();
    if (session.role === "student") list = list.filter((s) => s.id === session.linkedId);

    const q = this.state.search.toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (this.state.department) list = list.filter((s) => s.department === this.state.department);
    if (this.state.year) list = list.filter((s) => String(s.year) === String(this.state.year));
    if (this.state.gender) list = list.filter((s) => s.gender === this.state.gender);
    if (this.state.status) list = list.filter((s) => s.status === this.state.status);

    const grades = StorageManager.getGrades();
    const gpaOf = (id) => {
      const g = grades.filter((gr) => gr.studentId === id);
      return g.length ? g.reduce((s, gr) => s + gr.grade, 0) / g.length : 0;
    };

    if (this.state.sort === "name") list.sort((a, b) => a.firstName.localeCompare(b.firstName));
    else if (this.state.sort === "gpa") list.sort((a, b) => gpaOf(b.id) - gpaOf(a.id));
    else if (this.state.sort === "enrollment") list.sort((a, b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate));

    return list.map((s) => ({ ...s, gpa: gpaOf(s.id) }));
  },

  renderTable() {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageStudents");
    const filtered = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.state.perPage));
    if (this.state.page > totalPages) this.state.page = totalPages;
    const pageItems = Utils.paginate(filtered, this.state.page, this.state.perPage);

    document.getElementById("results-count").textContent = `${filtered.length} ${t("resultsFound")}`;

    const table = document.getElementById("students-table");
    if (!filtered.length) {
      table.innerHTML = "";
      document.getElementById("students-pagination").innerHTML = "";
      const wrap = table.parentElement;
      wrap.querySelector(".empty-state")?.remove();
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">🔍</div><h4>${t("noResultsTitle")}</h4><p>${t("noResultsSubtitle")}</p>`;
      wrap.appendChild(empty);
      return;
    }
    table.parentElement.querySelector(".empty-state")?.remove();

    table.innerHTML = `
      <thead><tr>
        <th>${t("photo")}</th><th>${t("name")}</th><th>${t("email")}</th><th>${t("phone")}</th>
        <th>${t("department")}</th><th>${t("year")}</th><th>${t("gpa")}</th><th>${t("status")}</th><th>${t("actions")}</th>
      </tr></thead>
      <tbody>
        ${pageItems
          .map(
            (s) => `<tr class="table-row-anim" data-id="${s.id}">
            <td><div class="table-avatar" style="background:${Utils.avatarColor(s.email)}">${Utils.initials(s.firstName, s.lastName)}</div></td>
            <td><a href="#students/${s.id}" class="link-cell">${Utils.escapeHtml(s.firstName + " " + s.lastName)}</a><br/><small>${s.studentId}</small></td>
            <td>${Utils.escapeHtml(s.email)}</td>
            <td>${Utils.escapeHtml(s.phone)}</td>
            <td>${Utils.escapeHtml(s.department)}</td>
            <td>${s.year}</td>
            <td>${s.gpa.toFixed(1)}</td>
            <td><span class="badge-status ${s.status}">${t(s.status)}</span></td>
            <td class="actions-cell">
              <button class="icon-btn-sm view-btn" data-id="${s.id}" title="${t("view")}">👁</button>
              ${canManage ? `<button class="icon-btn-sm edit-btn" data-id="${s.id}" title="${t("edit")}">✏️</button><button class="icon-btn-sm delete-btn" data-id="${s.id}" title="${t("delete")}">🗑️</button>` : ""}
            </td>
          </tr>`
          )
          .join("")}
      </tbody>`;

    table.querySelectorAll(".view-btn").forEach((b) => b.addEventListener("click", () => (location.hash = `students/${b.dataset.id}`)));
    if (canManage) {
      table.querySelectorAll(".edit-btn").forEach((b) => b.addEventListener("click", () => this.openForm(parseInt(b.dataset.id))));
      table.querySelectorAll(".delete-btn").forEach((b) =>
        b.addEventListener("click", () => {
          Utils.confirm(t("deleteStudentConfirm"), () => {
            StorageManager.deleteStudent(parseInt(b.dataset.id));
            Utils.toast(t("studentDeleted"), "success");
            this.renderTable();
          });
        })
      );
    }

    this.renderPagination(totalPages);
  },

  renderPagination(totalPages) {
    const t = (k) => I18N.t(k);
    const el = document.getElementById("students-pagination");
    if (totalPages <= 1) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `
      <button class="btn btn-ghost" id="page-prev" ${this.state.page === 1 ? "disabled" : ""}>${t("previous")}</button>
      <span>${t("page")} ${this.state.page} ${t("of")} ${totalPages}</span>
      <button class="btn btn-ghost" id="page-next" ${this.state.page === totalPages ? "disabled" : ""}>${t("next")}</button>`;
    document.getElementById("page-prev")?.addEventListener("click", () => { this.state.page--; this.renderTable(); });
    document.getElementById("page-next")?.addEventListener("click", () => { this.state.page++; this.renderTable(); });
  },

  exportCsv() {
    const rows = this.getFiltered().map((s) => ({
      StudentID: s.studentId,
      FirstName: s.firstName,
      LastName: s.lastName,
      Email: s.email,
      Phone: s.phone,
      Department: s.department,
      Year: s.year,
      GPA: s.gpa.toFixed(2),
      Status: s.status,
    }));
    Utils.exportToCsv(rows, "students.csv");
  },

  openForm(id) {
    const t = (k) => I18N.t(k);
    const editing = !!id;
    const s = editing ? StorageManager.getStudent(id) : {};
    Utils.openModal(`
      <div class="modal-header"><h3>${editing ? t("editStudent") : t("addStudent")}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <form id="student-form" class="modal-body form-grid" novalidate>
        <div class="form-group"><label>${t("firstName")}</label><input id="f-firstName" value="${Utils.escapeHtml(s.firstName || "")}" required/><span class="field-error" data-for="firstName"></span></div>
        <div class="form-group"><label>${t("lastName")}</label><input id="f-lastName" value="${Utils.escapeHtml(s.lastName || "")}" required/><span class="field-error" data-for="lastName"></span></div>
        <div class="form-group"><label>${t("email")}</label><input id="f-email" type="email" value="${Utils.escapeHtml(s.email || "")}" required/><span class="field-error" data-for="email"></span></div>
        <div class="form-group"><label>${t("phone")}</label><input id="f-phone" value="${Utils.escapeHtml(s.phone || "")}" required/><span class="field-error" data-for="phone"></span></div>
        <div class="form-group"><label>${t("dob")}</label><input id="f-dob" type="date" value="${s.dob || ""}"/></div>
        <div class="form-group"><label>${t("gender")}</label><select id="f-gender"><option value="male" ${s.gender === "male" ? "selected" : ""}>${t("male")}</option><option value="female" ${s.gender === "female" ? "selected" : ""}>${t("female")}</option></select></div>
        <div class="form-group"><label>${t("department")}</label><input id="f-department" value="${Utils.escapeHtml(s.department || "")}" required/></div>
        <div class="form-group"><label>${t("year")}</label><select id="f-year">${[1, 2, 3, 4].map((y) => `<option value="${y}" ${s.year == y ? "selected" : ""}>${y}</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("studentId")}</label><input id="f-studentId" value="${Utils.escapeHtml(s.studentId || "S-" + Math.floor(2000 + Math.random() * 900))}" required/><span class="field-error" data-for="studentId"></span></div>
        <div class="form-group"><label>${t("enrollmentDate")}</label><input id="f-enrollmentDate" type="date" value="${s.enrollmentDate || new Date().toISOString().slice(0, 10)}"/></div>
        <div class="form-group form-span-2"><label>${t("address")}</label><input id="f-address" value="${Utils.escapeHtml(s.address || "")}"/></div>
        <div class="form-group"><label>${t("status")}</label><select id="f-status"><option value="active" ${s.status === "active" ? "selected" : ""}>${t("active")}</option><option value="inactive" ${s.status === "inactive" ? "selected" : ""}>${t("inactive")}</option></select></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="cancel-btn">${t("cancel")}</button>
        <button class="btn btn-primary" id="save-btn">${t("save")}</button>
      </div>
    `);
    document.getElementById("modal-close").onclick = Utils.closeModal;
    document.getElementById("cancel-btn").onclick = Utils.closeModal;
    document.getElementById("save-btn").onclick = () => this.saveForm(editing ? id : null);
  },

  saveForm(id) {
    const t = (k) => I18N.t(k);
    const val = (elId) => document.getElementById(elId).value.trim();
    const data = {
      firstName: val("f-firstName"),
      lastName: val("f-lastName"),
      email: val("f-email"),
      phone: val("f-phone"),
      dob: val("f-dob"),
      gender: val("f-gender"),
      department: val("f-department"),
      year: parseInt(val("f-year")),
      studentId: val("f-studentId"),
      enrollmentDate: val("f-enrollmentDate"),
      address: val("f-address"),
      status: val("f-status"),
    };

    document.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
    let valid = true;
    const setErr = (field, msg) => {
      const el = document.querySelector(`[data-for="${field}"]`);
      if (el) el.textContent = msg;
      valid = false;
    };
    if (!data.firstName) setErr("firstName", t("fieldRequired"));
    if (!data.lastName) setErr("lastName", t("fieldRequired"));
    if (!data.email || !Utils.isValidEmail(data.email)) setErr("email", t("invalidEmail"));
    if (!data.phone || !Utils.isValidPhone(data.phone)) setErr("phone", t("fieldRequired"));
    const dup = StorageManager.getStudents().find((s) => s.studentId === data.studentId && s.id !== id);
    if (dup) setErr("studentId", t("invalidGrade"));
    if (!valid) return;

    try {
      if (id) {
        StorageManager.updateStudent(id, data);
        Utils.toast(t("studentUpdated"), "success");
      } else {
        StorageManager.addStudent(data);
        Utils.toast(t("studentAdded"), "success");
      }
      Utils.closeModal();
      this.renderTable();
      if (App.currentView === "dashboard") Dashboard.render(document.getElementById("main-content"));
    } catch (e) {
      Utils.toast(t("studentSaveError"), "error");
    }
  },

  /* ---------------- STUDENT PROFILE ---------------- */
  renderProfile(main, id) {
    const t = (k) => I18N.t(k);
    const session = Auth.getSession();
    if (session.role === "student" && session.linkedId !== id) {
      main.innerHTML = `<div class="empty-state"><h4>${t("unauthorized")}</h4></div>`;
      return;
    }
    const s = StorageManager.getStudent(id);
    if (!s) {
      main.innerHTML = `<div class="empty-state"><h4>${t("noResultsTitle")}</h4></div>`;
      return;
    }
    const enrollments = StorageManager.getEnrollmentsForStudent(id);
    const courses = StorageManager.getCourses();
    const grades = StorageManager.getGradesForStudent(id);
    const attendance = StorageManager.getAttendanceForStudent(id);
    const avg = grades.length ? grades.reduce((s2, g) => s2 + g.grade, 0) / grades.length : 0;
    const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attRate = attendance.length ? (presentCount / attendance.length) * 100 : 0;

    const allStudents = StorageManager.getStudents().map((st) => {
      const g = StorageManager.getGradesForStudent(st.id);
      const a = g.length ? g.reduce((sum, gr) => sum + gr.grade, 0) / g.length : 0;
      return { id: st.id, avg: a };
    });
    allStudents.sort((a, b) => b.avg - a.avg);
    const rank = allStudents.findIndex((r) => r.id === id) + 1;

    main.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar-lg" style="background:${Utils.avatarColor(s.email)}">${Utils.initials(s.firstName, s.lastName)}</div>
        <div class="profile-header-info">
          <h2>${Utils.escapeHtml(s.firstName + " " + s.lastName)}</h2>
          <p>${s.studentId} · ${Utils.escapeHtml(s.department)} · ${t("year")} ${s.year}</p>
        </div>
        ${Auth.can("manageStudents") ? `<button class="btn btn-primary" id="profile-edit-btn">✏️ ${t("edit")}</button>` : ""}
      </div>

      <div class="stat-grid stat-grid-4">
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${avg.toFixed(1)}</span><span class="stat-label">${t("overallAverage")}</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${attRate.toFixed(0)}%</span><span class="stat-label">${t("overallAttendance")}</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">#${rank}</span><span class="stat-label">${t("rank")}</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${enrollments.length}</span><span class="stat-label">${t("numberOfCourses")}</span></div></div>
      </div>

      <div class="panel">
        <h3>${t("personalInfo")}</h3>
        <div class="info-grid">
          <div><span>${t("email")}</span><b>${Utils.escapeHtml(s.email)}</b></div>
          <div><span>${t("phone")}</span><b>${Utils.escapeHtml(s.phone)}</b></div>
          <div><span>${t("dob")}</span><b>${Utils.formatDate(s.dob)}</b></div>
          <div><span>${t("gender")}</span><b>${t(s.gender)}</b></div>
          <div><span>${t("address")}</span><b>${Utils.escapeHtml(s.address || "-")}</b></div>
          <div><span>${t("enrollmentDate")}</span><b>${Utils.formatDate(s.enrollmentDate)}</b></div>
        </div>
      </div>

      <div class="panel">
        <h3>${t("coursesEnrolled")}</h3>
        <div class="table-responsive"><table class="data-table">
          <thead><tr><th>${t("courseCode")}</th><th>${t("courseName")}</th><th>${t("credits")}</th><th>${t("grade")}</th></tr></thead>
          <tbody>
            ${enrollments
              .map((e) => {
                const c = courses.find((c2) => c2.id === e.courseId);
                const cg = grades.filter((g) => g.courseId === e.courseId);
                const cAvg = cg.length ? cg.reduce((s2, g) => s2 + g.grade, 0) / cg.length : null;
                return `<tr><td>${c ? c.courseCode : "-"}</td><td>${c ? Utils.escapeHtml(c.name) : "-"}</td><td>${c ? c.credits : "-"}</td><td>${cAvg !== null ? cAvg.toFixed(1) : "-"}</td></tr>`;
              })
              .join("") || `<tr><td colspan="4">${t("noResultsTitle")}</td></tr>`}
          </tbody>
        </table></div>
      </div>

      <div class="panel">
        <h3>${t("attendanceSection")}</h3>
        <div id="profile-attendance-chart"></div>
      </div>
    `;

    Dashboard.renderAttendanceDonut(document.getElementById("profile-attendance-chart"), attendance);

    if (Auth.can("manageStudents")) {
      document.getElementById("profile-edit-btn").addEventListener("click", () => this.openForm(id));
    }
  },
};
