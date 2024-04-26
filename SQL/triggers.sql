CREATE TABLE audit_log (
    ->     id INT AUTO_INCREMENT PRIMARY KEY,
    ->     tableName VARCHAR(64),
    ->     fieldName VARCHAR(64),
    ->     oldValue VARCHAR(255),
    ->     newValue VARCHAR(255),
    ->     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    -> );


DELIMITER $$

CREATE TRIGGER BeforePropertiesUpdate
AFTER UPDATE ON Properties
FOR EACH ROW
BEGIN
    IF OLD.price <> NEW.price THEN
        -- Insert record into audit_log table
        INSERT INTO audit_log (tableName, fieldName, oldValue, newValue, timestamp)
        VALUES ('Properties', 'price', OLD.price, NEW.price,NOW());
    END IF;
END $$
DELIMITER;

––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

DELIMITER //

CREATE TRIGGER after_property_delete
AFTER DELETE ON Properties
FOR EACH ROW
BEGIN
  DELETE FROM addresses WHERE PropertyId = OLD.PropertyId;
END;

//
DELIMITER ;
