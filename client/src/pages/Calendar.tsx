import { EmptyState, ErrorPanel, LoadingPanel, PageHeader, StatusBadge, fullDateTime } from "@/components/crm/CRMPrimitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ListFilter, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type CalendarEvent = inferRouterOutputs<AppRouter>["activities"]["calendar"][number];
type CalendarView = "day" | "week" | "month";
const ALL = "all";

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [propertyId, setPropertyId] = useState(ALL);
  const [ownerId, setOwnerId] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [subtype, setSubtype] = useState(ALL);
  const references = trpc.metadata.references.useQuery();
  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(cursor), to: endOfDay(cursor) };
    if (view === "week") return { from: startOfWeek(cursor, { weekStartsOn: 1 }), to: endOfWeek(cursor, { weekStartsOn: 1 }) };
    return { from: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), to: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) };
  }, [cursor, view]);
  const input = useMemo(() => ({
    from: range.from,
    to: range.to,
    propertyId: propertyId === ALL ? undefined : Number(propertyId),
    ownerId: ownerId === ALL ? undefined : Number(ownerId),
    type: type === ALL ? undefined : type as "call" | "meeting" | "note",
    subtype: subtype === ALL ? undefined : subtype as NonNullable<typeof references.data>["taxonomy"]["activitySubtypes"][number],
  }), [range, propertyId, ownerId, type, subtype, references.data]);
  const calendar = trpc.activities.calendar.useQuery(input);
  const events = calendar.data ?? [];
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  const dayEvents = events.filter(event => eventDate(event) && isSameDay(eventDate(event)!, selectedDay));
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const date = eventDate(event); if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), event]);
    });
    return map;
  }, [events]);

  if (references.isLoading) return <><PageHeader title="Commercial calendar" description="Coordinate hotel calls, meetings, tasks, and follow-ups." /><LoadingPanel rows={7} /></>;
  if (references.error || !references.data) return <ErrorPanel message={references.error?.message} onRetry={() => references.refetch()} />;
  const refs = references.data;
  const periodLabel = view === "day" ? format(cursor, "EEEE, d MMMM yyyy") : view === "week" ? `${format(range.from, "d MMM")}–${format(range.to, "d MMM yyyy")}` : format(cursor, "MMMM yyyy");
  const move = (direction: -1 | 1) => {
    const next = view === "day" ? (direction === 1 ? addDays(cursor, 1) : subDays(cursor, 1)) : view === "week" ? (direction === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1)) : (direction === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    setCursor(next); setSelectedDay(next);
  };
  const chooseDay = (day: Date) => { setSelectedDay(day); if (view === "day") setCursor(day); };

  return <div className="page-enter max-w-[1560px]">
    <PageHeader eyebrow="Shared schedule" title="Commercial calendar" description="Coordinate appointments, calls, tasks, meetings, site visits, and follow-ups across assigned properties." action={<Button onClick={() => navigate("/activities?create=1")} className="h-10 rounded-xl px-4"><Plus className="mr-2 h-4 w-4" />Log activity</Button>} />
    <section className="surface mb-5 p-3 sm:p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ef] text-[#37624e]"><ListFilter className="h-4 w-4" /></span><div><p className="text-xs font-semibold">Calendar filters</p><p className="text-[10px] text-muted-foreground">Scope events by property, owner, and commercial activity.</p></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:items-center"><Filter value={propertyId} onChange={setPropertyId} placeholder="All properties" items={refs.properties.map(item => ({ value: String(item.id), label: item.name }))} /><Filter value={ownerId} onChange={setOwnerId} placeholder="All owners" items={refs.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "Unnamed user" }))} /><Filter value={type} onChange={setType} placeholder="All types" items={refs.taxonomy.activityTypes.map(item => ({ value: item, label: title(item) }))} /><Filter value={subtype} onChange={setSubtype} placeholder="All activity" items={refs.taxonomy.activitySubtypes.map(item => ({ value: item, label: item }))} /></div></div></section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-[#e7ebe7] px-4 py-4 lg:flex-row lg:items-center lg:justify-between sm:px-6"><div><p className="eyebrow">{view} view</p><h2 className="mt-1 font-display text-2xl tracking-[-0.02em]">{periodLabel}</h2></div><div className="flex flex-wrap items-center gap-2"><Tabs value={view} onValueChange={value => setView(value as CalendarView)}><TabsList className="h-9 rounded-xl bg-[#f1f4f1] p-1"><TabsTrigger value="day" className="rounded-lg px-3 text-[10px]">Day</TabsTrigger><TabsTrigger value="week" className="rounded-lg px-3 text-[10px]">Week</TabsTrigger><TabsTrigger value="month" className="rounded-lg px-3 text-[10px]">Month</TabsTrigger></TabsList></Tabs><Button variant="outline" size="icon" onClick={() => move(-1)} className="h-9 w-9 rounded-xl bg-white" aria-label={`Previous ${view}`}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" onClick={() => { const now = new Date(); setCursor(now); setSelectedDay(now); }} className="h-9 rounded-xl bg-white px-4 text-xs">Today</Button><Button variant="outline" size="icon" onClick={() => move(1)} className="h-9 w-9 rounded-xl bg-white" aria-label={`Next ${view}`}><ChevronRight className="h-4 w-4" /></Button></div></div>
        {calendar.isLoading ? <LoadingPanel rows={6} /> : calendar.error ? <ErrorPanel message={calendar.error.message} onRetry={() => calendar.refetch()} /> : view === "month" ? <MonthGrid days={days} cursor={cursor} selectedDay={selectedDay} eventsByDay={eventsByDay} onSelect={chooseDay} /> : view === "week" ? <WeekGrid days={days} selectedDay={selectedDay} eventsByDay={eventsByDay} onSelect={chooseDay} /> : <DayAgenda day={cursor} events={events} onAdd={() => navigate("/activities?create=1")} />}
      </div>

      <aside className="surface h-fit overflow-hidden xl:sticky xl:top-24"><div className="border-b border-[#e8ece8] px-5 py-5"><p className="eyebrow">Selected date</p><div className="mt-2 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf3ef] text-[#2f5c47]"><CalendarDays className="h-5 w-5" /></span><div><h3 className="font-display text-xl tracking-[-0.02em]">{format(selectedDay, "EEE, d MMM")}</h3><p className="text-[10px] text-muted-foreground">{dayEvents.length} scheduled {dayEvents.length === 1 ? "item" : "items"}</p></div></div></div>{dayEvents.length === 0 ? <EmptyState icon={CalendarDays} title="No activity scheduled" description="Choose another day or log a commercial activity for this date." action={<Button variant="outline" onClick={() => navigate("/activities?create=1")} className="rounded-xl bg-white text-xs"><Plus className="mr-2 h-3.5 w-3.5" />Add activity</Button>} /> : <div className="divide-y divide-[#edf0ed]">{dayEvents.map(event => <EventRow key={event.id} event={event} onClick={() => navigate("/activities")} />)}</div>}</aside>
    </section>
  </div>;
}

