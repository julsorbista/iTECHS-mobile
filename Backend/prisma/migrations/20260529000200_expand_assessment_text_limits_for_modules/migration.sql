ALTER TABLE `exams`
    MODIFY `title` TEXT NOT NULL,
    MODIFY `description` LONGTEXT NULL;

ALTER TABLE `questions`
    MODIFY `question` LONGTEXT NOT NULL,
    MODIFY `correctAnswer` LONGTEXT NOT NULL;
