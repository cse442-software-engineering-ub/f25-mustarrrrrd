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
  id         INT NOT NULL AUTO_INCREMENT,
  course_id  INT NOT NULL,             -- references courses.id
  user_email VARCHAR(191) NOT NULL,
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
  ADD COLUMN disabilities TEXT NULL AFTER major,
  ADD COLUMN title VARCHAR(100)  NULL AFTER disabilities,
  ADD COLUMN title_display_order TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER title,
  ADD COLUMN session_token VARCHAR(64)  NULL AFTER password_hash;
