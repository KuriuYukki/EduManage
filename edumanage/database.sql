-- ============================================================================
--  EduManage — Student Management System
--  database.sql
--
--  This file is the OFFICIAL relational database design for the project.
--  It is written in standard SQL (MySQL / PostgreSQL compatible syntax with
--  minor dialect notes) and can be connected to a real backend in a
--  production version of the application.
--
--  Because the live browser demo runs with no backend, the actual working
--  copy of this data lives in localStorage (see js/storage.js). The schema,
--  relationships and constraints below mirror that data 1:1.
-- ============================================================================

-- Drop tables in dependency order (for clean re-runs)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- USERS — authentication + role assignment
-- ============================================================================
CREATE TABLE users (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- store a HASH in production, never plaintext
    full_name       VARCHAR(150) NOT NULL,
    role            ENUM('admin', 'teacher', 'student') NOT NULL,
    linked_student_id INT NULL,                     -- FK set below, nullable for admin
    linked_teacher_id INT NULL,                     -- FK set below, nullable for admin/student
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (role IN ('admin', 'teacher', 'student'))
);

-- ============================================================================
-- STUDENTS
-- ============================================================================
CREATE TABLE students (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    student_code      VARCHAR(20) NOT NULL UNIQUE,   -- e.g. S-2001
    first_name        VARCHAR(80) NOT NULL,
    last_name         VARCHAR(80) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    phone             VARCHAR(30),
    date_of_birth     DATE,
    gender            ENUM('male', 'female') NOT NULL,
    department        VARCHAR(100) NOT NULL,
    year              INT NOT NULL CHECK (year BETWEEN 1 AND 6),
    address           VARCHAR(255),
    enrollment_date   DATE NOT NULL,
    status            ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TEACHERS
-- ============================================================================
CREATE TABLE teachers (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    teacher_code    VARCHAR(20) NOT NULL UNIQUE,     -- e.g. T-1001
    first_name      VARCHAR(80) NOT NULL,
    last_name       VARCHAR(80) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(30),
    department      VARCHAR(100) NOT NULL,
    specialization  VARCHAR(150),
    status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Now that students/teachers exist, attach the deferred FKs on users
ALTER TABLE users ADD CONSTRAINT fk_users_student FOREIGN KEY (linked_student_id) REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_teacher FOREIGN KEY (linked_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- ============================================================================
-- COURSES
-- ============================================================================
CREATE TABLE courses (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    course_code     VARCHAR(20) NOT NULL UNIQUE,     -- e.g. CS101
    name            VARCHAR(150) NOT NULL,
    department      VARCHAR(100) NOT NULL,
    credits         INT NOT NULL CHECK (credits BETWEEN 1 AND 10),
    semester        VARCHAR(30) NOT NULL,
    teacher_id      INT NULL,
    capacity        INT NOT NULL CHECK (capacity > 0),
    status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- ============================================================================
-- ENROLLMENTS — students <-> courses (many-to-many)
-- ============================================================================
CREATE TABLE enrollments (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    student_id      INT NOT NULL,
    course_id       INT NOT NULL,
    enroll_date     DATE NOT NULL,
    CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE,
    CONSTRAINT uq_enrollment UNIQUE (student_id, course_id)   -- prevents duplicate enrollment
);

-- ============================================================================
-- GRADES
-- ============================================================================
CREATE TABLE grades (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    student_id      INT NOT NULL,
    course_id       INT NOT NULL,
    grade           DECIMAL(4,2) NOT NULL CHECK (grade BETWEEN 0 AND 20),
    graded_on       DATE NOT NULL,
    CONSTRAINT fk_grades_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_grades_course  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================
CREATE TABLE attendance (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    student_id      INT NOT NULL,
    course_id       INT NOT NULL,
    attendance_date DATE NOT NULL,
    status          ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_course  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE,
    CONSTRAINT uq_attendance UNIQUE (student_id, course_id, attendance_date) -- prevents duplicate record
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    message_en      VARCHAR(255) NOT NULL,
    message_ru      VARCHAR(255) NOT NULL,
    type            ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES (performance)
-- ============================================================================
CREATE INDEX idx_students_department ON students(department);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Teachers
INSERT INTO teachers (teacher_code, first_name, last_name, email, phone, department, specialization, status) VALUES
('T-1001', 'Demo', 'Teacher', 'teacher@edumanage.com', '+1-555-0100', 'Computer Science', 'Software Engineering', 'active'),
('T-1002', 'Anna', 'Ivanova', 'anna.ivanova@edumanage.com', '+1-555-0102', 'Mathematics', 'Applied Mathematics', 'active'),
('T-1003', 'Michael', 'Brown', 'michael.brown@edumanage.com', '+1-555-0103', 'Physics', 'Theoretical Physics', 'active'),
('T-1004', 'Dmitry', 'Petrov', 'dmitry.petrov@edumanage.com', '+1-555-0104', 'Business', 'Finance', 'active'),
('T-1005', 'Sarah', 'Johnson', 'sarah.johnson@edumanage.com', '+1-555-0105', 'Economics', 'Micro-economics', 'active'),
('T-1006', 'Elena', 'Sokolova', 'elena.sokolova@edumanage.com', '+1-555-0106', 'Biology', 'Genetics', 'active'),
('T-1007', 'James', 'Wilson', 'james.wilson@edumanage.com', '+1-555-0107', 'Computer Science', 'Data Science', 'active'),
('T-1008', 'Olga', 'Popova', 'olga.popova@edumanage.com', '+1-555-0108', 'Business', 'Marketing', 'active');

-- Students (sample of the 20 generated at runtime by storage.js)
INSERT INTO students (student_code, first_name, last_name, email, phone, date_of_birth, gender, department, year, address, enrollment_date, status) VALUES
('S-2001', 'Demo', 'Student', 'student@edumanage.com', '+1-555-0200', '2003-04-12', 'male', 'Computer Science', 2, '12 Campus Ave', '2024-09-01', 'active'),
('S-2002', 'Dmitry', 'Petrov', 'dmitry.petrov2@edumanage.com', '+1-555-0202', '2002-06-20', 'female', 'Mathematics', 3, '45 University St', '2023-09-01', 'active'),
('S-2003', 'John', 'Smith', 'john.smith3@edumanage.com', '+1-555-0203', '2004-01-15', 'male', 'Physics', 1, '78 University St', '2025-09-01', 'active'),
('S-2004', 'Anna', 'Ivanova', 'anna.ivanova4@edumanage.com', '+1-555-0204', '2003-11-02', 'female', 'Business', 2, '19 University St', '2024-09-01', 'active'),
('S-2005', 'Michael', 'Brown', 'michael.brown5@edumanage.com', '+1-555-0205', '2002-09-09', 'male', 'Economics', 4, '5 University St', '2022-09-01', 'inactive');

-- Courses
INSERT INTO courses (course_code, name, department, credits, semester, teacher_id, capacity, status) VALUES
('CS101', 'Introduction to Programming', 'Computer Science', 4, 'Fall 2026', 1, 30, 'active'),
('CS201', 'Data Structures & Algorithms', 'Mathematics', 4, 'Spring 2026', 2, 28, 'active'),
('MATH101', 'Calculus I', 'Physics', 3, 'Fall 2026', 3, 32, 'active'),
('MATH202', 'Linear Algebra', 'Business', 3, 'Spring 2026', 4, 25, 'active'),
('PHYS101', 'Classical Mechanics', 'Economics', 4, 'Fall 2026', 5, 30, 'active'),
('BUS150', 'Principles of Marketing', 'Biology', 3, 'Spring 2026', 6, 35, 'active'),
('ECON101', 'Microeconomics', 'Computer Science', 3, 'Fall 2026', 7, 30, 'active'),
('BIO110', 'Cell Biology', 'Business', 4, 'Spring 2026', 8, 26, 'active'),
('CS310', 'Database Systems', 'Computer Science', 5, 'Fall 2026', 1, 20, 'active'),
('BUS220', 'Financial Accounting', 'Business', 3, 'Spring 2026', 4, 30, 'active');

-- Enrollments
INSERT INTO enrollments (student_id, course_id, enroll_date) VALUES
(1, 1, '2024-09-01'), (1, 9, '2024-09-01'), (1, 3, '2024-09-01'),
(2, 2, '2023-09-01'), (2, 4, '2023-09-01'),
(3, 3, '2025-09-01'), (3, 5, '2025-09-01'),
(4, 6, '2024-09-01'), (4, 10, '2024-09-01'),
(5, 7, '2022-09-01');

-- Grades
INSERT INTO grades (student_id, course_id, grade, graded_on) VALUES
(1, 1, 17.5, '2026-02-10'), (1, 9, 14.0, '2026-03-01'), (1, 3, 11.25, '2026-03-15'),
(2, 2, 12.75, '2026-02-20'), (2, 4, 9.5, '2026-03-05'),
(3, 3, 18.0, '2026-02-14'), (3, 5, 15.25, '2026-03-10'),
(4, 6, 13.0, '2026-02-18'), (4, 10, 16.75, '2026-03-08'),
(5, 7, 8.5, '2026-02-22');

-- Attendance
INSERT INTO attendance (student_id, course_id, attendance_date, status) VALUES
(1, 1, '2026-02-01', 'present'), (1, 1, '2026-02-08', 'present'), (1, 1, '2026-02-15', 'late'),
(1, 9, '2026-02-02', 'present'), (1, 9, '2026-02-09', 'absent'),
(2, 2, '2026-02-03', 'present'), (2, 2, '2026-02-10', 'excused'),
(3, 3, '2026-02-04', 'present'), (3, 3, '2026-02-11', 'present'),
(4, 6, '2026-02-05', 'late'), (4, 6, '2026-02-12', 'present'),
(5, 7, '2026-02-06', 'absent'), (5, 7, '2026-02-13', 'absent');

-- Notifications
INSERT INTO notifications (message_en, message_ru, type, is_read) VALUES
('Welcome back, Admin!', 'С возвращением, Администратор!', 'info', FALSE),
('3 students have attendance below 70%.', '3 студента имеют посещаемость ниже 70%.', 'warning', FALSE),
('5 students have failed courses.', '5 студентов не сдали курсы.', 'error', TRUE),
('Course capacity is almost full for CS101.', 'Вместимость курса CS101 почти заполнена.', 'warning', FALSE),
('System backup completed successfully.', 'Резервное копирование системы завершено успешно.', 'success', TRUE);

-- Users (linked to the demo accounts used by the front-end)
-- NOTE: passwords below are placeholders. In production, store a salted hash
-- (bcrypt/argon2) — never plaintext, and never expose it in client-side code.
INSERT INTO users (email, password_hash, full_name, role, linked_student_id, linked_teacher_id) VALUES
('admin@edumanage.com', '<hashed:admin123>', 'Admin User', 'admin', NULL, NULL),
('teacher@edumanage.com', '<hashed:teacher123>', 'Demo Teacher', 'teacher', NULL, 1),
('student@edumanage.com', '<hashed:student123>', 'Demo Student', 'student', 1, NULL);

-- ============================================================================
-- End of database.sql
-- ============================================================================
