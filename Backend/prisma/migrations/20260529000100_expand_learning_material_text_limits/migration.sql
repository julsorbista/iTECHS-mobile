ALTER TABLE `learning_materials`
    MODIFY `section` VARCHAR(255) NOT NULL,
    MODIFY `subject` TEXT NULL,
    MODIFY `title` TEXT NOT NULL,
    MODIFY `description` LONGTEXT NULL,
    MODIFY `mimeType` VARCHAR(255) NOT NULL,
    MODIFY `originalFileName` TEXT NOT NULL,
    MODIFY `storedFileName` VARCHAR(255) NOT NULL,
    MODIFY `previewText` LONGTEXT NULL;
