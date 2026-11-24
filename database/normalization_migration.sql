USE bims;

DROP TRIGGER IF EXISTS sync_resident_contact_after_insert;
DROP TRIGGER IF EXISTS sync_resident_contact_after_update;
DROP TRIGGER IF EXISTS sync_resident_contact_after_delete;

SET @has_resident_contact := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'bims'
      AND TABLE_NAME = 'resident_users'
      AND COLUMN_NAME = 'contact_number'
);
SET @sql := IF(@has_resident_contact > 0,
    'ALTER TABLE resident_users DROP INDEX idx_resident_user_contact',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_resident_contact > 0,
    'ALTER TABLE resident_users DROP COLUMN contact_number',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_full_name := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'bims'
      AND TABLE_NAME = 'admin_users'
      AND COLUMN_NAME = 'full_name'
);

SET @sql := IF(@has_full_name > 0,
    'UPDATE admin_users SET
        first_name = COALESCE(NULLIF(TRIM(first_name), ''''), NULLIF(TRIM(SUBSTRING_INDEX(full_name, '' '', 1)), ''''), ''Unknown''),
        last_name = COALESCE(NULLIF(TRIM(last_name), ''''),
            NULLIF(TRIM(SUBSTRING(full_name, LOCATE('' '', full_name) + 1)), ''''),
            ''Unknown'')',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_full_name > 0,
    'ALTER TABLE admin_users DROP COLUMN full_name',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE admin_users
    MODIFY first_name VARCHAR(75) NOT NULL,
    MODIFY last_name VARCHAR(75) NOT NULL;

CREATE TABLE IF NOT EXISTS service_types (
    service_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

INSERT INTO service_types (name, fee) VALUES
    ('Certificate of Residency', 50.00),
    ('Barangay Clearance', 100.00),
    ('Certificate of Indigency', 0.00),
    ('Barangay Certificate', 50.00),
    ('Other', 0.00)
ON DUPLICATE KEY UPDATE fee = VALUES(fee);

SET @has_service_type_id := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'bims'
      AND TABLE_NAME = 'service_requests'
      AND COLUMN_NAME = 'service_type_id'
);

SET @sql := IF(@has_service_type_id = 0,
    'ALTER TABLE service_requests ADD COLUMN service_type_id INT UNSIGNED NULL AFTER resident_id',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_service_type_column := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'bims'
      AND TABLE_NAME = 'service_requests'
      AND COLUMN_NAME = 'service_type'
);

SET @sql := IF(@has_service_type_column > 0,
    'UPDATE service_requests sr
     JOIN service_types st ON st.name = sr.service_type
     SET sr.service_type_id = st.service_type_id
     WHERE sr.service_type_id IS NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE service_requests
    MODIFY service_type_id INT UNSIGNED NOT NULL;

SET @sql := IF(@has_service_type_column > 0,
    'ALTER TABLE service_requests DROP COLUMN service_type',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_service_type_fk := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'bims'
      AND TABLE_NAME = 'service_requests'
      AND CONSTRAINT_NAME = 'fk_request_service_type'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql := IF(@has_service_type_fk = 0,
    'ALTER TABLE service_requests
     ADD CONSTRAINT fk_request_service_type
     FOREIGN KEY (service_type_id) REFERENCES service_types(service_type_id)
     ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
