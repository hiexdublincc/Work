import { FilterSelect, SearchFilters } from "@/components/crm/CRMForms";
import { EmptyState, ErrorPanel, LoadingPanel, PageHeader, StatusBadge, money } from "@/components/crm/CRMPrimitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { BarChart3, CalendarClock, PhoneCall, Printer, ShieldAlert, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppRouter } from "../../../server/routers";

type Summary = inferRouterOutputs<AppRouter>["reports"]["summary"];
type Forecast = inferRouterOutputs<AppRouter>["reports"]["revenueForecast"];
type LostBusiness = inferRouterOutputs<AppRouter>["reports"]["lostBusiness"];

export default function Reports() {
  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const refs = trpc.metadata.references.useQuery();
  const filters = useMemo(
    () => ({
      propertyId: propertyId ? Number(propertyId) : undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }),
    [propertyId, ownerId, from, to],
  );
  const summary = trpc.reports.summary.useQuery(filters);
  const forecast = trpc.reports.revenueForecast.useQuery(filters);
  const lostBusiness = trpc.reports.lostBusiness.useQuery(filters);

  const propertyOptions = refs.data?.properties.map(item => ({ value: String(item.id), label: item.name })) ?? [];
  const ownerOptions = refs.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? [];
  const activeFilters = [propertyId, ownerId, from, to].filter(Boolean).length;
  const loading = summary.isLoading || forecast.isLoading || lostBusiness.isLoading || refs.isLoading;
  const error = summary.error || forecast.error || lostBusiness.error || refs.error;
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("printing-report", printing);
    return () => document.body.classList.remove("printing-report");
  }, [printing]);
  useEffect(() => {
    const reset = () => setPrinting(false);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);
  const scopeLabel = [
    propertyOptions.find(item => item.value === propertyId)?.label || "All properties",
    ownerOptions.find(item => item.value === ownerId)?.label || "All owners",
    from && to ? `${new Date(from).toLocaleDateString("en-GB")} - ${new Date(to).toLocaleDateString("en-GB")}` : from ? `From ${new Date(from).toLocaleDateString("en-GB")}` : to ? `To ${new Date(to).toLocaleDateString("en-GB")}` : "All dates",
  ].join(" · ");

  return (
    <div className="page-enter max-w-[1500px]">
      <PageHeader
        eyebrow="Commercial reporting"
        title="Reports"
        description="Leads by status, pipeline by stage, activity levels, and weighted revenue forecast across your authorised scope."
        action={!loading && !error ? <Button variant="outline" onClick={() => { setPrinting(true); requestAnimationFrame(() => window.print()); }} className="h-10 rounded-xl bg-white px-4"><Printer className="mr-2 h-4 w-4" />Print report</Button> : undefined}
      />

      <SearchFilters
        value=""
        onChange={() => {}}
        activeFilters={activeFilters}
        onClear={() => {
          setPropertyId("");
          setOwnerId("");
          setFrom("");
          setTo("");
        }}
      >
        <FilterSelect value={propertyId} onChange={setPropertyId} options={propertyOptions} placeholder="All properties" className="w-[190px]" />
        <FilterSelect value={ownerId} onChange={setOwnerId} options={ownerOptions} placeholder="All owners" className="w-[170px]" />
        <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="h-9 rounded-xl border border-[#dde4de] bg-white px-3 text-xs shadow-none" aria-label="From date" />
        <input type="date" value={to} onChange={event => setTo(event.target.value)} className="h-9 rounded-xl border border-[#dde4de] bg-white px-3 text-xs shadow-none" aria-label="To date" />
      </SearchFilters>

      {loading ? (
        <LoadingPanel rows={8} />
      ) : error ? (
        <ErrorPanel message={error.message} onRetry={() => { summary.refetch(); forecast.refetch(); lostBusiness.refetch(); }} />
      ) : (
        <div data-print-target className="space-y-4">
          <div className="hidden items-baseline justify-between border-b-2 border-[#111] pb-2 print:flex" style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#111" }}>
            <div><p className="text-lg font-bold">JMK Group — Commercial Report</p><p className="text-xs text-[#555]">{scopeLabel}</p></div>
            <p className="text-xs text-[#555]">Generated {new Date().toLocaleDateString("en-GB")}</p>
          </div>
          <LeadsByStatus data={summary.data!.leadsByStatus} />
          <OpportunitiesByStage data={summary.data!.opportunitiesByStage} />
          <ActivitySummary data={summary.data!.activitySummary} />
          <RevenueForecast data={forecast.data!} />
          <LostBusinessAnalysis data={lostBusiness.data!} />
        </div>
      )}
    </div>
  );
}

