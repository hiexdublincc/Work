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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowRight, Pencil, Share2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";

type Row = inferRouterOutputs<AppRouter>["referrals"]["list"][number];
type Status = "New" | "Accepted" | "In Progress" | "Won" | "Lost";
type Form = {
  referringPropertyId: string;
  receivingPropertyId: string;
  status: Status;
  valueCents: number;
  roomNights: number;
  notes: string;
  companyId: string;
  opportunityId: string;
  currentOwnerId: string;
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "New", label: "New" },
  { value: "Accepted", label: "Accepted" },
  { value: "In Progress", label: "In Progress" },
  { value: "Won", label: "Won" },
  { value: "Lost", label: "Lost" },
];

const emptyForm: Form = {
  referringPropertyId: "",
  receivingPropertyId: "",
  status: "New",
  valueCents: 0,
  roomNights: 0,
  notes: "",
  companyId: "none",
  opportunityId: "none",
  currentOwnerId: "",
};

export default function Referrals() {
  const searchRef = useSearchShortcut();
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState<"all" | "sent" | "received">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const utils = trpc.useUtils();
  const refs = trpc.metadata.references.useQuery();
  const queryInput = useMemo(
    () => ({ search, propertyId: propertyId ? Number(propertyId) : undefined, status: (status || undefined) as Status | undefined, direction }),
    [direction, propertyId, search, status],
  );
  const query = trpc.referrals.list.useQuery(queryInput);
  const create = trpc.referrals.create.useMutation({ onSuccess: () => saved("Referral created"), onError: error => toast.error(error.message) });
  const update = trpc.referrals.update.useMutation({ onSuccess: () => saved("Referral updated"), onError: error => toast.error(error.message) });

  const propertyOptions = refs.data?.properties.map(item => ({ value: String(item.id), label: item.name })) ?? [];
  const ownerOptions = refs.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? [];
  const scopedCompanies = refs.data?.companies ?? [];
  const scopedOpportunities = refs.data?.opportunities.filter(item => !form.referringPropertyId || item.propertyId === Number(form.referringPropertyId)) ?? [];
  const companyOptions = [{ value: "none", label: "No linked company" }, ...scopedCompanies.map(item => ({ value: String(item.id), label: item.label }))];
  const opportunityOptions = [{ value: "none", label: "No linked opportunity" }, ...scopedOpportunities.map(item => ({ value: String(item.id), label: item.label }))];
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const totalValue = rows.reduce((sum, row) => sum + row.valueCents, 0);
  const wonCount = rows.filter(row => row.status === "Won").length;

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, referringPropertyId: propertyOptions.length === 1 ? propertyOptions[0].value : "" });
    setEditorOpen(true);
  }

  function openEdit(row = selected) {
    if (!row) return;
    setEditingId(row.id);
    setForm({
      referringPropertyId: String(row.referringPropertyId),
      receivingPropertyId: String(row.receivingPropertyId),
      status: row.status as Status,
      valueCents: row.valueCents,
      roomNights: row.roomNights,
      notes: row.notes || "",
      companyId: row.companyId ? String(row.companyId) : "none",
      opportunityId: row.opportunityId ? String(row.opportunityId) : "none",
      currentOwnerId: row.currentOwnerId ? String(row.currentOwnerId) : "",
    });
    setEditorOpen(true);
  }

  function saved(message: string) {
    toast.success(message);
    setEditorOpen(false);
    setEditingId(null);
    setSelected(null);
    utils.referrals.invalidate();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      referringPropertyId: Number(form.referringPropertyId),
      receivingPropertyId: Number(form.receivingPropertyId),
      status: form.status,
      valueCents: form.valueCents,
      roomNights: form.roomNights,
      notes: form.notes.trim() || null,
      companyId: form.companyId === "none" ? null : Number(form.companyId),
      opportunityId: form.opportunityId === "none" ? null : Number(form.opportunityId),
      currentOwnerId: form.currentOwnerId ? Number(form.currentOwnerId) : undefined,
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  }

  const activeFilters = [propertyId, status, direction !== "all" ? direction : ""].filter(Boolean).length;

  return (
    <div className="page-enter max-w-[1500px]">
      <PageHeader
        eyebrow="Cross-property collaboration"
        title="Referrals"
        description="Track business referred between properties, its status, and the revenue and room nights it generates."
        action={<CreateButton label="New referral" onClick={openCreate} />}
      />

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Referrals in view" value={String(rows.length)} />
        <SummaryCard label="Referral value" value={money(totalValue)} />
        <SummaryCard label="Won" value={String(wonCount)} />
      </section>

      <SearchFilters
        value={search}
        onChange={setSearch}
        searchRef={searchRef}
        activeFilters={activeFilters}
        onClear={() => { setPropertyId(""); setStatus(""); setDirection("all"); }}
      >
        <FilterSelect value={propertyId} onChange={setPropertyId} options={propertyOptions} placeholder="All properties" className="w-[190px]" />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" className="w-[160px]" />
        <FilterSelect value={direction === "all" ? "" : direction} onChange={value => setDirection((value || "all") as typeof direction)} options={[{ value: "sent", label: "Sent" }, { value: "received", label: "Received" }]} placeholder="Sent & received" className="w-[160px]" />
      </SearchFilters>

      {query.isLoading || refs.isLoading ? (
        <LoadingPanel rows={7} />
      ) : query.error || refs.error ? (
        <ErrorPanel message={(query.error || refs.error)?.message} onRetry={() => { query.refetch(); refs.refetch(); }} />
      ) : !rows.length ? (
        <div className="surface">
          <EmptyState icon={Share2} title="No referrals yet" description="Refer business between properties to encourage cross-portfolio collaboration." action={<CreateButton label="Create referral" onClick={openCreate} />} />
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <RecordTable columns={["Referral", "Status", "Value", "Room nights", "Owners", "Updated"]}>
            {rows.map(row => (
              <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b border-[#e8edf3] transition-colors last:border-0 hover:bg-[#f7fafc]">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2"><PropertyLogo propertyName={row.referringPropertyName} /><ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><PropertyLogo propertyName={row.receivingPropertyName} /></div>
                  <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{row.companyName || row.opportunityName || "No linked record"}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5"><StatusBadge value={row.status} /></td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold">{money(row.valueCents)}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">{row.roomNights}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">{row.originalOwnerName || "—"} → {row.currentOwnerName || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">{shortDate(row.updatedAt)}</td>
              </tr>
            ))}
          </RecordTable>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.5rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Edit referral" : "New referral"}</DialogTitle>
            <DialogDescription>Track business referred from one property to another across the portfolio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="mt-3 space-y-5">
            <FieldGrid>
              <SelectField label="Referring property" value={form.referringPropertyId} onChange={value => set("referringPropertyId", value)} options={propertyOptions} required />
              <SelectField label="Receiving property" value={form.receivingPropertyId} onChange={value => set("receivingPropertyId", value)} options={propertyOptions} required />
              <SelectField label="Status" value={form.status} onChange={value => set("status", value as Status)} options={STATUS_OPTIONS} required />
              <SelectField label="Current owner" value={form.currentOwnerId} onChange={value => set("currentOwnerId", value)} options={ownerOptions} />
            </FieldGrid>
            <FieldGrid>
              <MoneyField label="Revenue value" valueCents={form.valueCents} onChange={value => set("valueCents", value)} />
              <TextField label="Room nights" type="number" value={form.roomNights} onChange={value => set("roomNights", Number(value) || 0)} />
              <SelectField label="Linked company" value={form.companyId} onChange={value => set("companyId", value)} options={companyOptions} />
              <SelectField label="Linked opportunity" value={form.opportunityId} onChange={value => set("opportunityId", value)} options={opportunityOptions} />
            </FieldGrid>
            <TextAreaField label="Notes" value={form.notes} onChange={value => set("notes", value)} rows={4} />
            <DialogActions
              onCancel={() => setEditorOpen(false)}
              saving={create.isPending || update.isPending}
              disabled={!form.referringPropertyId || !form.receivingPropertyId || form.referringPropertyId === form.receivingPropertyId}
              submitLabel={editingId ? "Save referral" : "Create referral"}
            />
          </form>
        </DialogContent>
      </Dialog>

      <CRMDetailSheet
        open={selected !== null}
        onOpenChange={open => !open && setSelected(null)}
        title={selected ? `${selected.referringPropertyName} → ${selected.receivingPropertyName}` : "Referral"}
        eyebrow="Cross-property referral"
        description={selected ? shortDate(selected.updatedAt) : undefined}
        action={selected ? <Button size="sm" onClick={() => openEdit()} className="rounded-xl"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button> : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailPair label="Status" value={<StatusBadge value={selected.status} />} />
              <DetailPair label="Value" value={money(selected.valueCents)} />
              <DetailPair label="Room nights" value={String(selected.roomNights)} />
              <DetailPair label="Updated" value={shortDate(selected.updatedAt)} />
              <DetailPair label="Original owner" value={selected.originalOwnerName || "—"} />
              <DetailPair label="Current owner" value={selected.currentOwnerName || "—"} />
              <DetailPair label="Company" value={selected.companyName || "—"} />
              <DetailPair label="Opportunity" value={selected.opportunityName || "—"} />
              <DetailPair label="Notes" value={selected.notes} wide />
            </div>
          </div>
        )}
      </CRMDetailSheet>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="surface flex items-center gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e8f7f9] text-[#00758f]"><Share2 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 truncate font-display text-xl text-foreground">{value}</p></div></div>;
}
