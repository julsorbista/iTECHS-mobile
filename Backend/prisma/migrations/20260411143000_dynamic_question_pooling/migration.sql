-- CreateTable
CREATE TABLE `dynamic_question_variants` (
  `id` VARCHAR(191) NOT NULL,
  `cacheScope` VARCHAR(191) NOT NULL,
  `gameType` ENUM('GAME_ONE', 'GAME_TWO', 'GAME_THREE') NOT NULL DEFAULT 'GAME_ONE',
  `requestFingerprint` VARCHAR(191) NOT NULL,
  `variantFingerprint` VARCHAR(191) NOT NULL,
  `questionsById` JSON NOT NULL,
  `expiresAt` DATETIME(3) NULL,
  `staleAt` DATETIME(3) NULL,
  `lastAssignedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dynamic_question_assignments` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `levelId` VARCHAR(191) NULL,
  `cacheScope` VARCHAR(191) NOT NULL,
  `gameType` ENUM('GAME_ONE', 'GAME_TWO', 'GAME_THREE') NOT NULL DEFAULT 'GAME_ONE',
  `requestFingerprint` VARCHAR(191) NOT NULL,
  `loginSessionKey` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `dqv_scope_game_fp_variant_fp_key` ON `dynamic_question_variants`(`cacheScope`, `gameType`, `requestFingerprint`, `variantFingerprint`);

-- CreateIndex
CREATE INDEX `dqv_scope_game_fp_stale_expires_idx` ON `dynamic_question_variants`(`cacheScope`, `gameType`, `requestFingerprint`, `staleAt`, `expiresAt`);

-- CreateIndex
CREATE INDEX `dqv_expires_idx` ON `dynamic_question_variants`(`expiresAt`);

-- CreateIndex
CREATE UNIQUE INDEX `dqa_student_scope_game_fp_login_key` ON `dynamic_question_assignments`(`studentId`, `cacheScope`, `gameType`, `requestFingerprint`, `loginSessionKey`);

-- CreateIndex
CREATE INDEX `dqa_student_scope_game_fp_assigned_idx` ON `dynamic_question_assignments`(`studentId`, `cacheScope`, `gameType`, `requestFingerprint`, `assignedAt`);

-- CreateIndex
CREATE INDEX `dqa_variant_idx` ON `dynamic_question_assignments`(`variantId`);

-- CreateIndex
CREATE INDEX `dqa_expires_idx` ON `dynamic_question_assignments`(`expiresAt`);

-- AddForeignKey
ALTER TABLE `dynamic_question_assignments` ADD CONSTRAINT `dynamic_question_assignments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynamic_question_assignments` ADD CONSTRAINT `dynamic_question_assignments_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `level_definitions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynamic_question_assignments` ADD CONSTRAINT `dynamic_question_assignments_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `dynamic_question_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
