/* ==========================================================================
   auth.js — Authentication, session management, role permissions
   ========================================================================== */

const ROLE_PERMISSIONS = {
  admin: [
    "viewDashboard", "manageStudents", "manageTeachers", "manageCourses",
    "assignStudents", "manageGrades", "manageAttendance", "viewRanking",
    "viewNotifications", "exportData", "manageUsers", "viewAllProfiles",
  ],
  teacher: [
    "viewDashboard", "viewStudents", "viewCourses", "manageGrades",
    "manageAttendance", "viewRanking", "viewNotifications", "exportData",
    "viewAllProfiles",
  ],
  student: [
    "viewDashboard", "viewOwnProfile", "viewOwnCourses", "viewOwnGrades",
    "viewRanking", "viewOwnAttendance", "viewNotifications",
  ],
};

const Auth = {
  getSession() {
    const raw = sessionStorage.getItem(DB_KEYS.SESSION) || localStorage.getItem(DB_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  login(email, password, remember) {
    const user = StorageManager.getUsers().find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) return { success: false, error: "invalidCredentials" };

    const session = { id: user.id, email: user.email, name: user.name, role: user.role, linkedId: user.linkedId };
    sessionStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
    if (remember) localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
    else localStorage.removeItem(DB_KEYS.SESSION);

    return { success: true, session };
  },

  logout() {
    sessionStorage.removeItem(DB_KEYS.SESSION);
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  can(permission) {
    const session = this.getSession();
    if (!session) return false;
    const perms = ROLE_PERMISSIONS[session.role] || [];
    return perms.includes(permission);
  },

  requirePermission(permission) {
    if (!this.can(permission)) {
      Utils.toast(I18N.t("unauthorized"), "error");
      return false;
    }
    return true;
  },
};
