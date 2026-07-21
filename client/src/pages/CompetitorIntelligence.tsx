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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { Archive, Building2, Globe2, Pencil, Radar, ThumbsDown, ThumbsUp } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";

type Row = inferRouterOutputs<AppRouter>["competitorIntelligence"]["list"][number];
type Form = {
  propertyId: string;
  ownerId: string;
  competitorHotelName: string;
  quotedRateCents: number;
  clientFeedback: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  companyId: string;
  opportunityId: string;
  isGroupVisible: boolean;
};

const emptyForm: Form = {
  propertyId: "",
  ownerId: "",
  competitorHotelName: "",
  quotedRateCents: 0,
  clientFeedback: "",
  strengths: "",
  weaknesses: "",
  notes: "",
  companyId: "none",
  opportunityId: "none",
  isGroupVisible: true,
};

export default function CompetitorIntelligence() {
  const searchRef = useSearchShortcut();
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const utils = trpc.useUtils();
  const refs = trpc.metadata.references.useQuery();
  const queryInput = useMemo(() => ({ search, propertyId: propertyId ? Number(propertyId) : undefined }), [propertyId, search]);
  const query = trpc.competitorIntelligence.list.useQuery(queryInput);
  const create = trpc.competitorIntelligence.create.useMutation({ onSuccess: () => saved("Competitor intelligence logged"), onError: error => toast.error(error.message) });
  const update = trpc.competitorIntelligence.update.useMutation({ onSuccess: () => saved("Entry updated"), onError: error => toast.error(error.message) });
  const archive = trpc.competitorIntelligence.archive.useMutation({
    onSuccess: () => { toast.success("Entry archived"); setArchiveOpen(false); setSelected(null); utils.competitorIntelligence.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const propertyOptions = refs.data?.properties.map(item => ({ value: String(item.id), label: item.name })) ?? [];
  const ownerOptions = refs.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? [];
  const scopedCompanies = refs.data?.companies ?? [];
  const scopedOpportunities = refs.data?.opportunities.filter(item => !form.propertyId || item.propertyId === Number(form.propertyId)) ?? [];
  const companyOptions = [{ value: "none", label: "No linked company" }, ...scopedCompanies.map(item => ({ value: String(item.id), label: item.label }))];
  const opportunityOptions = [{ value: "none", label: "No linked opportunity" }, ...scopedOpportunities.map(item => ({ value: String(item.id), label: item.label }))];
  const rows = useMemo(() => query.data ?? [], [query.data]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, propertyId: propertyOptions.length === 1 ? propertyOptions[0].value : "" });
    setEditorOpen(true);
  }

  function openEdit(row = selected) {
    if (!row) return;
    setEditingId(row.id);
    setForm({
      propertyId: String(row.propertyId),
      ownerId: String(row.ownerId),
      competitorHotelName: row.competitorHotelName,
      quotedRateCents: row.quotedRateCents ?? 0,
      clientFeedback: row.clientFeedback || "",
      strengths: row.strengths || "",
      weaknesses: row.weaknesses || "",
      notes: row.notes || "",
      companyId: row.companyId ? String(row.companyId) : "none",
      opportunityId: row.opportunityId ? String(row.opportunityId) : "none",
      isGroupVisible: row.isGroupVisible,
    });
    setEditorOpen(true);
  }

  function saved(message: string) {
    toast.success(message);
    setEditorOpen(false);
    setEditingId(null);
    setSelected(null);
    utils.competitorIntelligence.invalidate();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      propertyId: form.propertyId ? Number(form.propertyId) : undefined,
      ownerId: form.ownerId ? Number(form.ownerId) : undefined,
      competitorHotelName: form.competitorHotelName.trim(),
      quotedRateCents: form.quotedRateCents || null,
      clientFeedback: form.clientFeedback.trim() || null,
      strengths: form.strengths.trim() || null,
      weaknesses: form.weaknesses.trim() || null,
      notes: form.notes.trim() || null,
      companyId: form.companyId === "none" ? null : Number(form.companyId),
      opportunityId: form.opportunityId === "none" ? null : Number(form.opportunityId),
      isGroupVisible: form.isGroupVisible,
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  }

  function changeProperty(value: string) {
    setForm(current => ({ ...current, propertyId: value, companyId: "none", opportunityId: "none" }));
  }

  const activeFilters = propertyId ? 1 : 0;

  return (
    <div className="page-enter max-w-[1500px]">
      <PageHeader
        eyebrow="Market awareness"
        title="Competitor intelligence"
        description="A shared, searchable stream of rates, feedback, strengths, and weaknesses observed across the competitive set."
        action={<CreateButton label="Log intelligence" onClick={openCreate} />}
      />

      <SearchFilters value={search} onChange={setSearch} searchRef={searchRef} activeFilters={activeFilters} onClear={() => setPropertyId("")}>
        <FilterSelect value={propertyId} onChange={setPropertyId} options={propertyOptions} placeholder="All properties" className="w-[190px]" />
      </SearchFilters>

      {query.isLoading || refs.isLoading ? (
        <LoadingPanel rows={7} />
      ) : query.error || refs.error ? (
        <ErrorPanel message={(query.error || refs.error)?.message} onRetry={() => { query.refetch(); refs.refetch(); }} />
      ) : !rows.length ? (
        <div className="surface">
          <EmptyState icon={Radar} title="No competitor intelligence yet" description="Log a competitor rate, feedback item, or observation to build shared market awareness." action={<CreateButton label="Log intelligence" onClick={openCreate} />} />
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <RecordTable columns={["Competitor hotel", "Property", "Owner", "Quoted rate", "Captured", "Linked to"]}>
            {rows.map(row => (
              <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b border-[#e8edf3] transition-colors last:border-0 hover:bg-[#f7fafc]">
                <td className="max-w-[260px] px-4 py-3.5">
                  <p className="truncate text-xs font-semibold">{row.competitorHotelName}</p>
                  {!row.isGroupVisible && <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Property-only</p>}
                </td>
                <td className="px-4 py-3.5"><div className="flex min-w-[190px] items-center gap-2.5"><PropertyLogo propertyName={row.propertyName} /><span className="text-[13px] font-semibold leading-4">{row.propertyName}</span></div></td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">{row.ownerName || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold">{row.quotedRateCents != null ? money(row.quotedRateCents) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">{shortDate(row.capturedAt)}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">{row.companyName || row.opportunityName || "—"}</td>
              </tr>
            ))}
          </RecordTable>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.5rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Edit intelligence" : "Log competitor intelligence"}</DialogTitle>
            <DialogDescription>Capture what you observed so the commercial team can act on it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="mt-3 space-y-5">
            <FieldGrid>
              <SelectField label="Property" value={form.propertyId} onChange={changeProperty} options={propertyOptions} required />
              <SelectField label="Owner" value={form.ownerId} onChange={value => set("ownerId", value)} options={ownerOptions} />
            </FieldGrid>
            <TextField label="Competitor hotel" value={form.competitorHotelName} onChange={value => set("competitorHotelName", value)} placeholder="Competitor property name" required />
            <FieldGrid>
              <MoneyField label="Quoted rate" valueCents={form.quotedRateCents} onChange={value => set("quotedRateCents", value)} />
              <SelectField label="Linked company" value={form.companyId} onChange={value => set("companyId", value)} options={companyOptions} />
              <SelectField label="Linked opportunity" value={form.opportunityId} onChange={value => set("opportunityId", value)} options={opportunityOptions} />
              <div />
            </FieldGrid>
            <TextAreaField label="Client feedback" value={form.clientFeedback} onChange={value => set("clientFeedback", value)} rows={3} />
            <FieldGrid>
              <TextAreaField label="Strengths" value={form.strengths} onChange={value => set("strengths", value)} rows={3} />
              <TextAreaField label="Weaknesses" value={form.weaknesses} onChange={value => set("weaknesses", value)} rows={3} />
            </FieldGrid>
            <TextAreaField label="Notes" value={form.notes} onChange={value => set("notes", value)} rows={3} />
            <label className="flex items-center gap-2.5 text-xs font-medium text-foreground">
              <Checkbox checked={form.isGroupVisible} onCheckedChange={checked => set("isGroupVisible", checked === true)} />
              Visible to the wider commercial team
            </label>
            <DialogActions
              onCancel={() => setEditorOpen(false)}
              saving={create.isPending || update.isPending}
              disabled={!form.propertyId || !form.competitorHotelName.trim()}
              submitLabel={editingId ? "Save entry" : "Log intelligence"}
            />
          </form>
        </DialogContent>
      </Dialog>

      <CRMDetailSheet
        open={selected !== null}
        onOpenChange={open => !open && setSelected(null)}
        title={selected?.competitorHotelName || "Competitor intelligence"}
        eyebrow={selected?.propertyName || "Market awareness"}
        description={selected ? `${shortDate(selected.capturedAt)} · ${selected.ownerName || "JMK user"}` : undefined}
        action={selected ? <Button size="sm" onClick={() => openEdit()} className="rounded-xl"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button> : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#002460] p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <PropertyLogo propertyName={selected.propertyName} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-[#6cccd8]"><Globe2 className="mr-1 inline h-3 w-3" />Competitor</p>
                  <h3 className="mt-1 text-lg font-semibold">{selected.competitorHotelName}</h3>
                  <p className="mt-1.5 text-xs text-white/65">{selected.propertyName} · {selected.ownerName || "JMK user"}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailPair label="Quoted rate" value={selected.quotedRateCents != null ? money(selected.quotedRateCents) : "—"} />
              <DetailPair label="Captured" value={shortDate(selected.capturedAt)} />
              <DetailPair label="Company" value={selected.companyName || "—"} />
              <DetailPair label="Opportunity" value={selected.opportunityName || "—"} />
              <DetailPair label="Client feedback" value={selected.clientFeedback} wide />
              <DetailPair label="Strengths" value={selected.strengths ? <span className="inline-flex items-center gap-1.5"><ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />{selected.strengths}</span> : "—"} wide />
              <DetailPair label="Weaknesses" value={selected.weaknesses ? <span className="inline-flex items-center gap-1.5"><ThumbsDown className="h-3.5 w-3.5 text-rose-600" />{selected.weaknesses}</span> : "—"} wide />
              <DetailPair label="Notes" value={selected.notes} wide />
            </div>
            {(selected.companyName || selected.opportunityName) && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#dce5ee] bg-[#f7fafc] p-4">
                <Building2 className="mt-0.5 h-4 w-4 text-[#00758f]" />
                <div><p className="text-xs font-semibold">Linked commercial context</p><p className="mt-1 text-[12px] text-muted-foreground">{[selected.companyName, selected.opportunityName].filter(Boolean).join(" · ")}</p></div>
              </div>
            )}
            <Button variant="outline" onClick={() => setArchiveOpen(true)} className="w-full rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Archive className="mr-2 h-4 w-4" />Archive entry</Button>
          </div>
        )}
      </CRMDetailSheet>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this entry?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from active competitor intelligence views. It does not delete the underlying database row.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selected && archive.mutate({ id: selected.id })} disabled={archive.isPending} className="rounded-xl bg-rose-700 hover:bg-rose-800">{archive.isPending ? "Archiving…" : "Archive entry"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
