CREATE TABLE `test_table_array` (
	`tags` blob NOT NULL,
	`ids` blob NOT NULL,
	`flags` blob NOT NULL,
	`nodes` blob NOT NULL,
	`opt_tags` blob,
	`def_tags` blob DEFAULT '["a","b"]' NOT NULL,
	`roles` blob NOT NULL
);
