const Dashboard = {
  render(main) {
    const t = (k) => I18N.t(k);
    const session = Auth.getSession();
    const students = StorageManager.getStudents();
    const teachers = StorageManager.getTeachers();
    const courses = StorageManager.getCourses();
    const grades = StorageManager.getGrades();
    const attendance = StorageManager.getAttendance();
    const notifications = StorageManager.getNotifications().slice(0, 5);

    const avgGrade = grades.length ? grades.reduce((s, g) => s + g.grade, 0) / grades.length : 0;
    const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = attendance.length ? (presentCount / attendance.length) * 100 : 0;
    const activeCourses = courses.filter((c) => c.status === "active").length;

    main.innerHTML = `
      <div class="dashboard-welcome">
        <h1>${t("welcomeBackName")}, ${Utils.escapeHtml(session.name.split(" ")[0])} 👋</h1>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#EEF2FF;color:#4F46E5">👨‍🎓</div>
          <div class="stat-info"><span class="stat-value" id="stat-students">0</span><span class="stat-label">${t("totalStudents")}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#ECFDF5;color:#10B981">👨‍🏫</div>
          <div class="stat-info"><span class="stat-value" id="stat-teachers">0</span><span class="stat-label">${t("totalTeachers")}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#FFF7ED;color:#F59E0B">📚</div>
          <div class="stat-info"><span class="stat-value" id="stat-courses">0</span><span class="stat-label">${t("totalCourses")}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#FDF2F8;color:#EC4899">📊</div>
          <div class="stat-info"><span class="stat-value" id="stat-avg">0</span><span class="stat-label">${t("avgGrade")}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#EFF6FF;color:#0EA5E9">🗓️</div>
          <div class="stat-info"><span class="stat-value" id="stat-attendance">0</span><span class="stat-label">${t("attendanceRate")}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#F5F3FF;color:#8B5CF6">✅</div>
          <div class="stat-info"><span class="stat-value" id="stat-active-courses">0</span><span class="stat-label">${t("activeCourses")}</span></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <h3>${t("attendanceOverview")}</h3>
          <div id="chart-attendance"></div>
        </div>
        <div class="panel">
          <h3>${t("gradeDistribution")}</h3>
          <div id="chart-grades"></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <h3>${t("studentsByDept")}</h3>
          <div id="chart-dept"></div>
        </div>
        <div class="panel">
          <h3>${t("studentsPerCourse")}</h3>
          <div id="chart-per-course"></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <h3>${t("topStudents")}</h3>
          <div id="top-students-list"></div>
        </div>
        <div class="panel">
          <h3>${t("recentNotifications")}</h3>
          <div id="recent-notifs-list"></div>
        </div>
      </div>
    `;

    Utils.animateCounter(document.getElementById("stat-students"), students.length);
    Utils.animateCounter(document.getElementById("stat-teachers"), teachers.length);
    Utils.animateCounter(document.getElementById("stat-courses"), courses.length);
    Utils.animateCounter(document.getElementById("stat-avg"), Math.round(avgGrade * 10) / 10);
    Utils.animateCounter(document.getElementById("stat-attendance"), Math.round(attendanceRate * 10) / 10);
    Utils.animateCounter(document.getElementById("stat-active-courses"), activeCourses);

    this.renderAttendanceDonut(document.getElementById("chart-attendance"), attendance);
    this.renderGradeBarChart(document.getElementById("chart-grades"), grades);
    this.renderDeptBarChart(document.getElementById("chart-dept"), students);
    this.renderPerCourseChart(document.getElementById("chart-per-course"), courses);
    this.renderTopStudents(document.getElementById("top-students-list"), students, grades);
    this.renderRecentNotifs(document.getElementById("recent-notifs-list"), notifications);
  },

  renderAttendanceDonut(container, attendance) {
    const t = (k) => I18N.t(k);
    if (!container) return;
    const total = attendance.length || 1;
    const counts = { present: 0, late: 0, absent: 0, excused: 0 };
    attendance.forEach((a) => counts[a.status]++);
    const colors = { present: "#10B981", late: "#F59E0B", absent: "#EF4444", excused: "#8B5CF6" };
    const R = 60,
      C = 2 * Math.PI * R;
    let offset = 0;
    const segs = Object.keys(counts)
      .map((key) => {
        const pct = counts[key] / total;
        const dash = pct * C;
        const seg = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${colors[key]}" stroke-width="18"
          stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)" />`;
        offset += dash;
        return seg;
      })
      .join("");
    container.innerHTML = `
      <div class="donut-wrap">
        <svg viewBox="0 0 160 160" width="160" height="160">${segs}<circle cx="80" cy="80" r="42" fill="var(--surface)"/></svg>
        <div class="donut-legend">
          ${Object.keys(counts)
            .map(
              (k) =>
                `<div class="legend-row"><span class="dot" style="background:${colors[k]}"></span>${t(k)} <b>${Math.round((counts[k] / total) * 100)}%</b></div>`
            )
            .join("")}
        </div>
      </div>`;
  },

  renderGradeBarChart(container, grades) {
    const t = (k) => I18N.t(k);
    if (!container) return;
    const buckets = { excellent: 0, veryGood: 0, good: 0, pass: 0, fail: 0 };
    grades.forEach((g) => {
      buckets[Utils.gradeLabel(g.grade).key]++;
    });
    const max = Math.max(...Object.values(buckets), 1);
    const colors = { excellent: "#10B981", veryGood: "#0EA5E9", good: "#4F46E5", pass: "#F59E0B", fail: "#EF4444" };
    container.innerHTML = `<div class="bar-chart">
      ${Object.keys(buckets)
        .map((key) => {
          const h = Math.round((buckets[key] / max) * 100);
          return `<div class="bar-col">
            <div class="bar-value">${buckets[key]}</div>
            <div class="bar" style="height:${h}%;background:${colors[key]}"></div>
            <div class="bar-label">${t(key)}</div>
          </div>`;
        })
        .join("")}
    </div>`;
  },

  renderDeptBarChart(container, students) {
    if (!container) return;
    const counts = {};
    students.forEach((s) => (counts[s.department] = (counts[s.department] || 0) + 1));
    const max = Math.max(...Object.values(counts), 1);
    container.innerHTML = `<div class="hbar-chart">
      ${Object.keys(counts)
        .map((dept) => {
          const w = Math.round((counts[dept] / max) * 100);
          return `<div class="hbar-row">
            <span class="hbar-label">${Utils.escapeHtml(dept)}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${w}%"></div></div>
            <span class="hbar-value">${counts[dept]}</span>
          </div>`;
        })
        .join("")}
    </div>`;
  },

  renderPerCourseChart(container, courses) {
    if (!container) return;
    const enrollments = StorageManager.getEnrollments();
    const counts = courses.map((c) => ({ name: c.courseCode, count: enrollments.filter((e) => e.courseId === c.id).length }));
    const max = Math.max(...counts.map((c) => c.count), 1);
    container.innerHTML = `<div class="bar-chart small">
      ${counts
        .slice(0, 8)
        .map((c) => {
          const h = Math.round((c.count / max) * 100);
          return `<div class="bar-col"><div class="bar-value">${c.count}</div><div class="bar" style="height:${h}%;background:#4F46E5"></div><div class="bar-label">${c.name}</div></div>`;
        })
        .join("")}
    </div>`;
  },

  renderTopStudents(container, students, grades) {
    const t = (k) => I18N.t(k);
    if (!container) return;
    const ranked = students
      .map((s) => {
        const sg = grades.filter((g) => g.studentId === s.id);
        const avg = sg.length ? sg.reduce((sum, g) => sum + g.grade, 0) / sg.length : 0;
        return { ...s, avg };
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    if (!ranked.length) {
      container.innerHTML = `<div class="empty-state-small">${t("noResultsTitle")}</div>`;
      return;
    }

    container.innerHTML = `<div class="mini-list">
      ${ranked
        .map(
          (s, i) => `<div class="mini-list-row">
            <span class="mini-rank">${i + 1}</span>
            <div class="mini-avatar" style="background:${Utils.avatarColor(s.email)}">${Utils.initials(s.firstName, s.lastName)}</div>
            <div class="mini-info"><span class="mini-name">${Utils.escapeHtml(s.firstName + " " + s.lastName)}</span><span class="mini-sub">${Utils.escapeHtml(s.department)}</span></div>
            <span class="mini-value">${s.avg.toFixed(1)}</span>
          </div>`
        )
        .join("")}
    </div>`;
  },

  renderRecentNotifs(container, notifications) {
    const t = (k) => I18N.t(k);
    if (!container) return;
    if (!notifications.length) {
      container.innerHTML = `<div class="empty-state-small">${t("noNotifications")}</div>`;
      return;
    }
    container.innerHTML = `<div class="mini-list">
      ${notifications
        .map((n) => {
          const msg = I18N.current === "ru" ? n.message_ru : n.message_en;
          const icons = { info: "ℹ️", warning: "⚠️", error: "❌", success: "✅" };
          return `<div class="mini-list-row">
            <span class="mini-notif-icon">${icons[n.type] || "ℹ️"}</span>
            <div class="mini-info"><span class="mini-name">${Utils.escapeHtml(msg)}</span></div>
            ${!n.read ? '<span class="dot-unread"></span>' : ""}
          </div>`;
        })
        .join("")}
    </div>`;
  },
};
