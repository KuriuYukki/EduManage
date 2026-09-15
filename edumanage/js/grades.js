const GradesModule = {
  state: { search: "", studentId: "", courseId: "", range: "", sort: "date", page: 1, perPage: 8 },
  rankState: { department: "", year: "" },

  render(main) {
    const t = (k) => I18N.t(k);
    const session = Auth.getSession();
    const canManage = Auth.can("manageGrades");
    const students = StorageManager.getStudents();
    const courses = StorageManager.getCourses();

    main.innerHTML = `
      <div class="toolbar">
        <div class="search-box"><span>🔍</span><input type="text" id="grade-search" placeholder="${t("search")}..." value="${Utils.escapeHtml(this.state.search)}"/></div>
        <div class="toolbar-filters">
          <select id="filter-grade-student"><option value="">${t("filterByStudent")}</option>${students.map((s) => `<option value="${s.id}" ${this.state.studentId == s.id ? "selected" : ""}>${s.firstName} ${s.lastName}</option>`).join("")}</select>
          <select id="filter-grade-course"><option value="">${t("filterByCourse")}</option>${courses.map((c) => `<option value="${c.id}" ${this.state.courseId == c.id ? "selected" : ""}>${c.courseCode}</option>`).join("")}</select>
          <select id="filter-grade-range">
            <option value="">${t("filterByGradeRange")}</option>
            <option value="excellent" ${this.state.range === "excellent" ? "selected" : ""}>${t("excellent")} (16-20)</option>
            <option value="veryGood" ${this.state.range === "veryGood" ? "selected" : ""}>${t("veryGood")} (14-15.99)</option>
            <option value="good" ${this.state.range === "good" ? "selected" : ""}>${t("good")} (12-13.99)</option>
            <option value="pass" ${this.state.range === "pass" ? "selected" : ""}>${t("pass")} (10-11.99)</option>
            <option value="fail" ${this.state.range === "fail" ? "selected" : ""}>${t("fail")} (0-9.99)</option>
          </select>
          <select id="sort-grade"><option value="date" ${this.state.sort === "date" ? "selected" : ""}>${t("date")}</option><option value="grade" ${this.state.sort === "grade" ? "selected" : ""}>${t("sortByGrade")}</option></select>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" id="export-grades-csv">${t("exportCsv")}</button>
          ${canManage ? `<button class="btn btn-primary" id="add-grade-btn">+ ${t("addGrade")}</button>` : ""}
        </div>
      </div>
      <div class="results-count" id="grade-results-count"></div>
      <div class="table-responsive"><table class="data-table" id="grades-table"></table></div>
      <div class="pagination" id="grades-pagination"></div>

      ${session.role === "student" ? `<div class="panel"><h3>${t("overallAverage")}</h3><div id="student-avg-summary"></div></div>` : ""}
    `;

    document.getElementById("grade-search").addEventListener("input", Utils.debounce((e) => { this.state.search = e.target.value; this.state.page = 1; this.renderTable(); }, 250));
    document.getElementById("filter-grade-student").addEventListener("change", (e) => { this.state.studentId = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-grade-course").addEventListener("change", (e) => { this.state.courseId = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("filter-grade-range").addEventListener("change", (e) => { this.state.range = e.target.value; this.state.page = 1; this.renderTable(); });
    document.getElementById("sort-grade").addEventListener("change", (e) => { this.state.sort = e.target.value; this.renderTable(); });
    document.getElementById("export-grades-csv").addEventListener("click", () => this.exportCsv());
    if (canManage) document.getElementById("add-grade-btn").addEventListener("click", () => this.openForm());

    document.addEventListener("global-search", (e) => {
      if (App.currentView !== "grades") return;
      document.getElementById("grade-search").value = e.detail;
      this.state.search = e.detail;
      this.renderTable();
    });

    this.renderTable();
    if (session.role === "student") this.renderStudentAvgSummary(session.linkedId);
  },

  getFiltered() {
    const session = Auth.getSession();
    let list = StorageManager.getGrades();
    if (session.role === "student") list = list.filter((g) => g.studentId === session.linkedId);

    if (this.state.studentId) list = list.filter((g) => String(g.studentId) === String(this.state.studentId));
    if (this.state.courseId) list = list.filter((g) => String(g.courseId) === String(this.state.courseId));
    if (this.state.range) list = list.filter((g) => Utils.gradeLabel(g.grade).key === this.state.range);

    const q = this.state.search.toLowerCase();
    if (q) {
      list = list.filter((g) => {
        const s = StorageManager.getStudent(g.studentId);
        const c = StorageManager.getCourse(g.courseId);
        return (s && `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)) || (c && c.name.toLowerCase().includes(q));
      });
    }

    if (this.state.sort === "grade") list.sort((a, b) => b.grade - a.grade);
    else list.sort((a, b) => new Date(b.date) - new Date(a.date));

    return list;
  },

  renderTable() {
    const t = (k) => I18N.t(k);
    const canManage = Auth.can("manageGrades");
    const filtered = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.state.perPage));
    if (this.state.page > totalPages) this.state.page = totalPages;
    const pageItems = Utils.paginate(filtered, this.state.page, this.state.perPage);

    document.getElementById("grade-results-count").textContent = `${filtered.length} ${t("resultsFound")}`;
    const table = document.getElementById("grades-table");
    const wrap = table.parentElement;
    wrap.querySelector(".empty-state")?.remove();

    if (!filtered.length) {
      table.innerHTML = "";
      document.getElementById("grades-pagination").innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">📊</div><h4>${t("noResultsTitle")}</h4><p>${t("noResultsSubtitle")}</p>`;
      wrap.appendChild(empty);
      return;
    }

    table.innerHTML = `
      <thead><tr><th>${t("student")}</th><th>${t("courses")}</th><th>${t("grade")}</th><th>${t("status")}</th><th>${t("date")}</th>${canManage ? `<th>${t("actions")}</th>` : ""}</tr></thead>
      <tbody>
        ${pageItems
          .map((g) => {
            const s = StorageManager.getStudent(g.studentId);
            const c = StorageManager.getCourse(g.courseId);
            const label = Utils.gradeLabel(g.grade);
            return `<tr class="table-row-anim">
              <td>${s ? Utils.escapeHtml(s.firstName + " " + s.lastName) : "-"}</td>
              <td>${c ? Utils.escapeHtml(c.name) : "-"}</td>
              <td><b>${g.grade.toFixed(2)}</b></td>
              <td><span class="badge-grade ${label.cls}">${t(label.key)}</span></td>
              <td>${Utils.formatDate(g.date)}</td>
              ${canManage ? `<td class="actions-cell"><button class="icon-btn-sm edit-grade-btn" data-id="${g.id}">✏️</button><button class="icon-btn-sm delete-grade-btn" data-id="${g.id}">🗑️</button></td>` : ""}
            </tr>`;
          })
          .join("")}
      </tbody>`;

    if (canManage) {
      table.querySelectorAll(".edit-grade-btn").forEach((b) => b.addEventListener("click", () => this.openForm(parseInt(b.dataset.id))));
      table.querySelectorAll(".delete-grade-btn").forEach((b) =>
        b.addEventListener("click", () => {
          Utils.confirm(t("gradeDeleted") + "?", () => {
            StorageManager.deleteGrade(parseInt(b.dataset.id));
            Utils.toast(t("gradeDeleted"), "success");
            this.renderTable();
          });
        })
      );
    }
    this.renderPagination(totalPages);
  },

  renderPagination(totalPages) {
    const t = (k) => I18N.t(k);
    const el = document.getElementById("grades-pagination");
    if (totalPages <= 1) { el.innerHTML = ""; return; }
    el.innerHTML = `<button class="btn btn-ghost" id="gp-prev" ${this.state.page === 1 ? "disabled" : ""}>${t("previous")}</button><span>${t("page")} ${this.state.page} ${t("of")} ${totalPages}</span><button class="btn btn-ghost" id="gp-next" ${this.state.page === totalPages ? "disabled" : ""}>${t("next")}</button>`;
    document.getElementById("gp-prev")?.addEventListener("click", () => { this.state.page--; this.renderTable(); });
    document.getElementById("gp-next")?.addEventListener("click", () => { this.state.page++; this.renderTable(); });
  },

  exportCsv() {
    const rows = this.getFiltered().map((g) => {
      const s = StorageManager.getStudent(g.studentId);
      const c = StorageManager.getCourse(g.courseId);
      return { Student: s ? `${s.firstName} ${s.lastName}` : "-", Course: c ? c.name : "-", Grade: g.grade, Date: g.date };
    });
    Utils.exportToCsv(rows, "grades.csv");
  },

  openForm(id) {
    const t = (k) => I18N.t(k);
    const editing = !!id;
    const g = editing ? StorageManager.getGrades().find((gr) => gr.id === id) : {};
    const students = StorageManager.getStudents();
    const courses = StorageManager.getCourses();
    Utils.openModal(`
      <div class="modal-header"><h3>${editing ? t("edit") : t("addGrade")}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body form-grid">
        <div class="form-group"><label>${t("selectStudent")}</label><select id="gf-student">${students.map((s) => `<option value="${s.id}" ${g.studentId === s.id ? "selected" : ""}>${s.firstName} ${s.lastName}</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("selectCourse")}</label><select id="gf-course">${courses.map((c) => `<option value="${c.id}" ${g.courseId === c.id ? "selected" : ""}>${c.courseCode} - ${c.name}</option>`).join("")}</select></div>
        <div class="form-group"><label>${t("grade")} (0-20)</label><input id="gf-grade" type="number" step="0.01" min="0" max="20" value="${g.grade !== undefined ? g.grade : ""}"/><span class="field-error" id="gf-error"></span></div>
        <div class="form-group"><label>${t("date")}</label><input id="gf-date" type="date" value="${g.date || new Date().toISOString().slice(0, 10)}"/></div>
      </div>
      <div class="modal-footer"><button class="btn btn-ghost" id="cancel-btn">${t("cancel")}</button><button class="btn btn-primary" id="save-btn">${t("save")}</button></div>
    `);
    document.getElementById("modal-close").onclick = Utils.closeModal;
    document.getElementById("cancel-btn").onclick = Utils.closeModal;
    document.getElementById("save-btn").onclick = () => this.saveForm(editing ? id : null);
  },

  saveForm(id) {
    const t = (k) => I18N.t(k);
    const studentId = parseInt(document.getElementById("gf-student").value);
    const courseId = parseInt(document.getElementById("gf-course").value);
    const grade = parseFloat(document.getElementById("gf-grade").value);
    const date = document.getElementById("gf-date").value;
    const errEl = document.getElementById("gf-error");
    errEl.textContent = "";

    if (isNaN(grade) || grade < 0 || grade > 20) {
      errEl.textContent = t("invalidGrade");
      return;
    }
    if (id) { StorageManager.updateGrade(id, { studentId, courseId, grade, date }); Utils.toast(t("gradeUpdated"), "success"); }
    else {
      StorageManager.addGrade({ studentId, courseId, grade, date });
      const s = StorageManager.getStudent(studentId);
      if (s) StorageManager.addNotification({
        message_en: `Student ${s.firstName} ${s.lastName} received a new grade.`,
        message_ru: `Студент ${s.firstName} ${s.lastName} получил новую оценку.`,
        type: "info",
      });
      Utils.toast(t("gradeAdded"), "success");
    }
    Utils.closeModal();
    this.renderTable();
  },

  studentAverage(studentId) {
    const grades = StorageManager.getGradesForStudent(studentId);
    if (!grades.length) return { overall: 0, weighted: 0, numCourses: 0, passed: 0, failed: 0 };
    const courses = StorageManager.getCourses();
    let weightedSum = 0,
      weightSum = 0;
    const perCourse = {};
    grades.forEach((g) => {
      if (!perCourse[g.courseId]) perCourse[g.courseId] = [];
      perCourse[g.courseId].push(g.grade);
    });
    let passed = 0,
      failed = 0;
    Object.keys(perCourse).forEach((cid) => {
      const course = courses.find((c) => c.id === parseInt(cid));
      const avgC = perCourse[cid].reduce((s, v) => s + v, 0) / perCourse[cid].length;
      const credits = course ? course.credits : 1;
      weightedSum += avgC * credits;
      weightSum += credits;
      if (avgC >= 10) passed++;
      else failed++;
    });
    const overall = grades.reduce((s, g) => s + g.grade, 0) / grades.length;
    return {
      overall,
      weighted: weightSum ? weightedSum / weightSum : 0,
      numCourses: Object.keys(perCourse).length,
      passed,
      failed,
    };
  },

  renderStudentAvgSummary(studentId) {
    const t = (k) => I18N.t(k);
    const container = document.getElementById("student-avg-summary");
    if (!container) return;
    const stats = this.studentAverage(studentId);
    container.innerHTML = `
      <div class="stat-grid stat-grid-4">
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${stats.weighted.toFixed(1)}</span><span class="stat-label">${t("overallAverage")}</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${stats.numCourses}</span><span class="stat-label">${t("numberOfCourses")}</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${stats.passed}</span><span class="stat-label">${t("passedCourses")}</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${stats.failed}</span><span class="stat-label">${t("failedCourses")}</span></div></div>
      </div>`;
  },

  renderRanking(main) {
    const t = (k) => I18N.t(k);
    const departments = [...new Set(StorageManager.getStudents().map((s) => s.department))];
    main.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-filters">
          <select id="rank-department"><option value="">${t("department")} - ${t("all")}</option>${departments.map((d) => `<option value="${d}" ${this.rankState.department === d ? "selected" : ""}>${d}</option>`).join("")}</select>
          <select id="rank-year"><option value="">${t("year")} - ${t("all")}</option>${[1, 2, 3, 4].map((y) => `<option value="${y}" ${this.rankState.year == y ? "selected" : ""}>${y}</option>`).join("")}</select>
        </div>
        <div class="toolbar-actions"><button class="btn btn-ghost" id="export-ranking-csv">${t("exportCsv")}</button></div>
      </div>
      <div class="table-responsive"><table class="data-table" id="ranking-table"></table></div>
    `;
    document.getElementById("rank-department").addEventListener("change", (e) => { this.rankState.department = e.target.value; this.renderRankingTable(); });
    document.getElementById("rank-year").addEventListener("change", (e) => { this.rankState.year = e.target.value; this.renderRankingTable(); });
    document.getElementById("export-ranking-csv").addEventListener("click", () => this.exportRankingCsv());
    this.renderRankingTable();
  },

  getRanked() {
    let students = StorageManager.getStudents();
    if (this.rankState.department) students = students.filter((s) => s.department === this.rankState.department);
    if (this.rankState.year) students = students.filter((s) => String(s.year) === String(this.rankState.year));

    const attendance = StorageManager.getAttendance();
    return students
      .map((s) => {
        const stats = this.studentAverage(s.id);
        const att = attendance.filter((a) => a.studentId === s.id);
        const present = att.filter((a) => a.status === "present" || a.status === "late").length;
        const attRate = att.length ? (present / att.length) * 100 : 0;
        return { ...s, avg: stats.weighted, passed: stats.passed, attRate };
      })
      .sort((a, b) => b.avg - a.avg);
  },

  renderRankingTable() {
    const t = (k) => I18N.t(k);
    const ranked = this.getRanked();
    const table = document.getElementById("ranking-table");
    const wrap = table.parentElement;
    wrap.querySelector(".empty-state")?.remove();
    if (!ranked.length) {
      table.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<div class="empty-icon">🏆</div><h4>${t("noResultsTitle")}</h4>`;
      wrap.appendChild(empty);
      return;
    }
    const medals = ["🥇", "🥈", "🥉"];
    table.innerHTML = `
      <thead><tr><th>${t("rank")}</th><th>${t("student")}</th><th>${t("department")}</th><th>${t("year")}</th><th>${t("average")}</th><th>${t("passedCourses")}</th><th>${t("attendance")}</th></tr></thead>
      <tbody>
        ${ranked
          .map(
            (s, i) => `<tr class="table-row-anim ${i < 3 ? "rank-highlight" : ""}">
            <td>${medals[i] || "#" + (i + 1)}</td>
            <td><div class="table-avatar" style="background:${Utils.avatarColor(s.email)};display:inline-flex;vertical-align:middle;margin-right:8px">${Utils.initials(s.firstName, s.lastName)}</div>${Utils.escapeHtml(s.firstName + " " + s.lastName)}</td>
            <td>${Utils.escapeHtml(s.department)}</td>
            <td>${s.year}</td>
            <td><b>${s.avg.toFixed(1)}</b></td>
            <td>${s.passed}</td>
            <td>${s.attRate.toFixed(0)}%</td>
          </tr>`
          )
          .join("")}
      </tbody>`;
  },

  exportRankingCsv() {
    const rows = this.getRanked().map((s, i) => ({ Rank: i + 1, Student: `${s.firstName} ${s.lastName}`, Department: s.department, Year: s.year, Average: s.avg.toFixed(2), Attendance: s.attRate.toFixed(0) + "%" }));
    Utils.exportToCsv(rows, "ranking.csv");
  },
};
