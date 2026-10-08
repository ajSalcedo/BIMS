USE bims;

CREATE TABLE IF NOT EXISTS community_concerns (
    concern_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(30) NOT NULL UNIQUE,
    resident_id INT UNSIGNED NOT NULL,
    category ENUM('Peace and Order','Sanitation','Infrastructure','Environment','Utilities','Other') NOT NULL,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    urgency ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
    status ENUM('Submitted','Under Review','In Progress','Resolved','Rejected') NOT NULL DEFAULT 'Submitted',
    assigned_to INT UNSIGNED NULL,
    remarks VARCHAR(500) NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    CONSTRAINT fk_concern_resident FOREIGN KEY (resident_id) REFERENCES resident_profiles(resident_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_concern_admin FOREIGN KEY (assigned_to) REFERENCES admin_users(admin_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_concern_resident (resident_id),
    INDEX idx_concern_category (category),
    INDEX idx_concern_status (status),
    INDEX idx_concern_submitted (submitted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS concern_status_history (
    history_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concern_id INT UNSIGNED NOT NULL,
    status ENUM('Submitted','Under Review','In Progress','Resolved','Rejected') NOT NULL,
    remarks VARCHAR(500) NULL,
    changed_by INT UNSIGNED NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_concern_history_concern FOREIGN KEY (concern_id) REFERENCES community_concerns(concern_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_concern_history_admin FOREIGN KEY (changed_by) REFERENCES admin_users(admin_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_concern_history (concern_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS concern_notifications (
    notification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resident_id INT UNSIGNED NOT NULL,
    concern_id INT UNSIGNED NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_concern_notification_resident FOREIGN KEY (resident_id) REFERENCES resident_profiles(resident_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_concern_notification_concern FOREIGN KEY (concern_id) REFERENCES community_concerns(concern_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_concern_notification_resident (resident_id, is_read, created_at)
) ENGINE=InnoDB;