function Panel({ icon: Icon, title, description, children }: { icon: typeof BarChart3; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[#e8edf3] px-5 py-5 sm:px-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f7f9] text-[#00758f]"><Icon className="h-4 w-4" /></span>
        <div><h3 className="font-display text-lg tracking-[-0.015em]">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function LeadsByStatus({ data }: { data: Summary["leadsByStatus"] }) {
  const max = Math.max(...data.map(item => item.count), 1);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <Panel icon={PhoneCall} title="Leads by status" description="Enquiry volume and estimated value across the lead qualification funnel.">
      {total === 0 ? (
        <EmptyState icon={PhoneCall} title="No leads in this view" description="Leads matching the selected filters will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.status} className="grid items-center gap-3 sm:grid-cols-[130px_1fr_110px]">
              <p className="text-[13px] font-semibold text-[#44566c]">{item.status}</p>
              <div className="h-7 overflow-hidden rounded-lg bg-[#edf3f8]">
                <div className="flex h-full items-center rounded-lg bg-[#00758f] px-3 text-[12px] font-semibold text-white transition-[width] duration-500" style={{ width: `${item.count === 0 ? 3 : Math.max(8, (item.count / max) * 100)}%` }}>
                  {item.count > 0 ? item.count : ""}
                </div>
              </div>
              <p className="text-right text-[13px] font-semibold tabular-nums">{money(item.estimatedValueCents)}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function OpportunitiesByStage({ data }: { data: Summary["opportunitiesByStage"] }) {
  const max = Math.max(...data.map(item => item.count), 1);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <Panel icon={BarChart3} title="Opportunities by stage" description="Pipeline volume, gross value, and probability-weighted value across the exact six stages.">
      {total === 0 ? (
        <EmptyState icon={BarChart3} title="No opportunities in this view" description="Opportunities matching the selected filters will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.stage} className="grid items-center gap-3 sm:grid-cols-[130px_1fr_110px_110px]">
              <p className="text-[13px] font-semibold text-[#44566c]">{item.stage}</p>
              <div className="h-7 overflow-hidden rounded-lg bg-[#edf3f8]">
                <div
                  className="flex h-full items-center rounded-lg px-3 text-[12px] font-semibold text-white transition-[width] duration-500"
                  style={{ width: `${item.count === 0 ? 3 : Math.max(8, (item.count / max) * 100)}%`, background: `color-mix(in oklab, #002460 ${100 - index * 8}%, #6cccd8)` }}
                >
                  {item.count > 0 ? item.count : ""}
                </div>
              </div>
              <p className="text-right text-[13px] font-semibold tabular-nums">{money(item.valueCents)}</p>
              <p className="text-right text-[13px] tabular-nums text-muted-foreground">{money(item.weightedValueCents)} wtd.</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ActivitySummary({ data }: { data: Summary["activitySummary"] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <Panel icon={CalendarClock} title="Activity summary" description="Logged calls, meetings, tasks, and notes with completion and overdue counts.">
      {total === 0 ? (
        <EmptyState icon={CalendarClock} title="No activity in this view" description="Activity matching the selected filters will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.map(item => (
            <div key={item.type} className="rounded-2xl border border-[#e8edf3] bg-[#f7fafc] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.type}</p>
              <p className="mt-2 font-display text-2xl">{item.count}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span>{item.completed} completed</span>
                <span>{item.open} open</span>
                {item.overdue > 0 && <span className="font-semibold text-rose-700">{item.overdue} overdue</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function RevenueForecast({ data }: { data: Forecast }) {
  const max = Math.max(...data.map(item => item.grossValueCents), 1);
  const totalGross = data.reduce((sum, item) => sum + item.grossValueCents, 0);
  const totalWeighted = data.reduce((sum, item) => sum + item.weightedValueCents, 0);
  return (
    <Panel icon={TrendingUp} title="Revenue forecast" description="Open opportunity value by expected close month, weighted by stage probability.">
      {data.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No forecastable opportunities" description="Open opportunities with an expected close date will appear here." />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {data.map(item => (
              <div key={item.month} className="grid items-center gap-3 sm:grid-cols-[110px_1fr_110px_110px]">
                <p className="text-[13px] font-semibold text-[#44566c]">{monthLabel(item.month)}</p>
                <div className="h-7 overflow-hidden rounded-lg bg-[#edf3f8]">
                  <div className="flex h-full items-center rounded-lg bg-[#8a6a3f] px-3 text-[12px] font-semibold text-white transition-[width] duration-500" style={{ width: `${Math.max(8, (item.grossValueCents / max) * 100)}%` }}>
                    {item.count}
                  </div>
                </div>
                <p className="text-right text-[13px] font-semibold tabular-nums">{money(item.grossValueCents)}</p>
                <p className="text-right text-[13px] tabular-nums text-muted-foreground">{money(item.weightedValueCents)} wtd.</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[#e3e9f0] pt-4 text-[12px] text-muted-foreground">
            <span><strong className="text-foreground">{money(totalGross)}</strong> gross forecast</span>
            <span><strong className="text-foreground">{money(totalWeighted)}</strong> weighted forecast</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function LostBusinessAnalysis({ data }: { data: LostBusiness }) {
  const reasonsWithData = data.byReason.filter(item => item.count > 0);
  const max = Math.max(...reasonsWithData.map(item => item.count), 1);

  return (
    <Panel icon={ShieldAlert} title="Lost business analysis" description="Closed Lost opportunities broken down by reason, property, business type, stage at loss, and competitor.">
      {data.totalCount === 0 ? (
        <EmptyState icon={ShieldAlert} title="No lost business in this view" description="Opportunities marked Closed Lost with their required lost reason will appear here." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span><strong className="text-foreground">{data.totalCount}</strong> lost opportunities</span>
            <span><strong className="text-foreground">{money(data.totalValueCents)}</strong> lost value</span>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">By lost reason</p>
            <div className="space-y-2.5">
              {reasonsWithData.map(item => (
                <div key={item.reason} className="grid items-center gap-3 sm:grid-cols-[150px_1fr_100px]">
                  <p className="text-[13px] font-semibold text-[#44566c]">{item.reason}</p>
                  <div className="h-6 overflow-hidden rounded-lg bg-[#edf3f8]">
                    <div className="flex h-full items-center rounded-lg bg-rose-600 px-3 text-[12px] font-semibold text-white transition-[width] duration-500" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }}>{item.count}</div>
                  </div>
                  <p className="text-right text-[13px] font-semibold tabular-nums">{money(item.valueCents)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">By property</p>
              <div className="space-y-2">
                {data.byProperty.map(item => (
                  <div key={item.propertyId} className="flex items-center justify-between rounded-xl bg-[#f7fafc] px-3 py-2 text-[13px]">
                    <span className="font-medium">{item.propertyName || "Unassigned"}</span>
                    <span className="font-semibold tabular-nums">{item.count} · {money(item.valueCents)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">By business type</p>
              <div className="space-y-2">
                {data.byType.map(item => (
                  <div key={item.type} className="flex items-center justify-between rounded-xl bg-[#f7fafc] px-3 py-2 text-[13px]">
                    <span className="font-medium">{item.type}</span>
                    <span className="font-semibold tabular-nums">{item.count} · {money(item.valueCents)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">By stage at loss</p>
              <div className="space-y-2">
                {data.byStageAtLoss.map(item => (
                  <div key={item.stage} className="flex items-center justify-between rounded-xl bg-[#f7fafc] px-3 py-2 text-[13px]">
                    <StatusBadge value={item.stage} />
                    <span className="font-semibold tabular-nums">{item.count} · {money(item.valueCents)}</span>
                  </div>
                ))}
              </div>
            </div>
            {data.byCompetitor.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">By competitor</p>
                <div className="space-y-2">
                  {data.byCompetitor.slice(0, 6).map(item => (
                    <div key={item.competitorHotel} className="flex items-center justify-between rounded-xl bg-[#f7fafc] px-3 py-2 text-[13px]">
                      <span className="font-medium">{item.competitorHotel}</span>
                      <span className="font-semibold tabular-nums">{item.count} · {money(item.valueCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
