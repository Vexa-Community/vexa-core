PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `agents_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`role` text NOT NULL,
	`instructions` text NOT NULL,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`tools` text DEFAULT '[]' NOT NULL,
	`max_iterations` integer DEFAULT 3 NOT NULL,
	`max_output_tokens` integer DEFAULT 2000 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `agents_new` SELECT * FROM `agents`;
--> statement-breakpoint
DROP TABLE `agents`;
--> statement-breakpoint
ALTER TABLE `agents_new` RENAME TO `agents`;
--> statement-breakpoint
CREATE TABLE `task_dependencies_new` (
	`task_id` text NOT NULL,
	`depends_on_task_id` text NOT NULL,
	PRIMARY KEY (`task_id`, `depends_on_task_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`depends_on_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT OR IGNORE INTO `task_dependencies_new` SELECT * FROM `task_dependencies`;
--> statement-breakpoint
DROP TABLE `task_dependencies`;
--> statement-breakpoint
ALTER TABLE `task_dependencies_new` RENAME TO `task_dependencies`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
