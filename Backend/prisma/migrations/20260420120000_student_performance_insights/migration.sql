-- CreateTable
CREATE TABLE `student_performance_insights` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `strengths` JSON NOT NULL,
    `weaknesses` JSON NOT NULL,
    `recommendedAction` TEXT NOT NULL,
    `sourceSnapshot` JSON NOT NULL,
    `model` VARCHAR(191) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_performance_insights_teacherId_studentId_key`(`teacherId`, `studentId`),
    INDEX `student_performance_insights_studentId_updatedAt_idx`(`studentId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_performance_insights`
    ADD CONSTRAINT `student_performance_insights_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_performance_insights`
    ADD CONSTRAINT `student_performance_insights_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
