CREATE DATABASE IF NOT EXISTS bims
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bims;

CREATE TABLE IF NOT EXISTS households (
    household_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    household_number VARCHAR(30) NOT NULL UNIQUE,
    household_address VARCHAR(255) NOT NULL,
    purok VARCHAR(100) NOT NULL,
    household_head_id INT UNSIGNED NULL,
    date_registered TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    INDEX idx_household_address (household_address),
    INDEX idx_household_purok (purok)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resident_users (
    resident_user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    account_status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resident_profiles (
    resident_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resident_user_id INT UNSIGNED NULL UNIQUE,
    household_id INT UNSIGNED NULL,
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80) NULL,
    last_name VARCHAR(80) NOT NULL,
    suffix VARCHAR(20) NULL,
    birth_date DATE NOT NULL,
    sex ENUM('Male', 'Female', 'Other', 'Prefer not to say') NULL,
    civil_status ENUM('Single', 'Married', 'Widowed', 'Separated', 'Other') NULL,
    place_of_birth VARCHAR(150) NULL,
    citizenship VARCHAR(100) NOT NULL DEFAULT 'Filipino',
    religion VARCHAR(100) NULL,
    address VARCHAR(255) NOT NULL,
    purok VARCHAR(100) NOT NULL,
    contact_number VARCHAR(30) NULL,
    preferred_notification ENUM('SMS', 'Email', 'Both') NULL,
    years_of_residency DECIMAL(5,2) NULL,
    permanent_region VARCHAR(100) NULL,
    permanent_province VARCHAR(100) NULL,
    permanent_city_municipality VARCHAR(100) NULL,
    permanent_barangay VARCHAR(100) NULL,
    permanent_purok VARCHAR(100) NULL,
    permanent_street VARCHAR(150) NULL,
    permanent_house_number VARCHAR(50) NULL,
    permanent_zip_code VARCHAR(20) NULL,
    present_address_same_as_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    present_region VARCHAR(100) NULL,
    present_province VARCHAR(100) NULL,
    present_city_municipality VARCHAR(100) NULL,
    present_barangay VARCHAR(100) NULL,
    present_purok VARCHAR(100) NULL,
    present_street VARCHAR(150) NULL,
    present_house_number VARCHAR(50) NULL,
    present_zip_code VARCHAR(20) NULL,
    landmark VARCHAR(255) NULL,
    previous_address TEXT NULL,
    household_reference_number VARCHAR(30) NULL,
    reported_household_size SMALLINT UNSIGNED NULL,
    employment_status VARCHAR(80) NULL,
    occupation VARCHAR(100) NULL,
    educational_attainment VARCHAR(120) NULL,
    blood_type VARCHAR(10) NULL,
    disability_status VARCHAR(150) NULL,
    voter_status ENUM('Registered', 'Not Registered', 'Unknown') NOT NULL DEFAULT 'Unknown',
    relationship_to_head VARCHAR(80) NULL,
    emergency_contact VARCHAR(150) NULL,
    emergency_contact_number VARCHAR(30) NULL,
    privacy_consent_at DATETIME NULL,
    profile_image VARCHAR(255) NULL,
    id_document VARCHAR(255) NULL,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_resident_user
        FOREIGN KEY (resident_user_id) REFERENCES resident_users(resident_user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_resident_household
        FOREIGN KEY (household_id) REFERENCES households(household_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_resident_name (last_name, first_name),
    UNIQUE INDEX uq_resident_contact_number (contact_number),
    INDEX idx_resident_address (address),
    INDEX idx_resident_purok (purok)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resident_proof_documents (
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

ALTER TABLE households
    ADD CONSTRAINT fk_household_head
    FOREIGN KEY (household_head_id) REFERENCES resident_profiles(resident_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS admin_users (
    admin_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    email VARCHAR(150) NULL UNIQUE,
    address VARCHAR(255) NULL,
    contact_number VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'Staff') NOT NULL DEFAULT 'Staff',
    account_status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