function MonthGrid({ days, cursor, selectedDay, eventsByDay, onSelect }: { days: Date[]; cursor: Date; selectedDay: Date; eventsByDay: Map<string, CalendarEvent[]>; onSelect: (day: Date) => void }) {
  return <div className="overflow-x-auto"><div className="min-w-[780px]"><div className="grid grid-cols-7 border-b border-[#e7ebe7] bg-[#fafbf9]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div key={day} className="px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{day}</div>)}</div><div className="grid grid-cols-7">{days.map(day => { const key = format(day, "yyyy-MM-dd"); const items = eventsByDay.get(key) ?? []; const selected = isSameDay(day, selectedDay); const current = isSameMonth(day, cursor); return <button key={key} onClick={() => onSelect(day)} className={`min-h-28 border-b border-r border-[#edf0ed] p-2 text-left transition-colors hover:bg-[#fafbf9] ${!current ? "bg-[#fafbf9]/70 text-muted-foreground/45" : "bg-white"} ${selected ? "ring-2 ring-inset ring-[#c09a55]" : ""}`}><DayNumber day={day} /><div className="mt-1.5 space-y-1">{items.slice(0, 3).map(event => <EventPill key={event.id} event={event} />)}{items.length > 3 && <p className="px-1 text-[9px] font-semibold text-muted-foreground">+{items.length - 3} more</p>}</div></button>; })}</div></div></div>;
}

