import {
  boolean,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const APP_ROLES = ["user", "admin"] as const;
export const OPPORTUNITY_STAGES = [
  "Prospecting",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;
export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Nurturing", "Converted", "Disqualified"] as const;
export const ACTIVITY_TYPES = ["note", "call", "meeting"] as const;
export const ACTIVITY_ENTITY_TYPES = ["company", "contact", "lead", "opportunity"] as const;
export const ACCOUNT_CATEGORIES = [
  "Corporate", "Agency", "Government", "Tour operator", "TMC", "Event organiser", "Crew", "Extended stay", "Meeting room client", "Conference lead",
] as const;
export const OPPORTUNITY_TYPES = [
  "Corporate account", "Group booking", "LNR", "RFP", "Tour series", "Crew", "Long stay", "Meeting room booking", "Conference or event",
] as const;
export const COMMERCIAL_STATUSES = [
  "New lead", "Contact made", "Proposal sent", "RFP received", "RFP submitted", "On option", "Contracted", "Rate loaded", "Live", "Declined",
] as const;
export const HOTEL_ACTIVITY_SUBTYPES = [
  "General", "Call made", "Email sent", "Meeting held", "Appointment booked", "Site visit/showaround", "Webinar attended", "Sales trip", "Event attended", "Follow-up completed", "Proposal sent", "RFP received", "RFP submitted", "Contract signed", "Achievement/win logged", "Weekly update logged", "Other",
] as const;
export const ACHIEVEMENT_STATUSES = ["Confirmed", "Tentative", "RFP accepted", "Declined", "Contracted", "Proposal sent", "On option"] as const;
export const ACCOUNT_HEALTH_STATES = ["Healthy", "Needs Attention", "At Risk"] as const;
export const LOST_REASONS = [
  "Lost on price", "No availability", "Competitor selected", "Location", "Facilities", "Parking", "Client cancelled", "Budget", "Timing", "Other",
] as const;
export const REFERRAL_STATUSES = ["New", "Accepted", "In Progress", "Won", "Lost"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", APP_ROLES).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  jobTitle: varchar("jobTitle", { length: 160 }),
  department: varchar("department", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [index("users_role_idx").on(table.role)]);

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 240 }).notNull(),
  brand: varchar("brand", { length: 160 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  country: varchar("country", { length: 120 }).default("Ireland").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("properties_code_unique").on(table.code), uniqueIndex("properties_name_unique").on(table.name)]);

export const userPropertyAssignments = mysqlTable("user_property_assignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  propertyId: int("propertyId").notNull(),
  assignedById: int("assignedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("user_property_unique").on(table.userId, table.propertyId),
  index("user_property_user_idx").on(table.userId),
  index("user_property_property_idx").on(table.propertyId),
]);

export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 240 }).notNull(),
  legalName: varchar("legalName", { length: 240 }),
  website: varchar("website", { length: 500 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 80 }),
  industry: varchar("industry", { length: 160 }),
  category: mysqlEnum("category", ACCOUNT_CATEGORIES).default("Corporate").notNull(),
  segment: varchar("segment", { length: 160 }),
  destinationCity: varchar("destinationCity", { length: 120 }),
  leadSource: varchar("leadSource", { length: 160 }),
  preferredRateType: varchar("preferredRateType", { length: 120 }),
  productionHistory: text("productionHistory"),
  potentialRoomNights: int("potentialRoomNights").default(0).notNull(),
  potentialRevenueCents: int("potentialRevenueCents").default(0).notNull(),
  relationshipStatus: varchar("relationshipStatus", { length: 120 }),
  lastActivityAt: timestamp("lastActivityAt"),
  nextFollowUpAt: timestamp("nextFollowUpAt"),
  contractStartDate: date("contractStartDate"),
  contractExpiryDate: date("contractExpiryDate"),
  status: mysqlEnum("status", ["Prospect", "Active", "Inactive"]).default("Prospect").notNull(),
  employeeCount: int("employeeCount"),
  annualRevenueCents: int("annualRevenueCents"),
  addressLine1: varchar("addressLine1", { length: 240 }),
  addressLine2: varchar("addressLine2", { length: 240 }),
  city: varchar("city", { length: 120 }),
  region: varchar("region", { length: 120 }),
  postalCode: varchar("postalCode", { length: 40 }),
  country: varchar("country", { length: 120 }),
  description: text("description"),
  notes: text("notes"),
  ownerId: int("ownerId").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("companies_owner_idx").on(table.ownerId), index("companies_name_idx").on(table.name), index("companies_status_idx").on(table.status),
]);

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  preferredName: varchar("preferredName", { length: 120 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 80 }),
  mobile: varchar("mobile", { length: 80 }),
  jobTitle: varchar("jobTitle", { length: 160 }),
  department: varchar("department", { length: 160 }),
  companyId: int("companyId"),
  relationshipStatus: varchar("relationshipStatus", { length: 120 }),
  status: mysqlEnum("status", ["Active", "Inactive"]).default("Active").notNull(),
  addressLine1: varchar("addressLine1", { length: 240 }),
  addressLine2: varchar("addressLine2", { length: 240 }),
  city: varchar("city", { length: 120 }),
  region: varchar("region", { length: 120 }),
  postalCode: varchar("postalCode", { length: 40 }),
  country: varchar("country", { length: 120 }),
  notes: text("notes"),
  ownerId: int("ownerId").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("contacts_owner_idx").on(table.ownerId), index("contacts_company_idx").on(table.companyId), index("contacts_name_idx").on(table.lastName, table.firstName),
]);

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  companyName: varchar("companyName", { length: 240 }),
  jobTitle: varchar("jobTitle", { length: 160 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 80 }),
  source: varchar("source", { length: 120 }),
  propertyId: int("propertyId").notNull(),
  businessType: mysqlEnum("businessType", OPPORTUNITY_TYPES).default("Corporate account").notNull(),
  potentialRoomNights: int("potentialRoomNights").default(0).notNull(),
  status: mysqlEnum("status", LEAD_STATUSES).default("New").notNull(),
  estimatedValueCents: int("estimatedValueCents").default(0).notNull(),
  notes: text("notes"),
  ownerId: int("ownerId").notNull(),
  createdById: int("createdById").notNull(),
  convertedAt: timestamp("convertedAt"),
  convertedCompanyId: int("convertedCompanyId"),
  convertedContactId: int("convertedContactId"),
  convertedOpportunityId: int("convertedOpportunityId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("leads_owner_idx").on(table.ownerId), index("leads_property_idx").on(table.propertyId), index("leads_status_idx").on(table.status), index("leads_email_idx").on(table.email),
]);

