CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('task','call','meeting','note') NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text,
	`entityType` enum('company','contact','lead','opportunity') NOT NULL,
	`entityId` int NOT NULL,
	`ownerId` int NOT NULL,
	`createdById` int NOT NULL,
	`priority` enum('Low','Normal','High') NOT NULL DEFAULT 'Normal',
	`dueAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`legalName` varchar(240),
	`website` varchar(500),
	`email` varchar(320),
	`phone` varchar(80),
	`industry` varchar(160),
	`status` enum('Prospect','Active','Inactive') NOT NULL DEFAULT 'Prospect',
	`employeeCount` int,
	`annualRevenueCents` int,
	`addressLine1` varchar(240),
	`addressLine2` varchar(240),
	`city` varchar(120),
	`region` varchar(120),
	`postalCode` varchar(40),
	`country` varchar(120),
	`description` text,
	`notes` text,
	`ownerId` int NOT NULL,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`preferredName` varchar(120),
	`email` varchar(320),
	`phone` varchar(80),
	`mobile` varchar(80),
	`jobTitle` varchar(160),
	`department` varchar(160),
	`companyId` int,
	`status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
	`addressLine1` varchar(240),
	`addressLine2` varchar(240),
	`city` varchar(120),
	`region` varchar(120),
	`postalCode` varchar(40),
	`country` varchar(120),
	`notes` text,
	`ownerId` int NOT NULL,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`companyName` varchar(240),
	`jobTitle` varchar(160),
	`email` varchar(320),
	`phone` varchar(80),
	`source` varchar(120),
	`status` enum('New','Contacted','Qualified','Nurturing','Converted','Disqualified') NOT NULL DEFAULT 'New',
	`estimatedValueCents` int NOT NULL DEFAULT 0,
	`notes` text,
	`ownerId` int NOT NULL,
	`createdById` int NOT NULL,
	`convertedAt` timestamp,
	`convertedCompanyId` int,
	`convertedContactId` int,
	`convertedOpportunityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`companyId` int,
	`contactId` int,
	`leadId` int,
	`ownerId` int NOT NULL,
	`createdById` int NOT NULL,
	`stage` enum('Prospecting','Qualified','Proposal','Negotiation','Closed Won','Closed Lost') NOT NULL DEFAULT 'Prospecting',
	`valueCents` int NOT NULL DEFAULT 0,
	`probability` int NOT NULL DEFAULT 10,
	`expectedCloseDate` date,
	`closedAt` timestamp,
	`nextStep` varchar(500),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archivedAt` timestamp,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationName` varchar(240) NOT NULL DEFAULT 'JMK Group',
	`defaultCurrency` varchar(3) NOT NULL DEFAULT 'GBP',
	`timezone` varchar(120) NOT NULL DEFAULT 'Europe/London',
	`fiscalYearStartMonth` int NOT NULL DEFAULT 1,
	`updatedById` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_singleton_idx` UNIQUE(`organizationName`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(160);--> statement-breakpoint
CREATE INDEX `activities_owner_idx` ON `activities` (`ownerId`);--> statement-breakpoint
CREATE INDEX `activities_entity_idx` ON `activities` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `activities_due_idx` ON `activities` (`dueAt`);--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `activities` (`type`);--> statement-breakpoint
CREATE INDEX `companies_owner_idx` ON `companies` (`ownerId`);--> statement-breakpoint
CREATE INDEX `companies_name_idx` ON `companies` (`name`);--> statement-breakpoint
CREATE INDEX `companies_status_idx` ON `companies` (`status`);--> statement-breakpoint
CREATE INDEX `contacts_owner_idx` ON `contacts` (`ownerId`);--> statement-breakpoint
CREATE INDEX `contacts_company_idx` ON `contacts` (`companyId`);--> statement-breakpoint
CREATE INDEX `contacts_name_idx` ON `contacts` (`lastName`,`firstName`);--> statement-breakpoint
CREATE INDEX `leads_owner_idx` ON `leads` (`ownerId`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `opportunities_owner_idx` ON `opportunities` (`ownerId`);--> statement-breakpoint
CREATE INDEX `opportunities_stage_idx` ON `opportunities` (`stage`);--> statement-breakpoint
CREATE INDEX `opportunities_company_idx` ON `opportunities` (`companyId`);--> statement-breakpoint
CREATE INDEX `opportunities_close_idx` ON `opportunities` (`expectedCloseDate`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);