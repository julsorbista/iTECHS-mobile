ALTER TABLE `exams`
    ADD COLUMN `passingScore` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `shuffleQuestions` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showResultsToStudents` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `learningMaterialId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `exams_learningMaterialId_key` ON `exams`(`learningMaterialId`);

ALTER TABLE `exams`
    ADD CONSTRAINT `exams_learningMaterialId_fkey`
    FOREIGN KEY (`learningMaterialId`) REFERENCES `learning_materials`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