export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 240 }).notNull(),
  companyId: int("companyId"),
  contactId: int("contactId"),
  leadId: int("leadId"),
  propertyId: int("propertyId").notNull(),
  ownerId: int("ownerId").notNull(),
  createdById: int("createdById").notNull(),
  stage: mysqlEnum("stage", OPPORTUNITY_STAGES).default("Prospecting").notNull(),
  stageChangedAt: timestamp("stageChangedAt").defaultNow().notNull(),
  businessType: mysqlEnum("businessType", OPPORTUNITY_TYPES).default("Corporate account").notNull(),
  commercialStatus: mysqlEnum("commercialStatus", COMMERCIAL_STATUSES).default("New lead").notNull(),
  valueCents: int("valueCents").default(0).notNull(),
  probability: int("probability").default(10).notNull(),
  roomNights: int("roomNights").default(0).notNull(),
  adrCents: int("adrCents").default(0).notNull(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  source: varchar("source", { length: 160 }),
  expectedCloseDate: date("expectedCloseDate"),
  closedAt: timestamp("closedAt"),
  nextStep: varchar("nextStep", { length: 500 }).notNull(),
  nextActionAt: timestamp("nextActionAt"),
  competitorHotel: varchar("competitorHotel", { length: 240 }),
  referralSource: varchar("referralSource", { length: 240 }),
  lostReason: mysqlEnum("lostReason", LOST_REASONS),
  lossComment: text("lossComment"),
  stageAtLoss: mysqlEnum("stageAtLoss", OPPORTUNITY_STAGES),
  lostAt: timestamp("lostAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("opportunities_owner_idx").on(table.ownerId), index("opportunities_property_idx").on(table.propertyId), index("opportunities_stage_idx").on(table.stage), index("opportunities_company_idx").on(table.companyId), index("opportunities_close_idx").on(table.expectedCloseDate),
]);

export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ACTIVITY_TYPES).notNull(),
  subtype: mysqlEnum("subtype", HOTEL_ACTIVITY_SUBTYPES).default("General").notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  entityType: mysqlEnum("entityType", ACTIVITY_ENTITY_TYPES),
  entityId: int("entityId"),
  companyId: int("companyId"),
  contactId: int("contactId"),
  leadId: int("leadId"),
  opportunityId: int("opportunityId"),
  propertyId: int("propertyId").notNull(),
  ownerId: int("ownerId").notNull(),
  createdById: int("createdById").notNull(),
  priority: mysqlEnum("priority", ["Low", "Normal", "High"]).default("Normal").notNull(),
  dueAt: timestamp("dueAt"),
  startedAt: timestamp("startedAt"),
  endsAt: timestamp("endsAt"),
  reminderAt: timestamp("reminderAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("activities_owner_idx").on(table.ownerId), index("activities_property_idx").on(table.propertyId), index("activities_entity_idx").on(table.entityType, table.entityId), index("activities_due_idx").on(table.dueAt), index("activities_type_idx").on(table.type),
]);

