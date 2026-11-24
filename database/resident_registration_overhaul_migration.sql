USE bims;

-- Check for duplicate non-empty contact numbers before adding the unique index:
-- SELECT contact_number, COUNT(*) AS resident_count
-- FROM resident_profiles
-- WHERE contact_number IS NOT NULL AND TRIM(contact_number) <> ''
-- GROUP BY contact_number
-- HAVING COUNT(*) > 1;
--
-- Resolve any duplicate contact numbers before running this migration.
UPDATE resident_profiles
SET contact_number = NULL
WHERE contact_number IS NOT NULL AND TRIM(contact_number) = '';

ALTER TABLE resident_profiles
    CHANGE COLUMN nationality citizenship VARCHAR(100) NOT NULL DEFAULT 'Filipino',
    MODIFY COLUMN sex ENUM('Male', 'Female', 'Other', 'Prefer not to say') NULL,
    MODIFY COLUMN civil_status ENUM('Single', 'Married', 'Widowed', 'Separated', 'Other') NULL,
    ADD COLUMN preferred_notification ENUM('SMS', 'Email', 'Both') NULL AFTER contact_number,
    ADD COLUMN permanent_region VARCHAR(100) NULL AFTER years_of_residency,
    ADD COLUMN permanent_province VARCHAR(100) NULL AFTER permanent_region,
    ADD COLUMN permanent_city_municipality VARCHAR(100) NULL AFTER permanent_province,
    ADD COLUMN permanent_barangay VARCHAR(100) NULL AFTER permanent_city_municipality,
    ADD COLUMN permanent_purok VARCHAR(100) NULL AFTER permanent_barangay,
    ADD COLUMN permanent_street VARCHAR(150) NULL AFTER permanent_purok,
    ADD COLUMN permanent_house_number VARCHAR(50) NULL AFTER permanent_street,
    ADD COLUMN permanent_zip_code VARCHAR(20) NULL AFTER permanent_house_number,
    ADD COLUMN present_address_same_as_permanent BOOLEAN NOT NULL DEFAULT FALSE AFTER permanent_zip_code,
    ADD COLUMN present_region VARCHAR(100) NULL AFTER present_address_same_as_permanent,
    ADD COLUMN present_province VARCHAR(100) NULL AFTER present_region,
    ADD COLUMN present_city_municipality VARCHAR(100) NULL AFTER present_province,
    ADD COLUMN present_barangay VARCHAR(100) NULL AFTER present_city_municipality,
    ADD COLUMN present_purok VARCHAR(100) NULL AFTER present_barangay,
    ADD COLUMN present_street VARCHAR(150) NULL AFTER present_purok,
    ADD COLUMN present_house_number VARCHAR(50) NULL AFTER present_street,
    ADD COLUMN present_zip_code VARCHAR(20) NULL AFTER present_house_number,
    ADD COLUMN landmark VARCHAR(255) NULL AFTER present_zip_code,
    ADD COLUMN previous_address TEXT NULL AFTER landmark,
    ADD COLUMN household_reference_number VARCHAR(30) NULL AFTER previous_address,
    ADD COLUMN reported_household_size SMALLINT UNSIGNED NULL AFTER household_reference_number,
    ADD COLUMN privacy_consent_at DATETIME NULL AFTER emergency_contact_number,
    ADD UNIQUE INDEX uq_resident_contact_number (contact_number);

CREATE TABLE resident_proof_documents (
    document_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resident_id INT UNSIGNED NOT NULL UNIQUE,
    document_type VARCHAR(80) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type ENUM('image/jpeg', 'image/png', 'application/pdf') NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    file_data LONGBLOB NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_proof_document_resident
        FOREIGN KEY (resident_id) REFERENCES resident_profiles(resident_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
