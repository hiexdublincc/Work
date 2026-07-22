import { CRMDetailSheet, RecordTable } from "@/components/crm/CRMRecords";
import { DetailPair, DialogActions, FieldGrid, FilterSelect, SearchFilters, SelectField, TextAreaField, TextField } from "@/components/crm/CRMForms";
import { CreateButton, EmptyState, ErrorPanel, LoadingPanel, PageHeader, Pagination, StatusBadge, fullDateTime, useSearchShortcut } from "@/components/crm/CRMPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { CalendarClock, Check, CheckCircle2, Circle, Clock3, FileBarChart2, FileText, Pencil, Phone, Printer, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

const types = ["note", "call", "meeting"] as const; const states = ["open", "completed", "overdue", "all"] as const; const priorities = ["Low", "Normal", "High"] as const; const entityTypes = ["company", "contact", "lead", "opportunity"] as const;
type ActivityForm = { type: typeof types[number]; subtype: string; title: string; description: string; entityType: typeof entityTypes[number] | ""; entityId: string; propertyId: string; ownerId: string; priority: typeof priorities[number]; dueAt: string; startedAt: string; endsAt: string; reminderAt: string };
const emptyForm: ActivityForm = { type: "note", subtype: "General", title: "", description: "", entityType: "", entityId: "", propertyId: "", ownerId: "", priority: "Normal", dueAt: "", startedAt: "", endsAt: "", reminderAt: "" };
const derivesProperty = (entityType: string) => entityType === "lead" || entityType === "opportunity";
type ActivityRow = inferRouterOutputs<AppRouter>["activities"]["list"]["items"][number];

