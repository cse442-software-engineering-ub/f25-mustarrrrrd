-- 1. Safely Update the Role ENUM
-- We explicitly set the column to accept 'admin' alongside existing roles.
ALTER TABLE `users` 
  MODIFY COLUMN `role` ENUM('student','ta','professor','admin') NOT NULL;

-- 2. Create Audit Log Table
-- I renamed the constraint to avoid conflicts with previous failed attempts
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_user_id` INT UNSIGNED NOT NULL,
  `action_type` VARCHAR(64) NOT NULL,
  `target_type` VARCHAR(64) NOT NULL COMMENT 'user, course, enrollment, etc.',
  `target_id` INT UNSIGNED NULL COMMENT 'ID of affected record',
  `details` TEXT NULL COMMENT 'JSON with action details',
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_user` (`admin_user_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_admin`
    FOREIGN KEY (`admin_user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add Activity Columns to Users
-- Removed 'AFTER' clauses to prevent errors if reference columns are missing.
-- We use a simple procedure to avoid "Duplicate Column" errors if you ran this twice.
SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'is_active'
);

SET @sql := IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1, ADD COLUMN `deactivated_at` DATETIME NULL, ADD INDEX `idx_active` (`is_active`)',
    'SELECT "Columns already exist, skipping..."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Add Indexes for Analytics
-- Wrapped in try-catch logic (ignoring errors if indexes exist is standard via duplicate check)
SET @idx_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND INDEX_NAME = 'idx_role_created'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE `users` ADD INDEX `idx_role_created` (`role`, `created_at`)', 'SELECT "idx_role_created exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'enrollments' 
    AND INDEX_NAME = 'idx_course_role'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE `enrollments` ADD INDEX `idx_course_role` (`course_id`, `role_in_course`)', 'SELECT "idx_course_role exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. System Settings Table
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  PRIMARY KEY (`setting_key`),
  CONSTRAINT `fk_system_settings_updater`
    FOREIGN KEY (`updated_by`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('maintenance_mode', '0'),
  ('max_queue_size', '50'),
  ('allow_signups', '1')
ON DUPLICATE KEY UPDATE setting_key = setting_key;