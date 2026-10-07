USE bims;

CREATE TABLE IF NOT EXISTS service_requests (
    request_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(30) NOT NULL UNIQUE,
    resident_id INT UNSIGNED NOT NULL,
    service_type ENUM('Certificate of Residency','Barangay Clearance','Certificate of Indigency','Barangay Certificate','Other') NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    copies INT UNSIGNED NOT NULL DEFAULT 1,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('Pay at Barangay Hall','Online Payment') NOT NULL DEFAULT 'Pay at Barangay Hall',
    payment_status ENUM('Unpaid','Paid','Not Required') NOT NULL DEFAULT 'Unpaid',
    status ENUM('Pending','Processing','Ready for Pickup','Completed','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
    remarks VARCHAR(500) NULL,
    processed_by INT UNSIGNED NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    CONSTRAINT fk_request_resident FOREIGN KEY (resident_id) REFERENCES resident_profiles(resident_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_request_admin FOREIGN KEY (processed_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_request_resident (resident_id),
    INDEX idx_request_status (status),
    INDEX idx_request_tracking (tracking_number),
    INDEX idx_request_submitted (submitted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_status_history (
    history_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL,
    status ENUM('Pending','Processing','Ready for Pickup','Completed','Rejected','Cancelled') NOT NULL,
    remarks VARCHAR(500) NULL,
    changed_by INT UNSIGNED NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_request FOREIGN KEY (request_id) REFERENCES service_requests(request_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_history_admin FOREIGN KEY (changed_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_history_request (request_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resident_id INT UNSIGNED NOT NULL,
    request_id INT UNSIGNED NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_resident FOREIGN KEY (resident_id) REFERENCES resident_profiles(resident_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notification_request FOREIGN KEY (request_id) REFERENCES service_requests(request_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_notification_resident (resident_id, is_read, created_at)
) ENGINE=InnoDB;