export default function Activities() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(""); const [type, setType] = useState(""); const [subtype, setSubtype] = useState(""); const [state, setState] = useState<typeof states[number]>("open"); const [propertyId, setPropertyId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false); const [editingId, setEditingId] = useState<number | null>(null); const [selected, setSelected] = useState<ActivityRow | null>(null); const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [reportOpen, setReportOpen] = useState(false); const [reportPropertyId, setReportPropertyId] = useState(""); const [reportFrom, setReportFrom] = useState(mondayInput(new Date())); const [reportTo, setReportTo] = useState(dateInput(new Date()));
  useEffect(() => {
    document.body.classList.toggle("printing-report", reportOpen);
    return () => document.body.classList.remove("printing-report");
  }, [reportOpen]);
  const searchRef = useSearchShortcut(); const utils = trpc.useUtils(); const references = trpc.metadata.references.useQuery();
  const query = trpc.activities.list.useQuery({ page, pageSize: 25, search, type: type as typeof types[number] || undefined, subtype: subtype as any || undefined, state, propertyId: propertyId ? Number(propertyId) : undefined, sort: "due" });
  const create = trpc.activities.create.useMutation({ onSuccess: () => saved("Activity logged"), onError: error => toast.error(error.message) }); const update = trpc.activities.update.useMutation({ onSuccess: () => saved("Activity updated"), onError: error => toast.error(error.message) });
  const complete = trpc.activities.setCompleted.useMutation({ onSuccess: (_, input) => { toast.success(input.completed ? "Activity completed" : "Activity reopened"); utils.activities.invalidate(); utils.dashboard.invalidate(); } });
  const reportQuery = trpc.activities.weeklyReport.useQuery(
    { propertyId: Number(reportPropertyId), from: new Date(`${reportFrom}T00:00:00`), to: new Date(`${reportTo}T00:00:00`) },
    { enabled: false },
  );
  const propertyOptions = references.data?.properties.map(item => ({ value: String(item.id), label: item.name })) ?? []; const ownerOptions = references.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? []; const subtypeOptions = (references.data?.taxonomy.activitySubtypes ?? []).map(value => ({ value, label: value }));
  const entityOptions = useMemo(() => { const data = references.data; if (!data || !form.entityType) return []; if (form.entityType === "company") return data.companies.map(item => ({ value: String(item.id), label: item.label })); if (form.entityType === "contact") return data.contacts.map(item => ({ value: String(item.id), label: item.label })); if (form.entityType === "lead") return data.leads.map(item => ({ value: String(item.id), label: item.label })); return data.opportunities.map(item => ({ value: String(item.id), label: item.label })); }, [references.data, form.entityType]);
  useEffect(() => setPage(1), [search, type, subtype, state, propertyId]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      openCreate();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [ownerOptions.length]);
  function set<K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) { setForm(current => ({ ...current, [key]: value })); }
  function saved(message: string) { toast.success(message); setEditorOpen(false); setEditingId(null); utils.activities.invalidate(); utils.dashboard.invalidate(); }
  function openCreate(preset?: typeof types[number]) { setEditingId(null); setForm({ ...emptyForm, type: preset || "note", subtype: preset === "call" ? "Follow-up" : preset === "meeting" ? "Appointment booked" : "General", propertyId: propertyOptions.length === 1 ? propertyOptions[0].value : "", ownerId: ownerOptions.length === 1 ? ownerOptions[0].value : "", startedAt: preset && preset !== "note" ? new Date().toISOString().slice(0, 16) : "" }); setEditorOpen(true); }
  function openEdit() { if (!selected) return; const local = (value: Date | null) => value ? new Date(value).toISOString().slice(0, 16) : ""; setEditingId(selected.id); setForm({ type: selected.type, subtype: selected.subtype, title: selected.title, description: selected.description || "", entityType: selected.entityType ?? "", entityId: selected.entityId ? String(selected.entityId) : "", propertyId: String(selected.propertyId), ownerId: String(selected.ownerId), priority: selected.priority, dueAt: local(selected.dueAt), startedAt: local(selected.startedAt), endsAt: local(selected.endsAt), reminderAt: local(selected.reminderAt) }); setEditorOpen(true); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const date = (value: string) => value ? new Date(value) : null;
    const payload = {
      type: form.type, subtype: form.subtype as any, title: form.title, description: form.description || null,
      entityType: form.entityType || null, entityId: form.entityId ? Number(form.entityId) : null,
      propertyId: !derivesProperty(form.entityType) && form.propertyId ? Number(form.propertyId) : undefined,
      ownerId: form.ownerId ? Number(form.ownerId) : undefined, priority: form.priority,
      dueAt: date(form.dueAt), startedAt: date(form.startedAt), endsAt: date(form.endsAt), reminderAt: date(form.reminderAt),
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  }
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  return <>
    <PageHeader eyebrow="Commercial rhythm" title="Activities" description="Log a touchpoint in seconds, keep follow-ups visible, and preserve a chronological record around every relationship and opportunity." action={<div className="flex items-center gap-2"><Button variant="outline" onClick={() => { setReportPropertyId(propertyOptions.length === 1 ? propertyOptions[0].value : ""); setReportFrom(mondayInput(new Date())); setReportTo(dateInput(new Date())); setReportOpen(true); }} className="h-10 rounded-xl bg-white px-4"><FileBarChart2 className="mr-2 h-4 w-4" />Activity report</Button><CreateButton label="Log activity" onClick={() => openCreate()} /></div>} />
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{types.map(value => { const Icon = typeIcon(value); return <button key={value} onClick={() => openCreate(value)} className="surface flex items-center gap-3 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#a9bbae] hover:shadow-[0_10px_24px_rgba(26,54,43,0.07)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf2ed] text-[#416a56]"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold capitalize">{value}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">Quick log</span></span></button>; })}</div>
    <SearchFilters value={search} onChange={setSearch} searchRef={searchRef} activeFilters={[type, subtype, propertyId, state !== "open" ? state : ""].filter(Boolean).length} onClear={() => { setType(""); setSubtype(""); setPropertyId(""); setState("open"); }}><FilterSelect value={propertyId} onChange={setPropertyId} options={propertyOptions} placeholder="All properties" className="w-[180px]" /><FilterSelect value={type} onChange={setType} options={types.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} placeholder="All types" /><FilterSelect value={subtype} onChange={setSubtype} options={subtypeOptions} placeholder="All activity types" className="w-[170px]" /><FilterSelect value={state} onChange={value => setState(value as typeof states[number])} options={states.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} placeholder="State" /></SearchFilters>
    {query.isLoading ? <LoadingPanel rows={8} /> : query.error ? <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} /> : !rows.length ? <div className="surface"><EmptyState icon={CheckCircle2} title={state === "open" ? "No open activities" : "No activities in this view"} description={state === "open" ? "Your current scope is clear. Log the next call, meeting, or note when it arises." : "Try changing the state or broadening the filters."} action={<CreateButton label="Log activity" onClick={() => openCreate()} />} /></div> : <div className="surface overflow-hidden"><RecordTable columns={["Activity", "Linked record", "Property", "Owner", "Timing", "State"]}>{rows.map(row => { const overdue = !!row.dueAt && !row.completedAt && new Date(row.dueAt).getTime() < Date.now(); const Icon = typeIcon(row.type); return <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b border-[#edf0ed] transition-colors last:border-0 hover:bg-[#f8faf7]"><td className="px-4 py-3.5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef2ee] text-[#466b58]"><Icon className="h-4 w-4" /></span><div><p className="text-xs font-semibold">{row.title}</p><p className="mt-1 text-[12px] text-muted-foreground capitalize">{row.type} · {row.subtype}{row.dueAt ? " · Task" : ""}</p></div></div></td><td className="px-4 py-3.5"><p className="max-w-[210px] truncate text-xs">{row.entityName || "—"}</p><p className="mt-1 text-[11px] capitalize text-muted-foreground">{row.entityType || "No linked record"}</p></td><td className="px-4 py-3.5 text-xs">{row.propertyName}</td><td className="px-4 py-3.5 text-xs">{row.ownerName || "—"}</td><td className="px-4 py-3.5"><p className={`text-[13px] font-medium ${overdue ? "text-rose-700" : ""}`}>{fullDateTime(row.dueAt || row.startedAt)}</p><p className="mt-1 text-[11px] text-muted-foreground">{row.priority} priority</p></td><td className="px-4 py-3.5"><button onClick={event => { event.stopPropagation(); complete.mutate({ id: row.id, completed: !row.completedAt }); }} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold ${row.completedAt ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{row.completedAt ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}{row.completedAt ? "Completed" : overdue ? "Overdue" : "Open"}</button></td></tr>; })}</RecordTable><Pagination page={query.data?.page ?? page} pageSize={query.data?.pageSize ?? 25} total={query.data?.total ?? 0} onPage={setPage} /></div>}
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.5rem] p-6"><DialogHeader><DialogTitle className="font-display text-2xl">{editingId ? "Edit activity" : `Log ${form.type}`}</DialogTitle><DialogDescription>Only the title is required. Link a company, contact, lead, or opportunity if this relates to one — it's optional.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-3 space-y-5">
      <FieldGrid>
        <TextField label="Title" value={form.title} onChange={value => set("title", value)} required />
        <SelectField label="Core type" value={form.type} onChange={value => set("type", value as ActivityForm["type"])} options={types.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
        <SelectField label="Commercial activity" value={form.subtype} onChange={value => set("subtype", value)} options={subtypeOptions} />
        <SelectField label="Owner" value={form.ownerId} onChange={value => set("ownerId", value)} options={ownerOptions} />
        <SelectField label="Priority" value={form.priority} onChange={value => set("priority", value as ActivityForm["priority"])} options={priorities.map(value => ({ value, label: value }))} />
        <TextField label="Due date (set to also track as a task)" type="datetime-local" value={form.dueAt} onChange={value => set("dueAt", value)} />
        {!derivesProperty(form.entityType) && <SelectField label="Property" value={form.propertyId} onChange={value => set("propertyId", value)} options={propertyOptions} required />}
      </FieldGrid>
      <details className="group rounded-2xl border border-[#dce5ee] bg-white p-4" open={Boolean(form.entityType)}>
        <summary className="cursor-pointer list-none text-xs font-semibold text-[#002460]">Link to a record <span className="ml-2 font-normal text-muted-foreground">Optional — company, contact, lead, or opportunity</span></summary>
        <div className="mt-5"><FieldGrid><SelectField label="Linked record type" value={form.entityType} onChange={value => { set("entityType", value as ActivityForm["entityType"]); set("entityId", ""); }} options={entityTypes.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} placeholder="No linked record" /><SelectField label="Linked record" value={form.entityId} onChange={value => set("entityId", value)} options={entityOptions} placeholder={form.entityType ? "Select a record" : "Choose a type first"} /></FieldGrid></div>
      </details>
      <details className="group rounded-2xl border border-[#dce5ee] bg-white p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[#002460]">Scheduling <span className="ml-2 font-normal text-muted-foreground">Start, end, and reminder</span></summary>
        <div className="mt-5"><FieldGrid><TextField label="Start" type="datetime-local" value={form.startedAt} onChange={value => set("startedAt", value)} /><TextField label="End" type="datetime-local" value={form.endsAt} onChange={value => set("endsAt", value)} /><TextField label="Reminder" type="datetime-local" value={form.reminderAt} onChange={value => set("reminderAt", value)} /></FieldGrid></div>
      </details>
      <TextAreaField label="Details or outcome" value={form.description} onChange={value => set("description", value)} rows={5} />
      <DialogActions onCancel={() => setEditorOpen(false)} saving={create.isPending || update.isPending} disabled={!form.title || (!derivesProperty(form.entityType) && !form.propertyId)} submitLabel={editingId ? "Save activity" : "Log activity"} />
    </form></DialogContent></Dialog>
    <CRMDetailSheet open={selected !== null} onOpenChange={open => !open && setSelected(null)} title={selected?.title || "Activity"} eyebrow={selected ? `${selected.type} · ${selected.subtype}` : "Commercial activity"} action={<Button size="sm" onClick={openEdit} className="rounded-xl"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>}>
      {selected && <div className="space-y-6"><div className="rounded-2xl bg-[#173a2e] p-5 text-white"><div className="flex items-start gap-3"><CalendarClock className="mt-1 h-5 w-5 text-[#d9b777]" /><div><p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/55">{selected.completedAt ? "Completed" : "Scheduled"}</p><p className="mt-2 font-display text-xl">{fullDateTime(selected.dueAt || selected.startedAt)}</p><p className="mt-2 text-xs text-white/60">{selected.propertyName} · {selected.ownerName}</p></div></div></div><div className="grid gap-2 sm:grid-cols-2"><DetailPair label="Linked record" value={selected.entityName || "None"} /><DetailPair label="Record type" value={selected.entityType || "—"} /><DetailPair label="Activity type" value={selected.subtype} /><DetailPair label="Priority" value={<StatusBadge value={selected.priority} />} /><DetailPair label="Start" value={fullDateTime(selected.startedAt)} /><DetailPair label="End" value={fullDateTime(selected.endsAt)} /><DetailPair label="Reminder" value={fullDateTime(selected.reminderAt)} /><DetailPair label="Details / outcome" value={selected.description} wide /></div><Button onClick={() => complete.mutate({ id: selected.id, completed: !selected.completedAt })} variant={selected.completedAt ? "outline" : "default"} className="w-full rounded-xl">{selected.completedAt ? "Reopen activity" : "Mark complete"}</Button></div>}
    </CRMDetailSheet>

    <Dialog open={reportOpen} onOpenChange={setReportOpen}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl p-6">
        <DialogHeader><DialogTitle className="font-display text-2xl">Activity report</DialogTitle><DialogDescription>Built live from what's logged in Activities and Achievements for everyone at a property — pick a property and a date range.</DialogDescription></DialogHeader>
        <div className="mt-3 space-y-4">
          <SelectField label="Property" value={reportPropertyId} onChange={setReportPropertyId} options={propertyOptions} required />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="From" type="date" value={reportFrom} onChange={setReportFrom} required />
            <TextField label="To" type="date" value={reportTo} onChange={setReportTo} required />
          </div>
          <div className="flex flex-wrap gap-2">
            {reportPresets.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => { const range = preset.range(); setReportFrom(range.from); setReportTo(range.to); }}
                className="rounded-full border border-[#dce5ee] bg-white px-3 py-1.5 text-xs font-medium text-[#44566c] transition-colors hover:border-[#a9bbae] hover:text-[#002460]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Button onClick={() => reportQuery.refetch()} disabled={!reportPropertyId || !reportFrom || !reportTo || reportQuery.isFetching} className="w-full rounded-xl">
            {reportQuery.isFetching ? "Generating…" : "Generate report"}
          </Button>
          {reportQuery.data && (
            <div data-print-target className="rounded-2xl border border-[#dce5ee] bg-white p-6">
              <ReportBody data={reportQuery.data} />
              <div className="mt-6 flex justify-end print:hidden">
                <Button variant="outline" onClick={() => window.print()} className="rounded-xl"><Printer className="mr-2 h-3.5 w-3.5" />Print</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
function typeIcon(type: typeof types[number]) { return type === "call" ? Phone : type === "meeting" ? UsersRound : FileText; }

type WeeklyReportData = inferRouterOutputs<AppRouter>["activities"]["weeklyReport"];
function ReportBody({ data }: { data: WeeklyReportData }) {
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#111" }}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-[#555]">{data.propertyName}</p>
        <p className="text-base font-bold">{data.rangeLabel}</p>
      </div>
      <h1 className="mt-7 border-b-2 border-[#111] pb-1.5 text-[15px] font-bold uppercase tracking-[0.07em]">Key Wins</h1>
      <div className="mt-2 text-[15px] leading-6"><Narrative text={data.keyWins} /></div>
      <h1 className="mt-7 border-b-2 border-[#111] pb-1.5 text-[15px] font-bold uppercase tracking-[0.07em]">Key Activity</h1>
      <div className="mt-2 text-[15px] leading-6"><Narrative text={data.keyActivity} /></div>
    </div>
  );
}
function Narrative({ text }: { text: string | null }) {
  const lines = (text || "").split("\n").map(line => line.replace(/^-\s*/, "").trim()).filter(Boolean);
  if (!lines.length) return <span className="text-muted-foreground">No entries recorded in this period.</span>;
  return <ul className="list-disc space-y-1.5 pl-4">{lines.map((line, index) => <li key={index}>{boldSegments(line)}</li>)}</ul>;
}
function boldSegments(line: string) {
  return line.split(/(\*\*.+?\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : <span key={index}>{part}</span>);
}
function mondayInput(value: Date) { const date = new Date(value); const day = date.getDay(); const distance = day === 0 ? -6 : 1 - day; date.setDate(date.getDate() + distance); return date.toISOString().slice(0, 10); }
function dateInput(value: Date) { return value.toISOString().slice(0, 10); }
const reportPresets: { label: string; range: () => { from: string; to: string } }[] = [
  { label: "This week", range: () => { const now = new Date(); return { from: mondayInput(now), to: dateInput(now) }; } },
  { label: "Last week", range: () => { const now = new Date(); const thisMonday = new Date(mondayInput(now)); const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate() - 7); const lastSunday = new Date(thisMonday); lastSunday.setDate(lastSunday.getDate() - 1); return { from: dateInput(lastMonday), to: dateInput(lastSunday) }; } },
  { label: "MTD", range: () => { const now = new Date(); return { from: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: dateInput(now) }; } },
  { label: "Last month", range: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return { from: dateInput(start), to: dateInput(end) }; } },
  { label: "YTD", range: () => { const now = new Date(); return { from: dateInput(new Date(now.getFullYear(), 0, 1)), to: dateInput(now) }; } },
  { label: "Last year", range: () => { const now = new Date(); return { from: dateInput(new Date(now.getFullYear() - 1, 0, 1)), to: dateInput(new Date(now.getFullYear() - 1, 11, 31)) }; } },
];
