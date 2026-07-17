CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`month` date NOT NULL,
	`organizationActivity` varchar(300) NOT NULL,
	`potentialValueCents` int NOT NULL DEFAULT 0,
	`averageRateCents` int NOT NULL DEFAULT 0,
	`city` varchar(120),
	`notes` text,
	`status` enum('Confirmed','RFP accepted','Declined','Contracted','Proposal sent','On option') NOT NULL DEFAULT 'Confirmed',
	`companyId` int,
	`opportunityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`brand` varchar(160) NOT NULL,
	`city` varchar(120) NOT NULL,
	`country` varchar(120) NOT NULL DEFAULT 'Ireland',
	`code` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_code_unique` UNIQUE(`code`),
	CONSTRAINT `properties_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `user_property_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`assignedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_property_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_property_unique` UNIQUE(`userId`,`propertyId`)
);
--> statement-breakpoint
CREATE TABLE `weekly_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`weekCommencing` date NOT NULL,
	`keyWins` text,
	`businessPotential` text,
	`keyActivity` text,
	`corporateUpdates` text,
	`groupUpdates` text,
	`eventTradeActivity` text,
	`completedActions` text,
	`nextWeekPriorities` text,
	`status` enum('Draft','Submitted') NOT NULL DEFAULT 'Draft',
	`isGroupVisible` boolean NOT NULL DEFAULT true,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_updates_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_update_property_week_unique` UNIQUE(`propertyId`,`weekCommencing`)
);
--> statement-breakpoint
ALTER TABLE `opportunities` MODIFY COLUMN `nextStep` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `subtype` enum('General','Call made','Email sent','Meeting held','Appointment booked','Site visit/showaround','Webinar attended','Sales trip','Event attended','Follow-up completed','Proposal sent','RFP received','RFP submitted','Contract signed','Achievement/win logged','Weekly update logged') DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `contactId` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `leadId` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `opportunityId` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `propertyId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `endsAt` timestamp;--> statement-breakpoint
ALTER TABLE `activities` ADD `reminderAt` timestamp;--> statement-breakpoint
ALTER TABLE `companies` ADD `category` enum('Corporate','Agency','Government','Tour operator','TMC','Event organiser','Crew','Extended stay','Meeting room client','Conference lead') DEFAULT 'Corporate' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `segment` varchar(160);--> statement-breakpoint
ALTER TABLE `companies` ADD `propertyId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `destinationCity` varchar(120);--> statement-breakpoint
ALTER TABLE `companies` ADD `leadSource` varchar(160);--> statement-breakpoint
ALTER TABLE `companies` ADD `preferredRateType` varchar(120);--> statement-breakpoint
ALTER TABLE `companies` ADD `productionHistory` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `potentialRoomNights` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `potentialRevenueCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `relationshipStatus` varchar(120);--> statement-breakpoint
ALTER TABLE `companies` ADD `lastActivityAt` timestamp;--> statement-breakpoint
ALTER TABLE `companies` ADD `nextFollowUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `contacts` ADD `propertyId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `relationshipStatus` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `propertyId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `businessType` enum('Corporate account','Group booking','LNR','RFP','Tour series','Crew','Long stay','Meeting room booking','Conference or event') DEFAULT 'Corporate account' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `potentialRoomNights` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `propertyId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `businessType` enum('Corporate account','Group booking','LNR','RFP','Tour series','Crew','Long stay','Meeting room booking','Conference or event') DEFAULT 'Corporate account' NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `commercialStatus` enum('New lead','Contact made','Proposal sent','RFP received','RFP submitted','On option','Contracted','Rate loaded','Live','Declined') DEFAULT 'New lead' NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `roomNights` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `adrCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `startDate` date;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `endDate` date;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `source` varchar(160);--> statement-breakpoint
ALTER TABLE `opportunities` ADD `nextActionAt` timestamp;--> statement-breakpoint
CREATE INDEX `achievements_property_idx` ON `achievements` (`propertyId`);--> statement-breakpoint
CREATE INDEX `achievements_owner_idx` ON `achievements` (`ownerId`);--> statement-breakpoint
CREATE INDEX `achievements_month_idx` ON `achievements` (`month`);--> statement-breakpoint
CREATE INDEX `user_property_user_idx` ON `user_property_assignments` (`userId`);--> statement-breakpoint
CREATE INDEX `user_property_property_idx` ON `user_property_assignments` (`propertyId`);--> statement-breakpoint
CREATE INDEX `weekly_updates_owner_idx` ON `weekly_updates` (`ownerId`);--> statement-breakpoint
CREATE INDEX `weekly_updates_week_idx` ON `weekly_updates` (`weekCommencing`);--> statement-breakpoint
CREATE INDEX `activities_property_idx` ON `activities` (`propertyId`);--> statement-breakpoint
CREATE INDEX `companies_property_idx` ON `companies` (`propertyId`);--> statement-breakpoint
CREATE INDEX `contacts_property_idx` ON `contacts` (`propertyId`);--> statement-breakpoint
CREATE INDEX `leads_property_idx` ON `leads` (`propertyId`);--> statement-breakpoint
CREATE INDEX `opportunities_property_idx` ON `opportunities` (`propertyId`);