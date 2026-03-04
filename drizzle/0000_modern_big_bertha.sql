CREATE TABLE `artefacts` (
	`pathname` text NOT NULL,
	`mode` integer NOT NULL,
	`digest` text NOT NULL,
	`modified_at` integer DEFAULT 'now' NOT NULL,
	`created_at` integer DEFAULT 'now' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artefacts_pathname_unique` ON `artefacts` (`pathname`);--> statement-breakpoint
CREATE UNIQUE INDEX `artefacts_digest_unique` ON `artefacts` (`digest`);