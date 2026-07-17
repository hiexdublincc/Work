CREATE TABLE `competitor_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorHotelName` varchar(240) NOT NULL,
	`quotedRateCents` int,
	`clientFeedback` text,
	`strengths` text,
	`weaknesses` text,
	`notes` text,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`companyId` int,
	`opportunityId` int,
	`isGroupVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `competitor_intelligence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cross_property_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`opportunityId` int,
	`referringPropertyId` int NOT NULL,
	`receivingPropertyId` int NOT NULL,
	`status` enum('New','Accepted','In Progress','Won','Lost') NOT NULL DEFAULT 'New',
	`valueCents` int NOT NULL DEFAULT 0,
	`roomNights` int NOT NULL DEFAULT 0,
	`notes` text,
	`originalOwnerId` int NOT NULL,
	`currentOwnerId` int NOT NULL,
	`createdById` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `cross_property_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_collateral` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`name` varchar(240) NOT NULL,
	`category` varchar(120),
	`description` text,
	`fileKey` varchar(500) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`mimeType` varchar(160),
	`fileSize` int,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`archivedAt` timestamp,
	CONSTRAINT `property_collateral_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`overview` text,
	`facilities` text,
	`meetingRoomCapacity` text,
	`parking` text,
	`sellingPoints` text,
	`salesContacts` text,
	`updatedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_knowledge_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_knowledge_property_unique` UNIQUE(`propertyId`)
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `contractStartDate` date;--> statement-breakpoint
ALTER TABLE `companies` ADD `contractExpiryDate` date;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `competitorHotel` varchar(240);--> statement-breakpoint
ALTER TABLE `opportunities` ADD `referralSource` varchar(240);--> statement-breakpoint
ALTER TABLE `opportunities` ADD `lostReason` enum('Lost on price','No availability','Competitor selected','Location','Facilities','Parking','Client cancelled','Budget','Timing','Other');--> statement-breakpoint
ALTER TABLE `opportunities` ADD `lossComment` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `stageAtLoss` enum('Prospecting','Qualified','Proposal','Negotiation','Closed Won','Closed Lost');--> statement-breakpoint
ALTER TABLE `opportunities` ADD `lostAt` timestamp;--> statement-breakpoint
CREATE INDEX `competitor_intel_property_idx` ON `competitor_intelligence` (`propertyId`);--> statement-breakpoint
CREATE INDEX `competitor_intel_hotel_idx` ON `competitor_intelligence` (`competitorHotelName`);--> statement-breakpoint
CREATE INDEX `competitor_intel_company_idx` ON `competitor_intelligence` (`companyId`);--> statement-breakpoint
CREATE INDEX `competitor_intel_opportunity_idx` ON `competitor_intelligence` (`opportunityId`);--> statement-breakpoint
CREATE INDEX `referrals_referring_property_idx` ON `cross_property_referrals` (`referringPropertyId`);--> statement-breakpoint
CREATE INDEX `referrals_receiving_property_idx` ON `cross_property_referrals` (`receivingPropertyId`);--> statement-breakpoint
CREATE INDEX `referrals_status_idx` ON `cross_property_referrals` (`status`);--> statement-breakpoint
CREATE INDEX `referrals_current_owner_idx` ON `cross_property_referrals` (`currentOwnerId`);--> statement-breakpoint
CREATE INDEX `property_collateral_property_idx` ON `property_collateral` (`propertyId`);