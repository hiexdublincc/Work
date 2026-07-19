import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { achievementsRouter } from "./routers/achievements";
import { activitiesRouter } from "./routers/activities";
import { adminRouter } from "./routers/admin";
import { companiesRouter } from "./routers/companies";
import { contactsRouter } from "./routers/contacts";
import { competitorIntelligenceRouter } from "./routers/competitorIntelligence";
import { dashboardRouter } from "./routers/dashboard";
import { dataRouter } from "./routers/data";
import { propertyKnowledgeRouter } from "./routers/hotelKnowledge";
import { leadsRouter } from "./routers/leads";
import { metadataRouter } from "./routers/metadata";
import { opportunitiesRouter } from "./routers/opportunities";
import { referralsRouter } from "./routers/referrals";
import { reportsRouter } from "./routers/reports";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(options => options.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: dashboardRouter,
  companies: companiesRouter,
  contacts: contactsRouter,
  competitorIntelligence: competitorIntelligenceRouter,
  leads: leadsRouter,
  opportunities: opportunitiesRouter,
  activities: activitiesRouter,
  achievements: achievementsRouter,
  referrals: referralsRouter,
  hotelKnowledge: propertyKnowledgeRouter,
  reports: reportsRouter,
  metadata: metadataRouter,
  admin: adminRouter,
  data: dataRouter,
});

export type AppRouter = typeof appRouter;
