ALTER TABLE `users`
  ADD COLUMN `academicYear` VARCHAR(191) NULL;

ALTER TABLE `archived_users`
  ADD COLUMN `academicYear` VARCHAR(191) NULL;
