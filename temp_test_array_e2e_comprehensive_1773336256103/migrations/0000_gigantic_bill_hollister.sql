CREATE TABLE `test_table_array_e2e` (
	`tags` blob NOT NULL,
	`ids` blob NOT NULL,
	`flags` blob NOT NULL,
	`nodes` blob NOT NULL,
	`opt_tags` blob,
	`def_tags` blob DEFAULT '["x","y"]' NOT NULL,
	`roles` blob NOT NULL
);
