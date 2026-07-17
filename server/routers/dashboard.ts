import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, isNull, lt, lte, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  achievements,
  activities,
  companies,
  leads,
  LEAD_STATUSES,
  OPPORTUNITY_STAGES,
  opportunities,
  properties,
  users,
  weeklyUpdates,
} from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import { activeProcedure, assertPropertyAccess } from "./common";
import { calculateAccountHealth } from "./companies";

const overviewInput = z.object({
  scope: z.enum(["personal", "property", "group"]).default("personal"),
  propertyId: z.number().int().positive().optional(),
}).optional();

export const dashboardRouter = router({
  overview: activeProcedure.input(overviewInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const selectedScope = input?.scope ?? "personal";
    if (selectedScope === "group" && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Group dashboard access is reserved for Administrators." });
    }
    if (selectedScope === "property" && !input?.propertyId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Select a property for the Property dashboard." });
    }
    if (input?.propertyId) await assertPropertyAccess(ctx.user, input.propertyId);

    const authorizedPropertyIds = await getAuthorizedPropertyIds(ctx.user);
    const scopeFor = (
      propertyColumn: Parameters<typeof propertyScope>[0],
      ownerColumn: Parameters<typeof propertyScope>[0],
    ) => scopedWhere(
      propertyScope(propertyColumn, authorizedPropertyIds),
      selectedScope === "personal" ? eq(ownerColumn, ctx.user.id) : undefined,
      selectedScope === "property" && input?.propertyId ? eq(propertyColumn, input.propertyId) : undefined,
    );
    const leadScope = scopeFor(leads.propertyId, leads.ownerId);
    const opportunityScope = scopeFor(opportunities.propertyId, opportunities.ownerId);
    const activityScope = scopeFor(activities.propertyId, activities.ownerId);
    const achievementScope = scopeFor(achievements.propertyId, achievements.ownerId);
    const weeklyScope = scopeFor(weeklyUpdates.propertyId, weeklyUpdates.ownerId);
    const companyScope = scopeFor(companies.propertyId, companies.ownerId);

    const openStages = OPPORTUNITY_STAGES.filter(stage => stage !== "Closed Won" && stage !== "Closed Lost");
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const upcomingEnd = new Date(now); upcomingEnd.setDate(upcomingEnd.getDate() + 14);
    const staleOpportunityCutoff = new Date(now); staleOpportunityCutoff.setDate(staleOpportunityCutoff.getDate() - 30);
    const proposalCutoff = new Date(now); proposalCutoff.setDate(proposalCutoff.getDate() - 7);

    const [
      openLeadRows, pipelineRows, wonRows, overdueRows, funnelRows, recentOpportunities,
      upcomingTasks, todayAppointments, upcomingEngagements, recentActivities,
      recentAchievements, weeklySummaries, companyAlertRows, opportunityAlertRows,
      openEnquiries, keyWins, businessPotential,
    ] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(leads)
        .where(scopedWhere(isNull(leads.archivedAt), leadScope, notInArray(leads.status, ["Converted", "Disqualified"]))),
      db.select({ value: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)` }).from(opportunities)
        .where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope, inArray(opportunities.stage, openStages))),
      db.select({ value: sql<number>`count(*)` }).from(opportunities)
        .where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope, eq(opportunities.stage, "Closed Won"))),
      db.select({ value: sql<number>`count(*)` }).from(activities)
        .where(scopedWhere(isNull(activities.archivedAt), activityScope, eq(activities.type, "task"), isNull(activities.completedAt), lt(activities.dueAt, now))),
      db.select({ stage: opportunities.stage, count: sql<number>`count(*)`, valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)` })
        .from(opportunities).where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope)).groupBy(opportunities.stage),
      db.select({
        id: opportunities.id, name: opportunities.name, stage: opportunities.stage,
        businessType: opportunities.businessType, valueCents: opportunities.valueCents,
        probability: opportunities.probability, roomNights: opportunities.roomNights,
        companyName: companies.name, propertyName: properties.name, updatedAt: opportunities.updatedAt,
      }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .leftJoin(properties, eq(opportunities.propertyId, properties.id))
        .where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope))
        .orderBy(desc(opportunities.updatedAt)).limit(6),
      db.select({
        id: activities.id, title: activities.title, priority: activities.priority,
        dueAt: activities.dueAt, entityType: activities.entityType, entityId: activities.entityId,
        propertyName: properties.name, ownerName: users.name,
      }).from(activities)
        .leftJoin(properties, eq(activities.propertyId, properties.id))
        .leftJoin(users, eq(activities.ownerId, users.id))
        .where(scopedWhere(isNull(activities.archivedAt), activityScope, eq(activities.type, "task"), isNull(activities.completedAt)))
        .orderBy(activities.dueAt).limit(6),
      db.select({
        id: activities.id, title: activities.title, subtype: activities.subtype,
        startedAt: activities.startedAt, endsAt: activities.endsAt,
        propertyName: properties.name, ownerName: users.name,
      }).from(activities)
        .leftJoin(properties, eq(activities.propertyId, properties.id))
        .leftJoin(users, eq(activities.ownerId, users.id))
        .where(scopedWhere(
          isNull(activities.archivedAt), activityScope,
          inArray(activities.type, ["call", "meeting"]),
          gte(activities.startedAt, todayStart), lte(activities.startedAt, todayEnd),
        )).orderBy(activities.startedAt).limit(8),
      db.select({
        id: activities.id, title: activities.title, type: activities.type, subtype: activities.subtype,
        startedAt: activities.startedAt, dueAt: activities.dueAt, propertyName: properties.name, ownerName: users.name,
      }).from(activities)
        .leftJoin(properties, eq(activities.propertyId, properties.id))
        .leftJoin(users, eq(activities.ownerId, users.id))
        .where(scopedWhere(
          isNull(activities.archivedAt), activityScope,
          gte(activities.startedAt, now), lte(activities.startedAt, upcomingEnd),
        )).orderBy(activities.startedAt).limit(8),
      db.select({
        id: activities.id, title: activities.title, type: activities.type, subtype: activities.subtype,
        createdAt: activities.createdAt, propertyName: properties.name, ownerName: users.name,
      }).from(activities)
        .leftJoin(properties, eq(activities.propertyId, properties.id))
        .leftJoin(users, eq(activities.ownerId, users.id))
        .where(scopedWhere(isNull(activities.archivedAt), activityScope))
        .orderBy(desc(activities.createdAt)).limit(8),
      db.select({
        id: achievements.id, month: achievements.month, organizationActivity: achievements.organizationActivity,
        potentialValueCents: achievements.potentialValueCents, averageRateCents: achievements.averageRateCents,
        status: achievements.status, propertyName: properties.name, ownerName: users.name,
      }).from(achievements)
        .leftJoin(properties, eq(achievements.propertyId, properties.id))
        .leftJoin(users, eq(achievements.ownerId, users.id))
        .where(scopedWhere(isNull(achievements.archivedAt), achievementScope))
        .orderBy(desc(achievements.month), desc(achievements.updatedAt)).limit(6),
      db.select({
        id: weeklyUpdates.id, weekCommencing: weeklyUpdates.weekCommencing,
        keyWins: weeklyUpdates.keyWins, businessPotential: weeklyUpdates.businessPotential,
        status: weeklyUpdates.status, propertyName: properties.name, ownerName: users.name,
      }).from(weeklyUpdates)
        .leftJoin(properties, eq(weeklyUpdates.propertyId, properties.id))
        .leftJoin(users, eq(weeklyUpdates.ownerId, users.id))
        .where(scopedWhere(
          weeklyScope,
          selectedScope === "group" ? eq(weeklyUpdates.isGroupVisible, true) : undefined,
          selectedScope !== "personal" ? eq(weeklyUpdates.status, "Submitted") : undefined,
        )).orderBy(desc(weeklyUpdates.weekCommencing)).limit(7),
      db.select({
        id: companies.id, name: companies.name, status: companies.status,
        lastActivityAt: companies.lastActivityAt, nextFollowUpAt: companies.nextFollowUpAt,
        contractExpiryDate: companies.contractExpiryDate, propertyName: properties.name,
      }).from(companies)
        .leftJoin(properties, eq(companies.propertyId, properties.id))
        .where(scopedWhere(isNull(companies.archivedAt), companyScope))
        .orderBy(desc(companies.updatedAt)).limit(120),
      db.select({
        id: opportunities.id, name: opportunities.name, stage: opportunities.stage,
        stageChangedAt: opportunities.stageChangedAt, commercialStatus: opportunities.commercialStatus,
        nextActionAt: opportunities.nextActionAt, expectedCloseDate: opportunities.expectedCloseDate,
        updatedAt: opportunities.updatedAt,
        companyName: companies.name, propertyName: properties.name,
      }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .leftJoin(properties, eq(opportunities.propertyId, properties.id))
        .where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope, inArray(opportunities.stage, openStages)))
        .orderBy(opportunities.nextActionAt, opportunities.updatedAt).limit(120),
      db.select({
        id: leads.id, firstName: leads.firstName, lastName: leads.lastName, companyName: leads.companyName,
        status: leads.status, estimatedValueCents: leads.estimatedValueCents, propertyName: properties.name,
        updatedAt: leads.updatedAt,
      }).from(leads).leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(scopedWhere(isNull(leads.archivedAt), leadScope, notInArray(leads.status, ["Converted", "Disqualified"])))
        .orderBy(desc(leads.updatedAt)).limit(5),
      db.select({
        id: opportunities.id, name: opportunities.name, valueCents: opportunities.valueCents,
        companyName: companies.name, propertyName: properties.name, closedAt: opportunities.closedAt,
      }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .leftJoin(properties, eq(opportunities.propertyId, properties.id))
        .where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope, eq(opportunities.stage, "Closed Won")))
        .orderBy(desc(opportunities.closedAt)).limit(5),
      db.select({
        id: opportunities.id, name: opportunities.name, stage: opportunities.stage,
        valueCents: opportunities.valueCents, probability: opportunities.probability,
        companyName: companies.name, propertyName: properties.name,
      }).from(opportunities)
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .leftJoin(properties, eq(opportunities.propertyId, properties.id))
        .where(scopedWhere(isNull(opportunities.archivedAt), opportunityScope, inArray(opportunities.stage, openStages)))
        .orderBy(desc(opportunities.valueCents)).limit(5),
    ]);

    const severityRank = { critical: 0, warning: 1, info: 2 } as const;
    const accountHealthRows = companyAlertRows
      .map(company => ({ ...company, accountHealth: calculateAccountHealth(company) }))
      .filter(company => company.accountHealth.state !== "Healthy")
      .sort((a, b) => (a.accountHealth.state === "At Risk" ? 0 : 1) - (b.accountHealth.state === "At Risk" ? 0 : 1));
    const alerts: Array<{ id: string; kind: string; severity: keyof typeof severityRank; title: string; message: string; propertyName: string | null; href: string }> = [];
    for (const company of accountHealthRows) {
      alerts.push({ id: `account-${company.id}`, kind: "Account health", severity: company.accountHealth.state === "At Risk" ? "critical" : "warning", title: company.name, message: company.accountHealth.reasons[0], propertyName: company.propertyName, href: "/companies" });
    }
    const stageAgeThresholdDays: Partial<Record<(typeof OPPORTUNITY_STAGES)[number], number>> = {
      Prospecting: 21, Qualified: 21, Proposal: 14, Negotiation: 14,
    };
    for (const opportunity of opportunityAlertRows) {
      const daysInStage = Math.floor((now.getTime() - opportunity.stageChangedAt.getTime()) / 86_400_000);
      const stageThreshold = stageAgeThresholdDays[opportunity.stage];
      if (stageThreshold && daysInStage > stageThreshold) {
        alerts.push({ id: `stage-age-${opportunity.id}`, kind: "Stage age", severity: daysInStage > stageThreshold * 2 ? "critical" : "warning", title: opportunity.name, message: `${opportunity.stage} for ${daysInStage} days; review or advance the next action.`, propertyName: opportunity.propertyName, href: "/opportunities" });
      }
      if (opportunity.nextActionAt && opportunity.nextActionAt < now) {
        alerts.push({ id: `follow-up-${opportunity.id}`, kind: "Overdue follow-up", severity: "critical", title: opportunity.name, message: `Next action was due ${opportunity.nextActionAt.toLocaleDateString("en-GB")}.`, propertyName: opportunity.propertyName, href: "/opportunities" });
      }
      if (opportunity.commercialStatus === "Proposal sent" && opportunity.updatedAt < proposalCutoff) {
        alerts.push({ id: `proposal-${opportunity.id}`, kind: "Proposal awaiting response", severity: "warning", title: opportunity.name, message: "Proposal has been awaiting a response for more than 7 days.", propertyName: opportunity.propertyName, href: "/opportunities" });
      }
      if (opportunity.updatedAt < staleOpportunityCutoff) {
        alerts.push({ id: `stale-${opportunity.id}`, kind: "Stale opportunity", severity: "warning", title: opportunity.name, message: `${opportunity.stage} has had no recorded update for more than 30 days.`, propertyName: opportunity.propertyName, href: "/opportunities" });
      }
      if (opportunity.expectedCloseDate && opportunity.expectedCloseDate < todayStart) {
        alerts.push({ id: `close-${opportunity.id}`, kind: "Close date passed", severity: "info", title: opportunity.name, message: `Expected close date was ${opportunity.expectedCloseDate.toLocaleDateString("en-GB")}.`, propertyName: opportunity.propertyName, href: "/opportunities" });
      }
    }
    alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    return {
      scope: selectedScope,
      kpis: {
        openLeads: Number(openLeadRows[0]?.value ?? 0),
        pipelineValueCents: Number(pipelineRows[0]?.value ?? 0),
        wonDeals: Number(wonRows[0]?.value ?? 0),
        overdueTasks: Number(overdueRows[0]?.value ?? 0),
      },
      funnel: OPPORTUNITY_STAGES.map(stage => {
        const row = funnelRows.find(item => item.stage === stage);
        return { stage, count: Number(row?.count ?? 0), valueCents: Number(row?.valueCents ?? 0) };
      }),
      recentOpportunities,
      upcomingTasks,
      todayAppointments,
      upcomingEngagements,
      recentActivities,
      recentAchievements,
      weeklySummaries,
      openEnquiries,
      keyWins,
      businessPotential,
      calendarHighlights: upcomingEngagements.slice(0, 5),
      accountsNeedingAttention: accountHealthRows.slice(0, 8),
      alerts: alerts.slice(0, 12),
      alertSummary: {
        critical: alerts.filter(alert => alert.severity === "critical").length,
        warning: alerts.filter(alert => alert.severity === "warning").length,
        info: alerts.filter(alert => alert.severity === "info").length,
      },
      leadStatuses: LEAD_STATUSES,
    };
  }),
});
