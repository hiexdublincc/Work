import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState, ErrorPanel, LoadingPanel, PageHeader, StatusBadge, fullDateTime, money, shortDate } from "@/components/crm/CRMPrimitives";
import { PortfolioLogoStrip, PropertyIdentity } from "@/components/BrandIdentity";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, ArrowRight, Award, BellRing, Building2, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, HeartPulse, ListTodo, Minus, Sparkles, Target, TrendingDown, TrendingUp, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const kpiConfig = [
  { key: "openLeads", label: "open leads", icon: Target, tone: "bg-[#e6f7f9] text-[#00677f]", trendKey: "openLeads", sparkColor: "#0090b4", unit: "new" },
  { key: "pipelineValueCents", label: "pipeline value", icon: TrendingUp, tone: "bg-[#eef4fb] text-[#1f5c9a]", trendKey: "pipelineValueCents", sparkColor: "#1f5c9a", unit: "money" },
  { key: "wonDeals", label: "won deals", icon: CheckCircle2, tone: "bg-[#eaf2fb] text-[#245b89]", trendKey: "wonDeals", sparkColor: "#1a8a5f", unit: "count" },
  { key: "overdueTasks", label: "overdue tasks", icon: ListTodo, tone: "bg-[#f8ece9] text-[#9a5145]", trendKey: null, sparkColor: null, unit: null },
] as const;
type Scope = "personal" | "property" | "group";

