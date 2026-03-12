CREATE TABLE `test_table_identifier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_table_identifier_code_unique` ON `test_table_identifier` (`code`);