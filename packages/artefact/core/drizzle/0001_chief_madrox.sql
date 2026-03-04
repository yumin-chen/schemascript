PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artefacts` (
	`pathname` text NOT NULL,
	`mode` integer NOT NULL,
	`digest` text NOT NULL,
	`modified_at` integer DEFAULT 'now' NOT NULL,
	`created_at` integer DEFAULT 'now' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_artefacts`("pathname", "mode", "digest", "modified_at", "created_at") SELECT "pathname", "mode", "digest", "modified_at", "created_at" FROM `artefacts`;--> statement-breakpoint
DROP TABLE `artefacts`;--> statement-breakpoint
ALTER TABLE `__new_artefacts` RENAME TO `artefacts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `artefacts_pathname_unique` ON `artefacts` (`pathname`);--> statement-breakpoint
CREATE UNIQUE INDEX `artefacts_digest_unique` ON `artefacts` (`digest`);