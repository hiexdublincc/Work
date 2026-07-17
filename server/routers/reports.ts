import { and, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { ACTIVITY_TYPES, LEAD_STATUSES, LOST_REASONS, OPPORTUNITY_STAGES, OPPORTUNITY_TYPES, activities, leads, opportunities, properties } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { getAuthorizedPropertyIds, propertyScope, requireDb, scopedWhere } from "../db";
import { activeProcedure } from "./common";

const reportFilters = z.object({
  ownerId: z.number().int().positive().optional(),
  propertyId: z.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const reportsRouter = router({
  summary: activeProcedure.input(reportFilters).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const leadWhere = scopedWhere(
      isNull(leads.archivedAt),
      propertyScope(leads.propertyId, propertyIds),
      input.propertyId ? eq(leads.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(leads.ownerId, input.ownerId) : undefined,
      input.from ? gte(leads.createdAt, input.from) : undefined,
      input.to ? lte(leads.createdAt, input.to) : undefined,
    );
    const opportunityWhere = scopedWhere(
      isNull(opportunities.archivedAt),
      propertyScope(opportunities.propertyId, propertyIds),
      input.propertyId ? eq(opportunities.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
      input.from ? gte(opportunities.createdAt, input.from) : undefined,
      input.to ? lte(opportunities.createdAt, input.to) : undefined,
    );
    const activityWhere = scopedWhere(
      isNull(activities.archivedAt),
      propertyScope(activities.propertyId, propertyIds),
      input.propertyId ? eq(activities.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(activities.ownerId, input.ownerId) : undefined,
      input.from ? gte(activities.createdAt, input.from) : undefined,
      input.to ? lte(activities.createdAt, input.to) : undefined,
    );

    const [leadRows, opportunityRows, activityRows] = await Promise.all([
      db
        .select({
          status: leads.status,
          count: sql<number>`count(*)`,
          estimatedValueCents: sql<number>`coalesce(sum(${leads.estimatedValueCents}), 0)`,
        })
        .from(leads)
        .where(leadWhere)
        .groupBy(leads.status),
      db
        .select({
          stage: opportunities.stage,
          count: sql<number>`count(*)`,
          valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
          weightedValueCents: sql<number>`coalesce(sum(${opportunities.valueCents} * ${opportunities.probability} / 100), 0)`,
        })
        .from(opportunities)
        .where(opportunityWhere)
        .groupBy(opportunities.stage),
      db
        .select({
          type: activities.type,
          count: sql<number>`count(*)`,
          completed: sql<number>`sum(case when ${activities.completedAt} is not null then 1 else 0 end)`,
          open: sql<number>`sum(case when ${activities.completedAt} is null then 1 else 0 end)`,
          overdue: sql<number>`sum(case when ${activities.type} = 'task' and ${activities.completedAt} is null and ${activities.dueAt} < now() then 1 else 0 end)`,
        })
        .from(activities)
        .where(activityWhere)
        .groupBy(activities.type),
    ]);

    return {
      leadsByStatus: LEAD_STATUSES.map(status => {
        const row = leadRows.find(item => item.status === status);
        return { status, count: Number(row?.count ?? 0), estimatedValueCents: Number(row?.estimatedValueCents ?? 0) };
      }),
      opportunitiesByStage: OPPORTUNITY_STAGES.map(stage => {
        const row = opportunityRows.find(item => item.stage === stage);
        return {
          stage,
          count: Number(row?.count ?? 0),
          valueCents: Number(row?.valueCents ?? 0),
          weightedValueCents: Number(row?.weightedValueCents ?? 0),
        };
      }),
      activitySummary: ACTIVITY_TYPES.map(type => {
        const row = activityRows.find(item => item.type === type);
        return {
          type,
          count: Number(row?.count ?? 0),
          completed: Number(row?.completed ?? 0),
          open: Number(row?.open ?? 0),
          overdue: Number(row?.overdue ?? 0),
        };
      }),
    };
  }),

  revenueForecast: activeProcedure.input(reportFilters).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const openStages = OPPORTUNITY_STAGES.filter(stage => stage !== "Closed Won" && stage !== "Closed Lost");
    const rows = await db
      .select({
        month: sql<string>`date_format(${opportunities.expectedCloseDate}, '%Y-%m')`,
        count: sql<number>`count(*)`,
        grossValueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
        weightedValueCents: sql<number>`coalesce(sum(${opportunities.valueCents} * ${opportunities.probability} / 100), 0)`,
      })
      .from(opportunities)
      .where(
        scopedWhere(
          isNull(opportunities.archivedAt),
          isNotNull(opportunities.expectedCloseDate),
          inArray(opportunities.stage, openStages),
          propertyScope(opportunities.propertyId, propertyIds),
          input.propertyId ? eq(opportunities.propertyId, input.propertyId) : undefined,
          input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
          input.from ? gte(opportunities.expectedCloseDate, input.from) : undefined,
          input.to ? lte(opportunities.expectedCloseDate, input.to) : undefined,
        ),
      )
      .groupBy(sql`date_format(${opportunities.expectedCloseDate}, '%Y-%m')`)
      .orderBy(sql`date_format(${opportunities.expectedCloseDate}, '%Y-%m')`);

    return rows.map(row => ({
      month: row.month,
      count: Number(row.count),
      grossValueCents: Number(row.grossValueCents),
      weightedValueCents: Number(row.weightedValueCents),
    }));
  }),

  lostBusiness: activeProcedure.input(reportFilters).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const propertyIds = await getAuthorizedPropertyIds(ctx.user);
    const lostWhere = scopedWhere(
      eq(opportunities.stage, "Closed Lost"),
      propertyScope(opportunities.propertyId, propertyIds),
      input.propertyId ? eq(opportunities.propertyId, input.propertyId) : undefined,
      input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
      input.from ? gte(opportunities.lostAt, input.from) : undefined,
      input.to ? lte(opportunities.lostAt, input.to) : undefined,
    );

    const [byReason, byProperty, byType, byStageAtLoss, byCompetitor] = await Promise.all([
      db.select({
        lostReason: opportunities.lostReason,
        count: sql<number>`count(*)`,
        valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
      }).from(opportunities).where(lostWhere).groupBy(opportunities.lostReason),
      db.select({
        propertyId: opportunities.propertyId,
        propertyName: properties.name,
        count: sql<number>`count(*)`,
        valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
      }).from(opportunities).leftJoin(properties, eq(opportunities.propertyId, properties.id)).where(lostWhere).groupBy(opportunities.propertyId, properties.name),
      db.select({
        businessType: opportunities.businessType,
        count: sql<number>`count(*)`,
        valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
      }).from(opportunities).where(lostWhere).groupBy(opportunities.businessType),
      db.select({
        stageAtLoss: opportunities.stageAtLoss,
        count: sql<number>`count(*)`,
        valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
      }).from(opportunities).where(lostWhere).groupBy(opportunities.stageAtLoss),
      db.select({
        competitorHotel: opportunities.competitorHotel,
        count: sql<number>`count(*)`,
        valueCents: sql<number>`coalesce(sum(${opportunities.valueCents}), 0)`,
      }).from(opportunities).where(lostWhere).groupBy(opportunities.competitorHotel),
    ]);

    const totalCount = byReason.reduce((sum, row) => sum + Number(row.count), 0);
    const totalValueCents = byReason.reduce((sum, row) => sum + Number(row.valueCents), 0);

    return {
      totalCount,
      totalValueCents,
      byReason: LOST_REASONS.map(reason => {
        const row = byReason.find(item => item.lostReason === reason);
        return { reason, count: Number(row?.count ?? 0), valueCents: Number(row?.valueCents ?? 0) };
      }),
      byProperty: byProperty.map(row => ({ propertyId: row.propertyId, propertyName: row.propertyName, count: Number(row.count), valueCents: Number(row.valueCents) })),
      byType: OPPORTUNITY_TYPES.map(type => {
        const row = byType.find(item => item.businessType === type);
        return { type, count: Number(row?.count ?? 0), valueCents: Number(row?.valueCents ?? 0) };
      }).filter(item => item.count > 0),
      byStageAtLoss: OPPORTUNITY_STAGES.map(stage => {
        const row = byStageAtLoss.find(item => item.stageAtLoss === stage);
        return { stage, count: Number(row?.count ?? 0), valueCents: Number(row?.valueCents ?? 0) };
      }).filter(item => item.count > 0),
      byCompetitor: byCompetitor
        .filter(row => row.competitorHotel)
        .map(row => ({ competitorHotel: row.competitorHotel as string, count: Number(row.count), valueCents: Number(row.valueCents) }))
        .sort((a, b) => b.count - a.count),
    };
  }),
});
