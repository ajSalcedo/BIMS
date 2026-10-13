USE bims;

ALTER TABLE resident_users
    ADD COLUMN contact_number VARCHAR(30) NULL AFTER email,
    ADD INDEX idx_resident_user_contact (contact_number);

UPDATE resident_users ru
JOIN resident_profiles rp ON rp.resident_user_id = ru.resident_user_id
SET ru.contact_number = rp.contact_number;

DELIMITER //
CREATE TRIGGER sync_resident_contact_after_insert
AFTER INSERT ON resident_profiles
FOR EACH ROW
BEGIN
    UPDATE resident_users
    SET contact_number = NEW.contact_number
    WHERE resident_user_id = NEW.resident_user_id;
END//

CREATE TRIGGER sync_resident_contact_after_update
AFTER UPDATE ON resident_profiles
FOR EACH ROW
BEGIN
    IF OLD.resident_user_id IS NOT NULL
       AND NOT (OLD.resident_user_id <=> NEW.resident_user_id) THEN
        UPDATE resident_users
        SET contact_number = NULL
        WHERE resident_user_id = OLD.resident_user_id;
    END IF;

    UPDATE resident_users
    SET contact_number = NEW.contact_number
    WHERE resident_user_id = NEW.resident_user_id;
END//

CREATE TRIGGER sync_resident_contact_after_delete
AFTER DELETE ON resident_profiles
FOR EACH ROW
BEGIN
    UPDATE resident_users
    SET contact_number = NULL
    WHERE resident_user_id = OLD.resident_user_id;
END//
DELIMITER ;
