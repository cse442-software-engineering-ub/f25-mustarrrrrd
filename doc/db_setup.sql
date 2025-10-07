CREATE TABLE `cse442_2025_fall_team_ai_db`.`users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('student', 'ta', 'instructor') NOT NULL,
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
  COLLATE=utf8mb4_0900_ai_ci;

-- Run these commands in phpMyAdmin (in order):
-- ALTER TABLE `courses` DROP `term`;
-- ALTER TABLE `courses` DROP `year`;
-- ALTER TABLE `courses` ADD `lecture_times` VARCHAR(32) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL AFTER `title`;
-- ALTER TABLE `courses` ADD `room` VARCHAR(32) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL AFTER `lecture_times`;

-- ALTER TABLE `courses` ADD `professor` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL AFTER `room`;