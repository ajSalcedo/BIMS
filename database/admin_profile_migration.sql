ALTER TABLE admin_users
    ADD COLUMN first_name VARCHAR(75) NULL AFTER full_name,
    ADD COLUMN last_name VARCHAR(75) NULL AFTER first_name,
    ADD COLUMN address VARCHAR(255) NULL AFTER email,
    ADD COLUMN contact_number VARCHAR(30) NULL AFTER address;
