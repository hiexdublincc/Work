DROP INDEX `companies_property_idx` ON `companies`;--> statement-breakpoint
DROP INDEX `contacts_property_idx` ON `contacts`;--> statement-breakpoint
UPDATE `activities` SET `type` = 'note' WHERE `type` = 'task';--> statement-breakpoint
ALTER TABLE `achievements` MODIFY COLUMN `status` enum('Confirmed','Tentative','RFP accepted','Declined','Contracted','Proposal sent','On option') NOT NULL DEFAULT 'Confirmed';--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `type` enum('note','call','meeting') NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `subtype` enum('General','Call made','Email sent','Meeting held','Appointment booked','Site visit/showaround','Webinar attended','Sales trip','Event attended','Follow-up completed','Proposal sent','RFP received','RFP submitted','Contract signed','Achievement/win logged','Weekly update logged','Other') NOT NULL DEFAULT 'General';--> statement-breakpoint
ALTER TABLE `achievements` ADD `eventDate` date;--> statement-breakpoint
ALTER TABLE `achievements` ADD `nights` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `achievements` ADD `roomNights` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` DROP COLUMN `propertyId`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `propertyId`;