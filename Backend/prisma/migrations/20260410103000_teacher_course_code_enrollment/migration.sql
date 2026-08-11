-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `courseCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_courseCode_key` ON `users`(`courseCode`);
