-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `section` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `archived_users`
  ADD COLUMN `section` VARCHAR(191) NULL;
