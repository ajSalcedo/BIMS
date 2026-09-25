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
    username VARCHAR(80) NOT NULL UNIQUE,
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
    sex ENUM('Male', 'Female', 'Other', 'Prefer not to say') NOT NULL,
    civil_status ENUM('Single', 'Married', 'Widowed', 'Separated', 'Other') NOT NULL,
    place_of_birth VARCHAR(150) NULL,
    nationality VARCHAR(80) NULL DEFAULT 'Filipino',
    religion VARCHAR(100) NULL,
    address VARCHAR(255) NOT NULL,
    purok VARCHAR(100) NOT NULL,
    contact_number VARCHAR(30) NULL,
    years_of_residency DECIMAL(5,2) NULL,
    employment_status VARCHAR(80) NULL,
    occupation VARCHAR(100) NULL,
    educational_attainment VARCHAR(120) NULL,
    blood_type VARCHAR(10) NULL,
    disability_status VARCHAR(150) NULL,
    voter_status ENUM('Registered', 'Not Registered', 'Unknown') NOT NULL DEFAULT 'Unknown',
    relationship_to_head VARCHAR(80) NULL,
    emergency_contact VARCHAR(150) NULL,
    emergency_contact_number VARCHAR(30) NULL,
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
    INDEX idx_resident_contact (contact_number),
    INDEX idx_resident_address (address),
    INDEX idx_resident_purok (purok)
) ENGINE=InnoDB;

ALTER TABLE households
    ADD CONSTRAINT fk_household_head
    FOREIGN KEY (household_head_id) REFERENCES resident_profiles(resident_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS admin_users (
    admin_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'Staff') NOT NULL DEFAULT 'Staff',
    account_status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
