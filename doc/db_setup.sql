CREATE TABLE `cse442_2025_fall_team_ai_db`.`users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('student', 'ta', 'professor') NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE (`email`)
) ENGINE=InnoDB;


CREATE TABLE `cse442_2025_fall_team_ai_db`.`courses` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `term` ENUM('Fall','Winter','Spring','Summer') NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE `enrollments` (
    `user_id` INT UNSIGNED NOT NULL,
    `course_id` INT UNSIGNED NOT NULL,
    `role_in_course` ENUM('student','ta','professor') NOT NULL,
    PRIMARY KEY (`user_id`, `course_id`),
    KEY `course_id` (`course_id`),
    CONSTRAINT `enrollments_ibfk_1`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `enrollments_ibfk_2`
        FOREIGN KEY (`course_id`)
        REFERENCES `courses` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4

-- Run these commands in phpMyAdmin (in order):
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL;
ALTER TABLE `courses` DROP `term`;
ALTER TABLE `courses` DROP `year`;
ALTER TABLE `courses` ADD `lecture_times` VARCHAR(32) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL AFTER `title`;
ALTER TABLE `courses` ADD `room` VARCHAR(32) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL AFTER `lecture_times`;
ALTER TABLE `courses` ADD `professor` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL AFTER `room`;

CREATE TABLE favorites (
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 1) table (server stores numeric courses.id)
CREATE TABLE IF NOT EXISTS queue_entries (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id  INT UNSIGNED NOT NULL,    -- references courses.id
  user_email VARCHAR(191) NOT NULL,
    attendance ENUM('present','absent') NULL,
  notes      VARCHAR(191) NULL,
  joined_at  DATETIME NOT NULL,
  left_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_course_user (course_id, user_email),  -- one row per (course,user)
  KEY idx_queue_active (course_id, left_at, joined_at),
  KEY idx_queue_user   (course_id, user_email, left_at),
  CONSTRAINT fk_queue_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE users
  ADD COLUMN preferred_name VARCHAR(100) NULL AFTER name,
  ADD COLUMN pronouns VARCHAR(50)  NULL AFTER preferred_name,
  ADD COLUMN academic_year ENUM('Freshman','Sophomore','Junior','Senior') 
   NULL AFTER pronouns,
  ADD COLUMN major VARCHAR(100)  NULL AFTER academic_year,
  ADD COLUMN title VARCHAR(100)  NULL AFTER major,
  ADD COLUMN title_display_order TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER title,
  ADD COLUMN session_token VARCHAR(64)  NULL AFTER password_hash;

-- Office Hours Sessions Table
CREATE TABLE `office_hours_sessions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `course_id` INT UNSIGNED NOT NULL,
    `day_of_week` ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `instructor_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `course_id` (`course_id`),
    KEY `instructor_id` (`instructor_id`),
    KEY `day_time` (`day_of_week`, `start_time`),
    CONSTRAINT `office_hours_sessions_ibfk_1`
        FOREIGN KEY (`course_id`)
        REFERENCES `courses` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `office_hours_sessions_ibfk_2`
        FOREIGN KEY (`instructor_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NULL,
  type ENUM('queue_absent') NOT NULL,
  message VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read TINYINT(1) DEFAULT 0,
  INDEX (user_id, is_read)
);
-- Create the table used by /api/user_notifications.php and Dashboard banner
CREATE TABLE IF NOT EXISTS `user_notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_email` VARCHAR(255) NOT NULL,
  `notif_type` VARCHAR(64)  NOT NULL,           -- e.g., 'absent_removed'
  `message`    VARCHAR(512) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `seen`       TINYINT(1)   NOT NULL DEFAULT 0, -- 0 = unseen, 1 = dismissed
  PRIMARY KEY (`id`),
  KEY `idx_user_seen` (`user_email`, `seen`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Generic per-user notifications table (unused by the current banner)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_email` VARCHAR(255) NOT NULL,
  `course_id`  INT UNSIGNED     DEFAULT NULL,
  `type`       VARCHAR(64)  NOT NULL,           -- e.g., 'absent', 'system', etc.
  `message`    VARCHAR(512) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_email`, `is_read`),
  KEY `idx_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
                                                                              --|||
-- Add attendance column if it doesn't exist yet. you can copy this all at once VVV
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'queue_entries'
    AND COLUMN_NAME = 'attendance'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `queue_entries` ADD COLUMN `attendance` ENUM(''present'',''absent'') NULL DEFAULT NULL AFTER `user_email`',
  'SELECT "attendance already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Helpful indexes (safe to run; guard each with a check)
SET @idx1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='queue_entries' AND INDEX_NAME='idx_session_user');
SET @sql := IF(@idx1=0, 'ALTER TABLE `queue_entries` ADD INDEX `idx_session_user` (`session_id`,`user_email`)', 'SELECT "idx_session_user exists"');
PREPARE s1 FROM @sql; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @idx2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='queue_entries' AND INDEX_NAME='idx_course_user');
SET @sql := IF(@idx2=0, 'ALTER TABLE `queue_entries` ADD INDEX `idx_course_user` (`course_id`,`user_email`)', 'SELECT "idx_course_user exists"');
PREPARE s2 FROM @sql; EXECUTE s2; DEALLOCATE PREPARE s2;
-- you can copy this all at once^^^


-- Migration: Add attendance column to queue_entries (if not already present)
ALTER TABLE queue_entries ADD COLUMN attendance ENUM('present','absent') NULL AFTER user_email;

-- If you want to enable session-specific queues (recommended for per-session join/view), run the following migration:
ALTER TABLE queue_entries ADD COLUMN session_id INT UNSIGNED NULL AFTER course_id;
ALTER TABLE queue_entries ADD KEY idx_session (session_id, left_at, joined_at);
ALTER TABLE queue_entries ADD CONSTRAINT fk_queue_session FOREIGN KEY (session_id) REFERENCES office_hours_sessions(id) ON DELETE SET NULL;

-- Note: after adding the columns, the APIs will accept and use `session_id` and `attendance` when provided. Without these columns, behavior will fail.

-- Run these one by one to update roles in db --
SHOW COLUMNS FROM users LIKE 'role';

ALTER TABLE users
  MODIFY role ENUM('student','ta','professor','instructor') NOT NULL;

UPDATE users SET role='professor' WHERE role='instructor';

ALTER TABLE users
  MODIFY role ENUM('student','ta','professor') NOT NULL;
-- Drop professor column from courses table
ALTER TABLE `courses` DROP COLUMN `professor`;
