ALTER TABLE `activities` MODIFY COLUMN `entityType` enum('company','contact','lead','opportunity');--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `entityId` int;