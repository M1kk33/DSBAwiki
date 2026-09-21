CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`study_year` integer NOT NULL,
	`academic_year` text NOT NULL,
	`modules` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'Core' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`source_exists` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_courses_year` ON `courses` (`academic_year`,`study_year`);--> statement-breakpoint
CREATE TABLE `editors` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`topic` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`format` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`attribution` text DEFAULT '' NOT NULL,
	`rights_confirmed` integer DEFAULT 0 NOT NULL,
	`file_key` text DEFAULT '' NOT NULL,
	`filename` text DEFAULT '' NOT NULL,
	`mime` text DEFAULT '' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`modules` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_resources_course_status` ON `resources` (`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_resources_status_updated` ON `resources` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
