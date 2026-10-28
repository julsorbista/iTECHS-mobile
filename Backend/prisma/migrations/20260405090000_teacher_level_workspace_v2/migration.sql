-- CreateTable
CREATE TABLE `teacher_level_workspaces` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `gameType` ENUM('GAME_ONE', 'GAME_TWO', 'GAME_THREE') NOT NULL DEFAULT 'GAME_ONE',
    `levelNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teacher_level_workspaces_teacherId_gameType_levelNumber_key`(`teacherId`, `gameType`, `levelNumber`),
    INDEX `teacher_level_workspaces_teacherId_updatedAt_idx`(`teacherId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_level_versions` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `versionNumber` INTEGER NOT NULL,
    `payload` JSON NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `teacher_level_versions_workspaceId_state_versionNumber_key`(`workspaceId`, `state`, `versionNumber`),
    INDEX `teacher_level_versions_workspaceId_state_createdAt_idx`(`workspaceId`, `state`, `createdAt`),
    INDEX `teacher_level_versions_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `teacher_level_workspaces`
    ADD CONSTRAINT `teacher_level_workspaces_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_level_versions`
    ADD CONSTRAINT `teacher_level_versions_workspaceId_fkey`
    FOREIGN KEY (`workspaceId`) REFERENCES `teacher_level_workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_level_versions`
    ADD CONSTRAINT `teacher_level_versions_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed workspace rows from existing teacher_level_records entries.
INSERT INTO `teacher_level_workspaces` (`id`, `teacherId`, `gameType`, `levelNumber`, `title`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('tlw_', REPLACE(UUID(), '-', '')),
    `legacy`.`teacherId`,
    'GAME_ONE',
    `legacy`.`levelNumber`,
    CONCAT('Level ', `legacy`.`levelNumber`),
    COALESCE(`legacy`.`createdAt`, NOW(3)),
    COALESCE(`legacy`.`updatedAt`, NOW(3))
FROM `teacher_level_records` AS `legacy`
LEFT JOIN `teacher_level_workspaces` AS `workspace`
    ON `workspace`.`teacherId` = `legacy`.`teacherId`
   AND `workspace`.`gameType` = 'GAME_ONE'
   AND `workspace`.`levelNumber` = `legacy`.`levelNumber`
WHERE `workspace`.`id` IS NULL;

-- Seed initial draft versions for migrated legacy records.
INSERT INTO `teacher_level_versions` (`id`, `workspaceId`, `state`, `versionNumber`, `payload`, `createdByUserId`, `createdAt`)
SELECT
    CONCAT('tlv_', REPLACE(UUID(), '-', '')),
    `workspace`.`id`,
    'DRAFT',
    1,
    JSON_OBJECT(
      'schemaVersion',
      1,
      'grid',
      JSON_OBJECT('rows', `legacy`.`gridRows`, 'cols', `legacy`.`gridCols`),
      'roomChunkData',
      `legacy`.`cellBackgrounds`
    ),
    `workspace`.`teacherId`,
    COALESCE(`legacy`.`updatedAt`, NOW(3))
FROM `teacher_level_records` AS `legacy`
INNER JOIN `teacher_level_workspaces` AS `workspace`
    ON `workspace`.`teacherId` = `legacy`.`teacherId`
   AND `workspace`.`gameType` = 'GAME_ONE'
   AND `workspace`.`levelNumber` = `legacy`.`levelNumber`
LEFT JOIN `teacher_level_versions` AS `version`
    ON `version`.`workspaceId` = `workspace`.`id`
   AND `version`.`state` = 'DRAFT'
WHERE `version`.`id` IS NULL;

-- Keep workspace updatedAt aligned with the latest draft snapshot.
UPDATE `teacher_level_workspaces` AS `workspace`
INNER JOIN (
    SELECT `workspaceId`, MAX(`createdAt`) AS `latestDraftAt`
    FROM `teacher_level_versions`
    WHERE `state` = 'DRAFT'
    GROUP BY `workspaceId`
) AS `latest`
    ON `latest`.`workspaceId` = `workspace`.`id`
SET `workspace`.`updatedAt` = GREATEST(`workspace`.`updatedAt`, `latest`.`latestDraftAt`);