export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  ownerId: int("ownerId").notNull(),
  month: date("month").notNull(),
  organizationActivity: varchar("organizationActivity", { length: 300 }).notNull(),
  potentialValueCents: int("potentialValueCents").default(0).notNull(),
  averageRateCents: int("averageRateCents").default(0).notNull(),
  eventDate: date("eventDate"),
  nights: int("nights").default(0).notNull(),
  roomNights: int("roomNights").default(0).notNull(),
  city: varchar("city", { length: 120 }),
  notes: text("notes"),
  status: mysqlEnum("status", ACHIEVEMENT_STATUSES).default("Confirmed").notNull(),
  companyId: int("companyId"),
  opportunityId: int("opportunityId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("achievements_property_idx").on(table.propertyId), index("achievements_owner_idx").on(table.ownerId), index("achievements_month_idx").on(table.month),
]);

export const crossPropertyReferrals = mysqlTable("cross_property_referrals", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),
  opportunityId: int("opportunityId"),
  referringPropertyId: int("referringPropertyId").notNull(),
  receivingPropertyId: int("receivingPropertyId").notNull(),
  status: mysqlEnum("status", REFERRAL_STATUSES).default("New").notNull(),
  valueCents: int("valueCents").default(0).notNull(),
  roomNights: int("roomNights").default(0).notNull(),
  notes: text("notes"),
  originalOwnerId: int("originalOwnerId").notNull(),
  currentOwnerId: int("currentOwnerId").notNull(),
  createdById: int("createdById").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("referrals_referring_property_idx").on(table.referringPropertyId),
  index("referrals_receiving_property_idx").on(table.receivingPropertyId),
  index("referrals_status_idx").on(table.status),
  index("referrals_current_owner_idx").on(table.currentOwnerId),
]);

export const competitorIntelligence = mysqlTable("competitor_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  competitorHotelName: varchar("competitorHotelName", { length: 240 }).notNull(),
  quotedRateCents: int("quotedRateCents"),
  clientFeedback: text("clientFeedback"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  notes: text("notes"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  propertyId: int("propertyId").notNull(),
  ownerId: int("ownerId").notNull(),
  companyId: int("companyId"),
  opportunityId: int("opportunityId"),
  isGroupVisible: boolean("isGroupVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [
  index("competitor_intel_property_idx").on(table.propertyId),
  index("competitor_intel_hotel_idx").on(table.competitorHotelName),
  index("competitor_intel_company_idx").on(table.companyId),
  index("competitor_intel_opportunity_idx").on(table.opportunityId),
]);

export const propertyKnowledge = mysqlTable("property_knowledge", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  overview: text("overview"),
  facilities: text("facilities"),
  meetingRoomCapacity: text("meetingRoomCapacity"),
  parking: text("parking"),
  sellingPoints: text("sellingPoints"),
  salesContacts: text("salesContacts"),
  updatedById: int("updatedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("property_knowledge_property_unique").on(table.propertyId)]);

export const propertyCollateral = mysqlTable("property_collateral", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  name: varchar("name", { length: 240 }).notNull(),
  category: varchar("category", { length: 120 }),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 160 }),
  fileSize: int("fileSize"),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  archivedAt: timestamp("archivedAt"),
}, table => [index("property_collateral_property_idx").on(table.propertyId)]);

export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  organizationName: varchar("organizationName", { length: 240 }).default("JMK Group").notNull(),
  defaultCurrency: varchar("defaultCurrency", { length: 3 }).default("GBP").notNull(),
  timezone: varchar("timezone", { length: 120 }).default("Europe/London").notNull(),
  fiscalYearStartMonth: int("fiscalYearStartMonth").default(1).notNull(),
  updatedById: int("updatedById"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("system_settings_singleton_idx").on(table.organizationName)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type CrossPropertyReferral = typeof crossPropertyReferrals.$inferSelect;
export type CompetitorIntelligence = typeof competitorIntelligence.$inferSelect;
export type PropertyKnowledge = typeof propertyKnowledge.$inferSelect;
export type PropertyCollateral = typeof propertyCollateral.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
