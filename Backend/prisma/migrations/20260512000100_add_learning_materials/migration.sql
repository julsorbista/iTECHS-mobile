CREATE TABLE `learning_materials` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `materialType` ENUM('PDF', 'VIDEO') NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `originalFileName` VARCHAR(191) NOT NULL,
    `storedFileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `learning_materials_storedFileName_key`(`storedFileName`),
    INDEX `learning_materials_teacher_section_created_idx`(`teacherId`, `section`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `learning_materials`
    ADD CONSTRAINT `learning_materials_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
