-- ============================================================
-- Teacher Invitation System Migration
-- ============================================================

-- 1. Add teacher_type column to teachers table (safe check)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teachers' AND COLUMN_NAME = 'teacher_type');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE teachers ADD COLUMN teacher_type ENUM(''free'', ''institution'') NOT NULL DEFAULT ''institution'' AFTER institution_id',
    'SELECT ''Column teacher_type already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Create teacher_invitations table
CREATE TABLE IF NOT EXISTS teacher_invitations (
  id             VARCHAR(36) PRIMARY KEY,
  institution_id VARCHAR(36) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  first_name     VARCHAR(255) NOT NULL,
  last_name      VARCHAR(255) DEFAULT NULL,
  subject        VARCHAR(255) DEFAULT NULL,
  phone          VARCHAR(50)  DEFAULT NULL,
  token          VARCHAR(255) NOT NULL UNIQUE,
  status         ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
  expires_at     DATETIME NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 3. Indexes for performance (ignore if already exist)
CREATE INDEX idx_invitations_token ON teacher_invitations(token);
CREATE INDEX idx_invitations_email ON teacher_invitations(email);
CREATE INDEX idx_invitations_institution ON teacher_invitations(institution_id);
CREATE INDEX idx_teachers_type ON teachers(teacher_type);
