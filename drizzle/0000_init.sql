CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`regulation_id` text NOT NULL,
	`applicability` text NOT NULL,
	`impact_score` integer NOT NULL,
	`summary` text NOT NULL,
	`rationale` text NOT NULL,
	`obligations` text NOT NULL,
	`required_actions` text NOT NULL,
	`affected_functions` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`regulation_id`) REFERENCES `regulations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analyses_org_reg_idx` ON `analyses` (`org_id`,`regulation_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_org_created_idx` ON `audit_log` (`org_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `issue_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`user_id` text,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`recommendation` text DEFAULT '' NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`source` text NOT NULL,
	`rule_code` text,
	`regulation_id` text,
	`policy_id` text,
	`transaction_id` text,
	`assignee_id` text,
	`due_at` integer,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`regulation_id`) REFERENCES `regulations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `issues_org_status_idx` ON `issues` (`org_id`,`status`);--> statement-breakpoint
CREATE TABLE `ledger_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`filename` text NOT NULL,
	`row_count` integer NOT NULL,
	`flagged_count` integer DEFAULT 0 NOT NULL,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`industry` text DEFAULT 'Financial services' NOT NULL,
	`profile` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`control_area` text NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`last_reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `regulations` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`agency` text NOT NULL,
	`jurisdiction` text DEFAULT 'US' NOT NULL,
	`doc_type` text NOT NULL,
	`abstract` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`published_at` integer NOT NULL,
	`effective_at` integer,
	`comment_deadline` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regulations_source_ext_idx` ON `regulations` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `regulations_pub_idx` ON `regulations` (`published_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`content` text NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`upload_id` text NOT NULL,
	`reference` text NOT NULL,
	`posted_at` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`counterparty` text NOT NULL,
	`country` text DEFAULT 'US' NOT NULL,
	`account` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL,
	`flags` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`upload_id`) REFERENCES `ledger_uploads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transactions_upload_idx` ON `transactions` (`upload_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'analyst' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);