function WeekGrid({ days, selectedDay, eventsByDay, onSelect }: { days: Date[]; selectedDay: Date; eventsByDay: Map<string, CalendarEvent[]>; onSelect: (day: Date) => void }) {
  return <div className="overflow-x-auto"><div className="grid min-w-[840px] grid-cols-7 divide-x divide-[#edf0ed]">{days.map(day => { const items = eventsByDay.get(format(day, "yyyy-MM-dd")) ?? []; return <button key={day.toISOString()} onClick={() => onSelect(day)} className={`min-h-[520px] p-3 text-left hover:bg-[#fafbf9] ${isSameDay(day, selectedDay) ? "bg-[#fbf8f1]" : "bg-white"}`}><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{format(day, "EEE")}</p><DayNumber day={day} /></div><span className="text-[9px] text-muted-foreground">{items.length}</span></div><div className="mt-4 space-y-2">{items.map(event => <div key={event.id} className={`rounded-xl px-2.5 py-2 text-[9px] ${eventTone(event)}`}><p className="font-semibold">{format(eventDate(event)!, "HH:mm")}</p><p className="mt-1 line-clamp-2 leading-4">{event.title}</p><p className="mt-1 truncate opacity-70">{event.propertyName}</p></div>)}</div></button>; })}</div></div>;
}

function DayAgenda({ day, events, onAdd }: { day: Date; events: CalendarEvent[]; onAdd: () => void }) {
  const items = events.filter(event => eventDate(event) && isSameDay(eventDate(event)!, day));
  if (items.length === 0) return <div className="p-6"><EmptyState icon={CalendarDays} title="A clear commercial day" description="No activities are scheduled. Add a follow-up, call, meeting, or property visit." action={<Button onClick={onAdd} className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Log activity</Button>} /></div>;
  return <div className="divide-y divide-[#edf0ed]">{items.map(event => <div key={event.id} className="grid gap-4 px-6 py-5 sm:grid-cols-[88px_1fr]"><p className="text-sm font-semibold tabular-nums">{format(eventDate(event)!, "HH:mm")}</p><div className={`rounded-2xl px-4 py-3 ${eventTone(event)}`}><p className="text-sm font-semibold">{event.title}</p><p className="mt-1 text-[10px] opacity-75">{event.subtype} · {event.propertyName} · {event.ownerName}</p>{event.description && <p className="mt-3 text-[11px] leading-5 opacity-85">{event.description}</p>}</div></div>)}</div>;
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) { return <button onClick={onClick} className="w-full px-5 py-4 text-left hover:bg-[#fafbf9]"><div className="flex items-start gap-3"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${eventTone(event)}`}><Clock3 className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-5">{event.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{fullDateTime(eventDate(event))}</p><div className="mt-2 flex flex-wrap gap-1.5"><StatusBadge value={event.subtype} /><StatusBadge value={event.propertyName || "Property"} /></div><p className="mt-2 text-[10px] text-muted-foreground">{event.entityName} · {event.ownerName}</p></div></div></button>; }
function EventPill({ event }: { event: CalendarEvent }) { return <div className={`truncate rounded-md px-2 py-1 text-[9px] font-semibold ${eventTone(event)}`}>{format(eventDate(event)!, "HH:mm")} · {event.title}</div>; }
function DayNumber({ day }: { day: Date }) { return <span className={`mt-1 grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold ${isSameDay(day, new Date()) ? "bg-[#1c4636] text-white" : ""}`}>{format(day, "d")}</span>; }
function eventDate(event: CalendarEvent) { return event.startedAt ? new Date(event.startedAt) : event.dueAt ? new Date(event.dueAt) : null; }
function eventTone(event: CalendarEvent) { return event.type === "meeting" ? "bg-[#e7f0ea] text-[#2f684e]" : event.type === "call" ? "bg-[#eaf0f5] text-[#376373]" : event.dueAt ? "bg-[#f6f0e3] text-[#8a6a2f]" : "bg-[#f1edf5] text-[#6c5279]"; }
function title(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function Filter({ value, onChange, placeholder, items }: { value: string; onChange: (value: string) => void; placeholder: string; items: Array<{ value: string; label: string }> }) { return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-9 min-w-44 rounded-xl border-[#dfe5df] bg-[#fafbf9] text-[11px]"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{placeholder}</SelectItem>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>; }
