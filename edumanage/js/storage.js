/* ==========================================================================
   storage.js — localStorage database abstraction layer
   Simulates the relational database described in database.sql
   ========================================================================== */

const DB_KEYS = {
  USERS: "edu_users",
  STUDENTS: "edu_students",
  TEACHERS: "edu_teachers",
  COURSES: "edu_courses",
  ENROLLMENTS: "edu_enrollments",
  GRADES: "edu_grades",
  ATTENDANCE: "edu_attendance",
  NOTIFICATIONS: "edu_notifications",
  SEEDED: "edu_seeded_v1",
  SESSION: "edu_session",
};

const StorageManager = {
  /* ---------- generic helpers ---------- */
  _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Storage read error", key, e);
      return [];
    }
  },
  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  _nextId(list) {
    return list.length ? Math.max(...list.map((i) => i.id)) + 1 : 1;
  },

  /* ---------- USERS ---------- */
  getUsers() { return this._get(DB_KEYS.USERS); },
  setUsers(v) { this._set(DB_KEYS.USERS, v); },

  /* ---------- STUDENTS ---------- */
  getStudents() { return this._get(DB_KEYS.STUDENTS); },
  getStudent(id) { return this.getStudents().find((s) => s.id === id); },
  addStudent(data) {
    const list = this.getStudents();
    const item = { id: this._nextId(list), status: "active", ...data };
    list.push(item);
    this._set(DB_KEYS.STUDENTS, list);
    return item;
  },
  updateStudent(id, data) {
    const list = this.getStudents();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set(DB_KEYS.STUDENTS, list);
    return list[idx];
  },
  deleteStudent(id) {
    this._set(DB_KEYS.STUDENTS, this.getStudents().filter((s) => s.id !== id));
    this._set(DB_KEYS.ENROLLMENTS, this.getEnrollments().filter((e) => e.studentId !== id));
    this._set(DB_KEYS.GRADES, this.getGrades().filter((g) => g.studentId !== id));
    this._set(DB_KEYS.ATTENDANCE, this.getAttendance().filter((a) => a.studentId !== id));
  },

  /* ---------- TEACHERS ---------- */
  getTeachers() { return this._get(DB_KEYS.TEACHERS); },
  getTeacher(id) { return this.getTeachers().find((t) => t.id === id); },
  addTeacher(data) {
    const list = this.getTeachers();
    const item = { id: this._nextId(list), status: "active", ...data };
    list.push(item);
    this._set(DB_KEYS.TEACHERS, list);
    return item;
  },
  updateTeacher(id, data) {
    const list = this.getTeachers();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set(DB_KEYS.TEACHERS, list);
    return list[idx];
  },
  deleteTeacher(id) {
    this._set(DB_KEYS.TEACHERS, this.getTeachers().filter((t) => t.id !== id));
    const courses = this.getCourses().map((c) => (c.teacherId === id ? { ...c, teacherId: null } : c));
    this._set(DB_KEYS.COURSES, courses);
  },

  /* ---------- COURSES ---------- */
  getCourses() { return this._get(DB_KEYS.COURSES); },
  getCourse(id) { return this.getCourses().find((c) => c.id === id); },
  addCourse(data) {
    const list = this.getCourses();
    const item = { id: this._nextId(list), status: "active", ...data };
    list.push(item);
    this._set(DB_KEYS.COURSES, list);
    return item;
  },
  updateCourse(id, data) {
    const list = this.getCourses();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set(DB_KEYS.COURSES, list);
    return list[idx];
  },
  deleteCourse(id) {
    this._set(DB_KEYS.COURSES, this.getCourses().filter((c) => c.id !== id));
    this._set(DB_KEYS.ENROLLMENTS, this.getEnrollments().filter((e) => e.courseId !== id));
    this._set(DB_KEYS.GRADES, this.getGrades().filter((g) => g.courseId !== id));
    this._set(DB_KEYS.ATTENDANCE, this.getAttendance().filter((a) => a.courseId !== id));
  },

  /* ---------- ENROLLMENTS ---------- */
  getEnrollments() { return this._get(DB_KEYS.ENROLLMENTS); },
  isEnrolled(studentId, courseId) {
    return this.getEnrollments().some((e) => e.studentId === studentId && e.courseId === courseId);
  },
  addEnrollment(studentId, courseId) {
    const list = this.getEnrollments();
    const item = { id: this._nextId(list), studentId, courseId, enrollDate: new Date().toISOString().slice(0, 10) };
    list.push(item);
    this._set(DB_KEYS.ENROLLMENTS, list);
    return item;
  },
  removeEnrollment(studentId, courseId) {
    this._set(
      DB_KEYS.ENROLLMENTS,
      this.getEnrollments().filter((e) => !(e.studentId === studentId && e.courseId === courseId))
    );
  },
  getEnrollmentsForStudent(studentId) {
    return this.getEnrollments().filter((e) => e.studentId === studentId);
  },
  getEnrollmentsForCourse(courseId) {
    return this.getEnrollments().filter((e) => e.courseId === courseId);
  },

  /* ---------- GRADES ---------- */
  getGrades() { return this._get(DB_KEYS.GRADES); },
  addGrade(data) {
    const list = this.getGrades();
    const item = { id: this._nextId(list), date: new Date().toISOString().slice(0, 10), ...data };
    list.push(item);
    this._set(DB_KEYS.GRADES, list);
    return item;
  },
  updateGrade(id, data) {
    const list = this.getGrades();
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set(DB_KEYS.GRADES, list);
    return list[idx];
  },
  deleteGrade(id) {
    this._set(DB_KEYS.GRADES, this.getGrades().filter((g) => g.id !== id));
  },
  getGradesForStudent(studentId) {
    return this.getGrades().filter((g) => g.studentId === studentId);
  },
  getGradesForCourse(courseId) {
    return this.getGrades().filter((g) => g.courseId === courseId);
  },

  /* ---------- ATTENDANCE ---------- */
  getAttendance() { return this._get(DB_KEYS.ATTENDANCE); },
  hasAttendanceRecord(studentId, courseId, date) {
    return this.getAttendance().some((a) => a.studentId === studentId && a.courseId === courseId && a.date === date);
  },
  addAttendance(data) {
    const list = this.getAttendance();
    const item = { id: this._nextId(list), ...data };
    list.push(item);
    this._set(DB_KEYS.ATTENDANCE, list);
    return item;
  },
  updateAttendance(id, data) {
    const list = this.getAttendance();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set(DB_KEYS.ATTENDANCE, list);
    return list[idx];
  },
  deleteAttendance(id) {
    this._set(DB_KEYS.ATTENDANCE, this.getAttendance().filter((a) => a.id !== id));
  },
  getAttendanceForStudent(studentId) {
    return this.getAttendance().filter((a) => a.studentId === studentId);
  },

  /* ---------- NOTIFICATIONS ---------- */
  getNotifications() { return this._get(DB_KEYS.NOTIFICATIONS); },
  addNotification(data) {
    const list = this.getNotifications();
    const item = { id: this._nextId(list), read: false, date: new Date().toISOString(), ...data };
    list.unshift(item);
    this._set(DB_KEYS.NOTIFICATIONS, list);
    return item;
  },
  markNotificationRead(id) {
    const list = this.getNotifications();
    const idx = list.findIndex((n) => n.id === id);
    if (idx === -1) return;
    list[idx].read = true;
    this._set(DB_KEYS.NOTIFICATIONS, list);
  },
  markAllNotificationsRead() {
    const list = this.getNotifications().map((n) => ({ ...n, read: true }));
    this._set(DB_KEYS.NOTIFICATIONS, list);
  },
  deleteNotification(id) {
    this._set(DB_KEYS.NOTIFICATIONS, this.getNotifications().filter((n) => n.id !== id));
  },
  unreadCount() {
    return this.getNotifications().filter((n) => !n.read).length;
  },

  /* ---------- SEED / RESET ---------- */
  isSeeded() { return localStorage.getItem(DB_KEYS.SEEDED) === "true"; },

  resetAllData() {
    Object.values(DB_KEYS).forEach((k) => localStorage.removeItem(k));
    this.seedData();
  },

  seedData(force) {
    if (this.isSeeded() && !force) return;

    const firstNamesEN = ["John", "Michael", "Sarah", "Emily", "David", "James", "Laura", "Robert", "Emma", "William"];
    const lastNamesEN = ["Smith", "Brown", "Johnson", "Williams", "Miller", "Davis", "Wilson", "Taylor", "Anderson", "Clark"];
    const firstNamesRU = ["Anna", "Dmitry", "Elena", "Sergei", "Olga", "Ivan", "Maria", "Alexei", "Natalia", "Pavel"];
    const lastNamesRU = ["Ivanova", "Petrov", "Sokolova", "Volkov", "Kuznetsova", "Popov", "Fedorova", "Smirnov", "Morozova", "Egorov"];
    const departments = ["Computer Science", "Mathematics", "Physics", "Business", "Biology", "Economics"];
    const specializations = ["Software Engineering", "Data Science", "Applied Mathematics", "Theoretical Physics", "Finance", "Marketing", "Genetics", "Micro-economics"];

    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    /* ---- USERS ---- */
    const users = [
      { id: 1, email: "admin@edumanage.com", password: "admin123", role: "admin", name: "Admin User", linkedId: null },
      { id: 2, email: "teacher@edumanage.com", password: "teacher123", role: "teacher", name: "Demo Teacher", linkedId: 1 },
      { id: 3, email: "student@edumanage.com", password: "student123", role: "student", name: "Demo Student", linkedId: 1 },
    ];

    /* ---- TEACHERS (8) ---- */
    const teachers = [];
    teachers.push({ id: 1, teacherId: "T-1001", firstName: "Demo", lastName: "Teacher", email: "teacher@edumanage.com", phone: "+1-555-0100", department: departments[0], specialization: specializations[0], status: "active" });
    for (let i = 2; i <= 8; i++) {
      const useRu = i % 3 === 0;
      const fn = useRu ? rand(firstNamesRU) : rand(firstNamesEN);
      const ln = useRu ? rand(lastNamesRU) : rand(lastNamesEN);
      teachers.push({
        id: i,
        teacherId: `T-${1000 + i}`,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@edumanage.com`,
        phone: `+1-555-0${100 + i}`,
        department: rand(departments),
        specialization: rand(specializations),
        status: "active",
      });
    }

    /* ---- COURSES (10) ---- */
    const courseNames = [
      ["Introduction to Programming", "CS101"],
      ["Data Structures & Algorithms", "CS201"],
      ["Calculus I", "MATH101"],
      ["Linear Algebra", "MATH202"],
      ["Classical Mechanics", "PHYS101"],
      ["Principles of Marketing", "BUS150"],
      ["Microeconomics", "ECON101"],
      ["Cell Biology", "BIO110"],
      ["Database Systems", "CS310"],
      ["Financial Accounting", "BUS220"],
    ];
    const courses = courseNames.map(([name, code], i) => ({
      id: i + 1,
      name,
      courseCode: code,
      department: departments[i % departments.length],
      credits: rand([3, 4, 5]),
      semester: rand(["Fall 2026", "Spring 2026"]),
      teacherId: (i % 8) + 1,
      capacity: randInt(20, 35),
      status: "active",
    }));

    /* ---- STUDENTS (20) ---- */
    const students = [];
    students.push({ id: 1, studentId: "S-2001", firstName: "Demo", lastName: "Student", email: "student@edumanage.com", phone: "+1-555-0200", dob: "2003-04-12", gender: "male", department: departments[0], year: 2, address: "12 Campus Ave", enrollmentDate: "2024-09-01", status: "active" });
    for (let i = 2; i <= 20; i++) {
      const useRu = i % 2 === 0;
      const gender = i % 2 === 0 ? "female" : "male";
      const fn = useRu ? rand(firstNamesRU) : rand(firstNamesEN);
      const ln = useRu ? rand(lastNamesRU) : rand(lastNamesEN);
      students.push({
        id: i,
        studentId: `S-${2000 + i}`,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@edumanage.com`,
        phone: `+1-555-0${200 + i}`,
        dob: `${randInt(2001, 2006)}-${String(randInt(1, 12)).padStart(2, "0")}-${String(randInt(1, 28)).padStart(2, "0")}`,
        gender,
        department: rand(departments),
        year: randInt(1, 4),
        address: `${randInt(1, 200)} University St`,
        enrollmentDate: `202${randInt(1, 4)}-09-01`,
        status: rand(["active", "active", "active", "inactive"]),
      });
    }

    /* ---- ENROLLMENTS (50+) ---- */
    const enrollments = [];
    let eid = 1;
    students.forEach((s) => {
      const numCourses = randInt(2, 4);
      const shuffled = [...courses].sort(() => Math.random() - 0.5).slice(0, numCourses);
      shuffled.forEach((c) => {
        if (!enrollments.some((e) => e.studentId === s.id && e.courseId === c.id)) {
          enrollments.push({ id: eid++, studentId: s.id, courseId: c.id, enrollDate: s.enrollmentDate });
        }
      });
    });

    /* ---- GRADES (100+) ---- */
    const grades = [];
    let gid = 1;
    enrollments.forEach((e) => {
      // 2-3 grade entries per enrollment (guarantees 100+ total grade records)
      const numGrades = randInt(2, 3);
      for (let n = 0; n < numGrades; n++) {
        grades.push({
          id: gid++,
          studentId: e.studentId,
          courseId: e.courseId,
          grade: Math.round((Math.random() * 20) * 100) / 100,
          date: `2026-0${randInt(1, 6)}-${String(randInt(1, 28)).padStart(2, "0")}`,
        });
      }
    });

    /* ---- ATTENDANCE (200+) ---- */
    const attendance = [];
    let aid = 1;
    const statuses = ["present", "present", "present", "late", "absent", "excused"];
    enrollments.forEach((e) => {
      const sessions = randInt(8, 12);
      for (let d = 0; d < sessions; d++) {
        attendance.push({
          id: aid++,
          studentId: e.studentId,
          courseId: e.courseId,
          date: `2026-0${randInt(1, 6)}-${String(randInt(1, 28)).padStart(2, "0")}`,
          status: rand(statuses),
        });
      }
    });

    /* ---- NOTIFICATIONS (10+) ---- */
    const notifications = [
      { id: 1, message_en: "Welcome back, Admin!", message_ru: "С возвращением, Администратор!", type: "info", read: false, date: new Date().toISOString() },
      { id: 2, message_en: "3 students have attendance below 70%.", message_ru: "3 студента имеют посещаемость ниже 70%.", type: "warning", read: false, date: new Date().toISOString() },
      { id: 3, message_en: "Student Ahmed Benali received a new grade.", message_ru: "Студент Ahmed Benali получил новую оценку.", type: "info", read: false, date: new Date().toISOString() },
      { id: 4, message_en: "5 students have failed courses.", message_ru: "5 студентов не сдали курсы.", type: "error", read: true, date: new Date().toISOString() },
      { id: 5, message_en: "Course capacity is almost full for CS101.", message_ru: "Вместимость курса CS101 почти заполнена.", type: "warning", read: false, date: new Date().toISOString() },
      { id: 6, message_en: "New teacher added to Computer Science department.", message_ru: "Новый преподаватель добавлен на факультет информатики.", type: "info", read: true, date: new Date().toISOString() },
      { id: 7, message_en: "Grade report generated for Fall 2026.", message_ru: "Отчёт об оценках за осень 2026 сформирован.", type: "info", read: false, date: new Date().toISOString() },
      { id: 8, message_en: "Attendance statistics updated.", message_ru: "Статистика посещаемости обновлена.", type: "info", read: true, date: new Date().toISOString() },
      { id: 9, message_en: "System backup completed successfully.", message_ru: "Резервное копирование системы завершено успешно.", type: "success", read: true, date: new Date().toISOString() },
      { id: 10, message_en: "2 new students enrolled this week.", message_ru: "2 новых студента зачислены на этой неделе.", type: "success", read: false, date: new Date().toISOString() },
      { id: 11, message_en: "Reminder: submit mid-term grades by Friday.", message_ru: "Напоминание: сдайте промежуточные оценки до пятницы.", type: "warning", read: false, date: new Date().toISOString() },
    ];

    this._set(DB_KEYS.USERS, users);
    this._set(DB_KEYS.TEACHERS, teachers);
    this._set(DB_KEYS.COURSES, courses);
    this._set(DB_KEYS.STUDENTS, students);
    this._set(DB_KEYS.ENROLLMENTS, enrollments);
    this._set(DB_KEYS.GRADES, grades);
    this._set(DB_KEYS.ATTENDANCE, attendance);
    this._set(DB_KEYS.NOTIFICATIONS, notifications);
    localStorage.setItem(DB_KEYS.SEEDED, "true");
  },
};
