import { useAuth } from "@/_core/hooks/useAuth";
import { PropertyLogo } from "@/components/BrandIdentity";
import {
  DetailPair,
  DialogActions,
  FieldGrid,
  FilterSelect,
  MoneyField,
  SearchFilters,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/crm/CRMForms";
import { CRMDetailSheet, RecordTable } from "@/components/crm/CRMRecords";
import {
  CreateButton,
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  StatusBadge,
  money,
  shortDate,
  useSearchShortcut,
} from "@/components/crm/CRMPrimitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { Archive, Award, Building2, Link2, MapPin, Pencil, TrendingUp, Trophy } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";

type Row = inferRouterOutputs<AppRouter>["achievements"]["list"][number];
type AchievementStatus = "Confirmed" | "Tentative" | "RFP accepted" | "Declined" | "Contracted" | "Proposal sent" | "On option";
type Form = {
  propertyId: string;
  ownerId: string;
  month: string;
  organizationActivity: string;
  potentialValueCents: number;
  averageRateCents: number;
  eventDate: string;
  nights: number;
  roomNights: number;
  city: string;
  notes: string;
  status: AchievementStatus;
  companyId: string;
  opportunityId: string;
};

const STATUS_OPTIONS: { value: AchievementStatus; label: string }[] = [
  { value: "Confirmed", label: "Confirmed" },
  { value: "Tentative", label: "Tentative" },
  { value: "RFP accepted", label: "RFP accepted" },
  { value: "Declined", label: "Declined" },
  { value: "Contracted", label: "Contracted" },
  { value: "Proposal sent", label: "Proposal sent" },
  { value: "On option", label: "On option" },
];

const emptyForm: Form = {
  propertyId: "",
  ownerId: "",
  month: monthInput(new Date()),
  organizationActivity: "",
  potentialValueCents: 0,
  averageRateCents: 0,
  eventDate: "",
  nights: 0,
  roomNights: 0,
  city: "",
  notes: "",
  status: "Confirmed",
  companyId: "none",
  opportunityId: "none",
};

export default function Achievements() {
  const { user } = useAuth();
  const searchRef = useSearchShortcut();
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const utils = trpc.useUtils();
  const refs = trpc.metadata.references.useQuery();
  const queryInput = useMemo(
    () => ({
      search,
      propertyId: propertyId ? Number(propertyId) : undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
      status: (status || undefined) as AchievementStatus | undefined,
    }),
    [ownerId, propertyId, search, status],
  );
  const query = trpc.achievements.list.useQuery(queryInput);
  const create = trpc.achievements.create.useMutation({
    onSuccess: () => saved("Achievement created"),
    onError: error => toast.error(error.message),
  });
  const update = trpc.achievements.update.useMutation({
    onSuccess: () => saved("Achievement saved"),
    onError: error => toast.error(error.message),
  });
  const archive = trpc.achievements.archive.useMutation({
    onSuccess: () => {
      toast.success("Achievement archived");
      setArchiveOpen(false);
      setSelected(null);
      utils.achievements.invalidate();
      utils.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const propertyOptions = refs.data?.properties.map(item => ({ value: String(item.id), label: item.name })) ?? [];
  const ownerOptions = refs.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? [];
  const scopedCompanies = refs.data?.companies ?? [];
  const scopedOpportunities = refs.data?.opportunities.filter(item => !form.propertyId || item.propertyId === Number(form.propertyId)) ?? [];
  const companyOptions = [{ value: "none", label: "No linked company" }, ...scopedCompanies.map(item => ({ value: String(item.id), label: item.label }))];
  const opportunityOptions = [{ value: "none", label: "No linked opportunity" }, ...scopedOpportunities.map(item => ({ value: String(item.id), label: item.label }))];
  const rows = useMemo(() => query.data ?? [], [query.data]);

  useEffect(() => {
    if (!refs.data) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      openCreate();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refs.data]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      propertyId: propertyOptions.length === 1 ? propertyOptions[0].value : "",
      ownerId: user ? String(user.id) : "",
      month: monthInput(new Date()),
    });
    setEditorOpen(true);
  }

  function openEdit(row = selected) {
    if (!row) return;
    setEditingId(row.id);
    setForm({
      propertyId: String(row.propertyId),
      ownerId: String(row.ownerId),
      month: monthInput(row.month),
      organizationActivity: row.organizationActivity,
      potentialValueCents: row.potentialValueCents,
      averageRateCents: row.averageRateCents,
      eventDate: row.eventDate ? new Date(row.eventDate).toISOString().slice(0, 10) : "",
      nights: row.nights,
      roomNights: row.roomNights,
      city: row.city || "",
      notes: row.notes || "",
      status: row.status,
      companyId: row.companyId ? String(row.companyId) : "none",
      opportunityId: row.opportunityId ? String(row.opportunityId) : "none",
    });
    setEditorOpen(true);
  }

  function saved(message: string) {
    toast.success(message);
    setEditorOpen(false);
    setEditingId(null);
    setSelected(null);
    utils.achievements.invalidate();
    utils.dashboard.invalidate();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      propertyId: Number(form.propertyId),
      ownerId: Number(form.ownerId),
      month: new Date(`${form.month}-01T12:00:00`),
      organizationActivity: form.organizationActivity.trim(),
      potentialValueCents: form.potentialValueCents,
      averageRateCents: form.averageRateCents,
      eventDate: form.eventDate ? new Date(`${form.eventDate}T12:00:00`) : null,
      nights: form.nights,
      roomNights: form.roomNights,
      city: form.city.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      companyId: form.companyId === "none" ? null : Number(form.companyId),
      opportunityId: form.opportunityId === "none" ? null : Number(form.opportunityId),
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  }

  function changeProperty(value: string) {
    setForm(current => ({ ...current, propertyId: value, companyId: "none", opportunityId: "none" }));
  }

  const activeFilters = [propertyId, ownerId, status].filter(Boolean).length;
  const totalPotential = rows.reduce((sum, row) => sum + row.potentialValueCents, 0);
  const confirmedCount = rows.filter(row => ["Confirmed", "Contracted", "RFP accepted"].includes(row.status)).length;

  return (
    <div className="page-enter max-w-[1500px]">
      <PageHeader
        eyebrow="Commercial outcomes"
        title="Achievements"
        description="Track confirmed wins, accepted RFPs, proposals, options, and other material commercial outcomes across the hotel portfolio."
        action={<CreateButton label="New achievement" onClick={openCreate} />}
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={Trophy} label="Achievements in view" value={String(rows.length)} />
        <SummaryCard icon={TrendingUp} label="Potential value" value={money(totalPotential)} />
        <SummaryCard icon={Award} label="Confirmed / contracted" value={String(confirmedCount)} />
      </section>

      <SearchFilters
        value={search}
        onChange={setSearch}
        searchRef={searchRef}
        activeFilters={activeFilters}
        onClear={() => {
          setPropertyId("");
          setOwnerId("");
          setStatus("");
        }}
      >
        <FilterSelect value={propertyId} onChange={setPropertyId} options={propertyOptions} placeholder="All properties" className="w-[190px]" />
        <FilterSelect value={ownerId} onChange={setOwnerId} options={ownerOptions} placeholder="All owners" className="w-[170px]" />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" className="w-[165px]" />
      </SearchFilters>

      {query.isLoading || refs.isLoading ? (
        <LoadingPanel rows={7} />
      ) : query.error || refs.error ? (
        <ErrorPanel message={(query.error || refs.error)?.message} onRetry={() => { query.refetch(); refs.refetch(); }} />
      ) : !rows.length ? (
        <div className="surface">
          <EmptyState
            icon={Trophy}
            title="No achievements in this view"
            description="Record a commercial outcome to give property teams and the group a clear view of momentum."
            action={<CreateButton label="Create achievement" onClick={openCreate} />}
          />
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <RecordTable columns={["Month", "Organisation / activity", "Property", "Owner", "Potential", "Average rate", "Status"]}>
            {rows.map(row => (
              <tr
                key={row.id}
                onClick={() => setSelected(row)}
                className="cursor-pointer border-b border-[#e8edf3] transition-colors last:border-0 hover:bg-[#f7fafc]"
              >
                <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold">{monthLabel(row.month)}</td>
                <td className="max-w-[300px] px-4 py-3.5">
                  <p className="truncate text-xs font-semibold">{row.organizationActivity}</p>
                  <p className="mt-1 truncate text-[9px] text-muted-foreground">{row.companyName || row.opportunityName || row.city || "Standalone achievement"}</p>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex min-w-[190px] items-center gap-2.5"><PropertyLogo propertyName={row.propertyName} /><span className="text-[11px] font-semibold leading-4">{row.propertyName}</span></div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">{row.ownerName || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold">{money(row.potentialValueCents)}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">{money(row.averageRateCents)}</td>
                <td className="whitespace-nowrap px-4 py-3.5"><StatusBadge value={row.status} /></td>
              </tr>
            ))}
          </RecordTable>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.5rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Edit achievement" : "New achievement"}</DialogTitle>
            <DialogDescription>Capture the commercial outcome, property context, potential value, and current achievement status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="mt-3 space-y-5">
            <FieldGrid>
              <SelectField label="Property" value={form.propertyId} onChange={changeProperty} options={propertyOptions} required />
              <SelectField label="Owner" value={form.ownerId} onChange={value => set("ownerId", value)} options={ownerOptions} required />
              <TextField label="Month" type="month" value={form.month} onChange={value => set("month", value)} required />
              <SelectField label="Status" value={form.status} onChange={value => set("status", value as AchievementStatus)} options={STATUS_OPTIONS} required />
            </FieldGrid>
            <TextField label="Organisation / activity" value={form.organizationActivity} onChange={value => set("organizationActivity", value)} placeholder="Client, RFP, contract, event, or sales outcome" required />
            <FieldGrid>
              <MoneyField label="Potential value" valueCents={form.potentialValueCents} onChange={value => set("potentialValueCents", value)} />
              <MoneyField label="Average rate" valueCents={form.averageRateCents} onChange={value => set("averageRateCents", value)} />
              <TextField label="City" value={form.city} onChange={value => set("city", value)} placeholder="Dublin" />
              <TextField label="Event / arrival date" type="date" value={form.eventDate} onChange={value => set("eventDate", value)} />
              <TextField label="Nights" type="number" min={0} value={form.nights} onChange={value => set("nights", Number(value) || 0)} />
              <TextField label="Room nights" type="number" min={0} value={form.roomNights} onChange={value => set("roomNights", Number(value) || 0)} />
              <SelectField label="Linked company" value={form.companyId} onChange={value => set("companyId", value)} options={companyOptions} />
              <SelectField label="Linked opportunity" value={form.opportunityId} onChange={value => set("opportunityId", value)} options={opportunityOptions} />
            </FieldGrid>
            <TextAreaField label="Notes" value={form.notes} onChange={value => set("notes", value)} placeholder="Commercial context, next steps, and important qualification notes" rows={5} />
            <DialogActions
              onCancel={() => setEditorOpen(false)}
              saving={create.isPending || update.isPending}
              disabled={!form.propertyId || !form.ownerId || !form.month || !form.organizationActivity.trim()}
              submitLabel={editingId ? "Save achievement" : "Create achievement"}
            />
          </form>
        </DialogContent>
      </Dialog>

      <CRMDetailSheet
        open={selected !== null}
        onOpenChange={open => !open && setSelected(null)}
        title={selected?.organizationActivity || "Achievement"}
        eyebrow={selected?.propertyName || "Commercial outcome"}
        description={selected ? `${monthLabel(selected.month)} · ${selected.ownerName || "JMK user"}` : undefined}
        action={selected ? <Button size="sm" onClick={() => openEdit()} className="rounded-xl"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button> : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#002460] p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <PropertyLogo propertyName={selected.propertyName} />
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#6cccd8]">{monthLabel(selected.month)}</p>
                  <h3 className="mt-1 text-lg font-semibold">{selected.organizationActivity}</h3>
                  <p className="mt-1.5 text-xs text-white/65">{selected.propertyName} · {selected.ownerName || "JMK user"}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailPair label="Status" value={<StatusBadge value={selected.status} />} />
              <DetailPair label="Month" value={monthLabel(selected.month)} />
              <DetailPair label="Potential value" value={money(selected.potentialValueCents)} />
              <DetailPair label="Average rate" value={money(selected.averageRateCents)} />
              <DetailPair label="Event / arrival date" value={selected.eventDate ? shortDate(selected.eventDate) : "—"} />
              <DetailPair label="Nights" value={selected.nights || "—"} />
              <DetailPair label="Room nights" value={selected.roomNights || "—"} />
              <DetailPair label="City" value={selected.city ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{selected.city}</span> : "—"} />
              <DetailPair label="Last updated" value={shortDate(selected.updatedAt)} />
              <DetailPair label="Company" value={selected.companyName || "—"} />
              <DetailPair label="Opportunity" value={selected.opportunityName || "—"} />
              <DetailPair label="Notes" value={selected.notes} wide />
            </div>
            {(selected.companyName || selected.opportunityName) && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#dce5ee] bg-[#f7fafc] p-4">
                <Link2 className="mt-0.5 h-4 w-4 text-[#00758f]" />
                <div><p className="text-xs font-semibold">Linked commercial context</p><p className="mt-1 text-[10px] text-muted-foreground">{[selected.companyName, selected.opportunityName].filter(Boolean).join(" · ")}</p></div>
              </div>
            )}
            <Button variant="outline" onClick={() => setArchiveOpen(true)} className="w-full rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Archive className="mr-2 h-4 w-4" />Archive achievement</Button>
          </div>
        )}
      </CRMDetailSheet>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this achievement?</AlertDialogTitle>
            <AlertDialogDescription>This removes the record from active achievement views and commercial reporting. It does not delete the underlying database row.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selected && archive.mutate({ id: selected.id })} disabled={archive.isPending} className="rounded-xl bg-rose-700 hover:bg-rose-800">{archive.isPending ? "Archiving…" : "Archive achievement"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return <div className="surface flex items-center gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e8f7f9] text-[#00758f]"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 truncate font-display text-xl text-foreground">{value}</p></div></div>;
}

function monthInput(value: Date | string) {
  return new Date(value).toISOString().slice(0, 7);
}

function monthLabel(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