export default function Home() {
  const [, navigate] = useLocation(); const { user } = useAuth(); const [scope, setScope] = useState<Scope>("personal"); const [propertyId, setPropertyId] = useState("");
  const references = trpc.metadata.references.useQuery(); const propertyOptions = references.data?.properties ?? [];
  useEffect(() => { if (scope === "property" && !propertyId && propertyOptions[0]) setPropertyId(String(propertyOptions[0].id)); }, [scope, propertyId, propertyOptions]);
  const input = useMemo(() => ({ scope, propertyId: scope === "property" && propertyId ? Number(propertyId) : undefined }), [scope, propertyId]);
  const overview = trpc.dashboard.overview.useQuery(input, { enabled: scope !== "property" || !!propertyId });

  if (overview.isLoading || references.isLoading) return <><PageHeader title="Your commercial overview" description="A live view of JMK Group’s hotel relationships and sales momentum." /><LoadingPanel rows={7} /></>;
  if (overview.error || !overview.data) return <ErrorPanel message={overview.error?.message} onRetry={() => overview.refetch()} />;
  const { kpis, kpiTrends, severelyOverdueTasks, funnel, recentOpportunities, upcomingTasks, todayAppointments, upcomingEngagements, recentActivities, recentAchievements, openEnquiries, keyWins, businessPotential, calendarHighlights, accountsNeedingAttention, alerts, alertSummary } = overview.data;
  const selectedPropertyName = propertyOptions.find(item => String(item.id) === propertyId)?.name;
  const maxFunnel = Math.max(...funnel.map(item => item.count), 1); const scopeLabel = scope === "personal" ? "your assigned records" : scope === "property" ? selectedPropertyName || "selected property" : "all JMK Group properties";

  return <div className="page-enter max-w-[1560px]">
    <div className="relative mb-5 overflow-hidden rounded-2xl bg-[#002460] px-5 py-6 text-white shadow-[0_24px_60px_rgba(0,36,96,0.24)] sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_12%_18%,rgba(108,204,216,.28),transparent_38%),radial-gradient(circle_at_92%_82%,rgba(0,144,180,.22),transparent_42%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8ee3eb]"><Sparkles className="h-3.5 w-3.5" />Performance at a glance</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.02em] sm:text-[2.1rem]">{scope === "personal" ? "Your commercial overview" : scope === "property" ? "Property commercial overview" : "Group commercial overview"}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">A live, permission-aware view across {scopeLabel}.</p>
          </div>
          <Button onClick={() => navigate("/opportunities")} className="h-10 shrink-0 rounded-xl bg-white px-4 text-[#002460] shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:bg-white/90"><CircleDollarSign className="mr-2 h-4 w-4" />View pipeline</Button>
        </div>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Tabs value={scope} onValueChange={value => setScope(value as Scope)}>
            <TabsList className="h-10 rounded-xl bg-white/12 p-1 backdrop-blur">
              <TabsTrigger value="personal" className="gap-2 rounded-lg px-4 text-[13px] text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#002460]"><UsersRound className="h-3.5 w-3.5" />Personal</TabsTrigger>
              <TabsTrigger value="property" className="gap-2 rounded-lg px-4 text-[13px] text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#002460]"><Building2 className="h-3.5 w-3.5" />Property</TabsTrigger>
              {user?.role === "admin" && <TabsTrigger value="group" className="gap-2 rounded-lg px-4 text-[13px] text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#002460]"><Sparkles className="h-3.5 w-3.5" />Group</TabsTrigger>}
            </TabsList>
          </Tabs>
          {scope === "property" && <Select value={propertyId} onValueChange={setPropertyId}><SelectTrigger className="h-10 w-full rounded-xl border-white/20 bg-white/12 text-xs text-white backdrop-blur sm:w-[280px]"><SelectValue placeholder="Select a property" /></SelectTrigger><SelectContent>{propertyOptions.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>}
        </div>
      </div>
    </div>

    <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#dce5ee] bg-[linear-gradient(110deg,#ffffff_0%,#f5fbfc_100%)] px-4 py-3.5 shadow-[0_8px_24px_rgba(0,36,96,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <PropertyIdentity propertyName={scope === "property" ? selectedPropertyName : undefined} />
      {scope !== "property" && <PortfolioLogoStrip className="justify-start sm:justify-end" />}
    </div>

    <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard key performance indicators">
      {kpiConfig.map(item => {
        const Icon = item.icon;
        const raw = kpis[item.key];
        const value = item.key === "pipelineValueCents" ? money(raw) : new Intl.NumberFormat("en-GB").format(raw);
        const series = item.trendKey ? kpiTrends[item.trendKey] : null;
        const thisWeek = series ? series[series.length - 1] : 0;
        const lastWeek = series ? series[series.length - 2] : 0;
        return (
          <Card key={item.key} className="surface surface-hover overflow-hidden border-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div><p className="text-[13px] font-semibold lowercase tracking-[0.02em] text-muted-foreground">{item.label}</p><p className="metric-value mt-3">{value}</p></div>
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}><Icon className="h-[18px] w-[18px]" /></div>
              </div>
              {series ? (
                <div className="mt-4 h-9">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                      <defs><linearGradient id={`spark-${item.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.sparkColor!} stopOpacity={0.35} /><stop offset="100%" stopColor={item.sparkColor!} stopOpacity={0} /></linearGradient></defs>
                      <Area type="monotone" dataKey="v" stroke={item.sparkColor!} strokeWidth={2} fill={`url(#spark-${item.key})`} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="mt-4 h-9" />}
              <div className="mt-4 flex items-center gap-1.5 border-t border-[#e8edf3] pt-3 text-[12px]">
                {item.key === "overdueTasks" ? (
                  severelyOverdueTasks > 0
                    ? <><AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" /><span className="font-semibold text-rose-700">{severelyOverdueTasks} overdue 7+ days</span></>
                    : <><CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /><span className="text-muted-foreground">All caught up</span></>
                ) : item.unit === "count" ? (
                  thisWeek >= lastWeek
                    ? <><TrendingUp className="h-3 w-3 shrink-0 text-emerald-600" /><span className="font-semibold text-emerald-700">{thisWeek} won this week</span></>
                    : <><TrendingDown className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">{thisWeek} won this week</span></>
                ) : item.unit === "money" ? (
                  <><TrendingUp className={`h-3 w-3 shrink-0 ${thisWeek > 0 ? "text-emerald-600" : "text-muted-foreground"}`} /><span className={thisWeek > 0 ? "font-semibold text-emerald-700" : "text-muted-foreground"}>{money(thisWeek)} added this week</span></>
                ) : (
                  thisWeek === lastWeek
                    ? <><Minus className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">{thisWeek} new this week</span></>
                    : thisWeek > lastWeek
                    ? <><TrendingUp className="h-3 w-3 shrink-0 text-[#0090b4]" /><span className="font-semibold text-[#00677f]">{thisWeek} new this week</span></>
                    : <><TrendingDown className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">{thisWeek} new this week</span></>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <div className="surface overflow-hidden"><div className="flex flex-col gap-4 border-b border-[#e8edf3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f8ece9] text-[#9a5145]"><BellRing className="h-4 w-4" /></span><div><p className="eyebrow">Smart attention queue</p><h3 className="mt-1 font-display text-[1.35rem] tracking-[-0.02em]">Commercial alerts</h3></div></div><p className="mt-2 text-xs text-muted-foreground">Signals that need action now, calculated from live account, follow-up, contract, and pipeline data.</p></div><div className="flex shrink-0 gap-2 text-[12px] font-semibold"><span className="rounded-full bg-rose-50 px-2.5 py-1.5 text-rose-700">{alertSummary.critical} urgent</span><span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-amber-700">{alertSummary.warning} watch</span></div></div>{alerts.length === 0 ? <EmptyState icon={CheckCircle2} title="No commercial alerts" description="Accounts, contracts, proposals, and next actions in this scope are currently on track." /> : <div className="divide-y divide-[#e8edf3]">{alerts.slice(0, 7).map(alert => <button key={alert.id} onClick={() => navigate(alert.href)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#f7fafc] sm:px-6"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${alert.severity === "critical" ? "bg-rose-50 text-rose-700" : alert.severity === "warning" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}><AlertTriangle className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-xs font-semibold">{alert.title}</span><span className="rounded-full bg-[#edf3f8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#54657a]">{alert.kind}</span></span><span className="mt-1 block text-[12px] leading-4 text-muted-foreground">{alert.message}{alert.propertyName ? ` · ${alert.propertyName}` : ""}</span></span><ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" /></button>)}</div>}</div>
      <div className="surface overflow-hidden"><SectionTitle eyebrow="Relationship coverage" title="Accounts needing attention" icon={HeartPulse} action={() => navigate("/companies")} />{accountsNeedingAttention.length === 0 ? <EmptyState icon={HeartPulse} title="All accounts are healthy" description="Recent activity, follow-up coverage, and contract timing look good in this scope." /> : <div className="divide-y divide-[#e8edf3]">{accountsNeedingAttention.slice(0, 6).map(account => <button key={account.id} onClick={() => navigate("/companies")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#f7fafc] sm:px-6"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${account.accountHealth.state === "At Risk" ? "bg-rose-500" : "bg-amber-500"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{account.name}</span><span className="mt-1 block truncate text-[12px] text-muted-foreground">{account.accountHealth.reasons[0]}</span></span><StatusBadge value={account.accountHealth.state} /></button>)}</div>}</div>
    </section>

    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Commercial highlights">
      <div className="surface p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Demand</p><h3 className="mt-1 text-sm font-semibold">Open enquiries</h3></div><Target className="h-4 w-4 text-[#00758f]" /></div><div className="mt-4 space-y-2.5">{openEnquiries.length === 0 ? <p className="rounded-xl bg-[#f4f7fa] px-3 py-4 text-[12px] leading-4 text-muted-foreground">No active enquiries in this scope.</p> : openEnquiries.slice(0, 3).map(lead => <button key={lead.id} onClick={() => navigate("/leads")} className="flex w-full items-center gap-2 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{lead.firstName} {lead.lastName}</span><span className="block truncate text-[11px] text-muted-foreground">{lead.companyName || lead.propertyName || lead.status}</span></span><span className="text-[12px] font-semibold tabular-nums">{money(lead.estimatedValueCents)}</span></button>)}</div></div>
      <div className="surface p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Converted value</p><h3 className="mt-1 text-sm font-semibold">Key wins</h3></div><Award className="h-4 w-4 text-[#0090b4]" /></div><div className="mt-4 space-y-2.5">{keyWins.length === 0 ? <p className="rounded-xl bg-[#f4f7fa] px-3 py-4 text-[12px] leading-4 text-muted-foreground">Closed-won opportunities will appear here.</p> : keyWins.slice(0, 3).map(win => <button key={win.id} onClick={() => navigate("/opportunities")} className="flex w-full items-center gap-2 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{win.name}</span><span className="block truncate text-[11px] text-muted-foreground">{win.companyName || win.propertyName || "Won business"}</span></span><span className="text-[12px] font-semibold tabular-nums text-[#245b89]">{money(win.valueCents)}</span></button>)}</div></div>
      <div className="surface p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Highest value</p><h3 className="mt-1 text-sm font-semibold">Business potential</h3></div><TrendingUp className="h-4 w-4 text-[#00758f]" /></div><div className="mt-4 space-y-2.5">{businessPotential.length === 0 ? <p className="rounded-xl bg-[#f4f7fa] px-3 py-4 text-[12px] leading-4 text-muted-foreground">Open pipeline potential will appear here.</p> : businessPotential.slice(0, 3).map(item => <button key={item.id} onClick={() => navigate("/opportunities")} className="flex w-full items-center gap-2 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{item.name}</span><span className="block truncate text-[11px] text-muted-foreground">{item.stage} · {item.probability}%</span></span><span className="text-[12px] font-semibold tabular-nums">{money(item.valueCents)}</span></button>)}</div></div>
      <div className="surface p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Schedule</p><h3 className="mt-1 text-sm font-semibold">Calendar highlights</h3></div><CalendarClock className="h-4 w-4 text-[#00758f]" /></div><div className="mt-4 space-y-2.5">{calendarHighlights.length === 0 ? <p className="rounded-xl bg-[#f4f7fa] px-3 py-4 text-[12px] leading-4 text-muted-foreground">No upcoming calendar highlights.</p> : calendarHighlights.slice(0, 3).map(item => <button key={item.id} onClick={() => navigate("/calendar")} className="flex w-full items-center gap-2 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{item.title}</span><span className="block truncate text-[11px] text-muted-foreground">{item.propertyName} · {shortDate(item.dueAt)}</span></span><StatusBadge value={item.type} /></button>)}</div></div>
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <div className="surface p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Sales movement</p><h3 className="mt-2 font-display text-[1.45rem] tracking-[-0.02em]">Sales funnel</h3><p className="mt-1 text-xs text-muted-foreground">Opportunity volume and value across the exact six stages.</p></div><Button variant="ghost" size="sm" onClick={() => navigate("/opportunities")} className="rounded-lg text-xs">Pipeline <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></div><div className="mt-7 space-y-4" role="img" aria-label="Sales funnel by opportunity stage">{funnel.map((item, index) => { const width = item.count === 0 ? 3 : Math.max(12, (item.count / maxFunnel) * 100 - index * 2); return <div key={item.stage} className="grid items-center gap-3 sm:grid-cols-[112px_1fr_90px]"><p className="text-[13px] font-semibold text-[#44566c]">{item.stage}</p><div className="h-8 overflow-hidden rounded-lg bg-[#edf3f8]"><div className="flex h-full items-center rounded-lg px-3 text-[12px] font-semibold text-white transition-[width] duration-500" style={{ width: `${width}%`, background: `color-mix(in oklab, #002460 ${100 - index * 8}%, #6cccd8)` }}>{item.count > 0 ? item.count : ""}</div></div><p className="text-right text-[13px] font-semibold tabular-nums">{money(item.valueCents)}</p></div>; })}</div><div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#e3e9f0] pt-4 text-[12px] text-muted-foreground"><span><strong className="text-foreground">{funnel.reduce((sum, item) => sum + item.count, 0)}</strong> total opportunities</span><span><strong className="text-foreground">{money(funnel.reduce((sum, item) => sum + item.valueCents, 0))}</strong> gross value</span></div></div>
      <div className="surface overflow-hidden"><SectionTitle eyebrow="Next actions" title="Priority tasks" icon={ListTodo} action={() => navigate("/activities")} />{upcomingTasks.length === 0 ? <EmptyState icon={ListTodo} title="No open tasks" description="Open and overdue tasks in this scope will appear here." /> : <div className="divide-y divide-[#e8edf3]">{upcomingTasks.map(task => { const overdue = !!task.dueAt && new Date(task.dueAt) < new Date(); return <button key={task.id} onClick={() => navigate("/activities")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#f7fafc] sm:px-6"><span className={`h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-rose-500" : task.priority === "High" ? "bg-amber-500" : "bg-emerald-500"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{task.title}</span><span className="mt-1 block text-[12px] text-muted-foreground">{task.propertyName} · {shortDate(task.dueAt)}</span></span>{overdue && <StatusBadge value="Overdue" />}</button>; })}</div>}</div>
    </section>

    <section className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <div className="surface overflow-hidden"><SectionTitle eyebrow="Today" title="Appointments" icon={CalendarClock} action={() => navigate("/calendar")} />{todayAppointments.length === 0 ? <EmptyState icon={CalendarClock} title="No appointments today" description="Scheduled calls and meetings for this scope will appear here." /> : <div className="divide-y divide-[#e8edf3]">{todayAppointments.slice(0, 5).map(item => <TimelineRow key={item.id} title={item.title} meta={`${item.subtype} · ${item.propertyName}`} time={fullDateTime(item.startedAt)} />)}</div>}</div>
      <div className="surface overflow-hidden"><SectionTitle eyebrow="Next 14 days" title="Upcoming calls & meetings" icon={Clock3} action={() => navigate("/calendar")} />{upcomingEngagements.length === 0 ? <EmptyState icon={Clock3} title="No upcoming engagements" description="Future commercial calls and meetings will appear here." /> : <div className="divide-y divide-[#e8edf3]">{upcomingEngagements.slice(0, 5).map(item => <TimelineRow key={item.id} title={item.title} meta={`${item.subtype} · ${item.propertyName}`} time={fullDateTime(item.startedAt)} />)}</div>}</div>
      <div className="surface overflow-hidden lg:col-span-2 xl:col-span-1"><SectionTitle eyebrow="Recognition" title="Recent achievements" icon={Award} action={() => navigate("/achievements")} />{recentAchievements.length === 0 ? <EmptyState icon={Award} title="No achievements recorded" description="Validated commercial achievements will be visible here." /> : <div className="divide-y divide-[#e8edf3]">{recentAchievements.slice(0, 5).map(item => <button key={item.id} onClick={() => navigate("/achievements")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#f7fafc]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f5efe3] text-[#9a7337]"><Award className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.organizationActivity}</span><span className="mt-1 block text-[12px] text-muted-foreground">{item.propertyName} · {money(item.potentialValueCents)}</span></span><StatusBadge value={item.status} /></button>)}</div>}</div>
    </section>

    <section className="mt-5"><div className="surface overflow-hidden"><SectionTitle eyebrow="Recently logged" title="Commercial activity" icon={Activity} action={() => navigate("/activities")} />{recentActivities.length === 0 ? <EmptyState icon={Activity} title="No recent activity" description="Calls, meetings, notes, and tasks will build the commercial timeline." /> : <div className="grid divide-y divide-[#e8edf3] md:grid-cols-2 md:divide-x md:divide-y-0">{[recentActivities.slice(0, 4), recentActivities.slice(4, 8)].map((column, index) => <div key={index} className="divide-y divide-[#e8edf3]">{column.map(item => <TimelineRow key={item.id} title={item.title} meta={`${item.subtype} · ${item.propertyName}`} time={shortDate(item.createdAt)} />)}</div>)}</div>}</div></section>

    <section className="surface mt-5 overflow-hidden"><SectionTitle eyebrow="Recently touched" title="Opportunity momentum" icon={CircleDollarSign} action={() => navigate("/opportunities")} />{recentOpportunities.length === 0 ? <EmptyState icon={CircleDollarSign} title="No opportunities yet" description="Convert a qualified lead or add an opportunity to begin building the pipeline." /> : <div className="overflow-x-auto"><table className="data-table w-full"><thead><tr><th>Opportunity</th><th>Property</th><th>Stage</th><th>Value</th><th>Probability</th><th>Updated</th></tr></thead><tbody>{recentOpportunities.map(item => <tr key={item.id} className="cursor-pointer" onClick={() => navigate("/opportunities")}><td><span className="block font-semibold">{item.name}</span><span className="mt-1 block text-[12px] text-muted-foreground">{item.companyName || item.businessType}</span></td><td>{item.propertyName}</td><td><StatusBadge value={item.stage} /></td><td className="font-semibold tabular-nums">{money(item.valueCents)}</td><td>{item.probability}%</td><td className="text-muted-foreground">{shortDate(item.updatedAt)}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}

function SectionTitle({ eyebrow, title, icon: Icon, action }: { eyebrow: string; title: string; icon: typeof Activity; action?: () => void }) { return <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-6"><div><p className="eyebrow">{eyebrow}</p><h3 className="mt-2 font-display text-[1.35rem] tracking-[-0.02em]">{title}</h3></div>{action ? <Button variant="ghost" size="icon" onClick={action} className="h-8 w-8 rounded-lg"><ArrowRight className="h-3.5 w-3.5" /></Button> : <Icon className="h-5 w-5 text-[#8a9a90]" />}</div>; }
function TimelineRow({ title, meta, time }: { title: string; meta: string; time: string }) { return <div className="flex items-start gap-3 px-5 py-3.5"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#b58c45]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{title}</p><p className="mt-1 truncate text-[12px] text-muted-foreground">{meta}</p></div><p className="shrink-0 text-[11px] text-muted-foreground">{time}</p></div>; }
