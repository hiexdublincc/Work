import { CRMDetailSheet, RecordTable } from "@/components/crm/CRMRecords";
import {
  DetailPair,
  DialogActions,
  FieldGrid,
  FilterSelect,
  MoneyField,
  SearchFilters,
  SelectField,
  SectionTitle,
  TextAreaField,
  TextField,
} from "@/components/crm/CRMForms";
import {
  CreateButton,
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
  StatusBadge,
  money,
  shortDate,
  useSearchShortcut,
} from "@/components/crm/CRMPrimitives";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Archive, Building2, CalendarClock, ContactRound, HeartPulse, Pencil, Target } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSearch } from "wouter";

const statuses = ["Prospect", "Active", "Inactive"] as const;
const companySortOptions = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Company name" },
  { value: "created", label: "Newest created" },
  { value: "potential", label: "Highest potential" },
] as const;
type CompanySort = (typeof companySortOptions)[number]["value"];
type CompanyForm = {
  name: string;
  ownerId: string;
  category: string;
  tier: string;
  status: (typeof statuses)[number];
  email: string;
  phone: string;
  website: string;
  industry: string;
  segment: string;
  destinationCity: string;
  leadSource: string;
  preferredRateType: string;
  relationshipStatus: string;
  potentialRoomNights: number;
  potentialRevenueCents: number;
  nextFollowUpAt: string;
  contractStartDate: string;
  contractExpiryDate: string;
  notes: string;
};

const emptyForm: CompanyForm = {
  name: "",
  ownerId: "",
  category: "Corporate",
  tier: "Standard",
  status: "Prospect",
  email: "",
  phone: "",
  website: "",
  industry: "",
  segment: "",
  destinationCity: "",
  leadSource: "",
  preferredRateType: "",
  relationshipStatus: "",
  potentialRoomNights: 0,
  potentialRevenueCents: 0,
  nextFollowUpAt: "",
  contractStartDate: "",
  contractExpiryDate: "",
  notes: "",
};

const inputDate = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const inputDateTime = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString().slice(0, 16) : "");

export default function Companies() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState("");
  const [sort, setSort] = useState<CompanySort>("updated");
  const [editorOpen, setEditorOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const searchRef = useSearchShortcut();
  const routeSearch = useSearch();
  const utils = trpc.useUtils();

  const references = trpc.metadata.references.useQuery();
  const query = trpc.companies.list.useQuery({
    page,
    pageSize: 20,
    search,
    status: (status as (typeof statuses)[number]) || undefined,
    category: (category as any) || undefined,
    tier: (tier as any) || undefined,
    sort,
  });
  const detail = trpc.companies.get.useQuery({ id: selectedId! }, { enabled: selectedId !== null });
  const duplicateInput = useMemo(
    () => ({
      excludeId: editingId ?? undefined,
      name: form.name.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
    }),
    [editingId, form.email, form.name, form.phone, form.website],
  );
  const duplicateCheck = trpc.companies.duplicateCheck.useQuery(duplicateInput, {
    enabled: editorOpen && Boolean(form.name.trim() || form.email.trim() || form.phone.trim() || form.website.trim()),
  });
  const create = trpc.companies.create.useMutation({
    onSuccess: () => saved("Company created"),
    onError: error => toast.error(error.message),
  });
  const update = trpc.companies.update.useMutation({
    onSuccess: () => saved("Company updated"),
    onError: error => toast.error(error.message),
  });
  const archive = trpc.companies.archive.useMutation({
    onSuccess: () => {
      toast.success("Company archived");
      setArchiveOpen(false);
      setSelectedId(null);
      utils.companies.invalidate();
      utils.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const ownerOptions = references.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? [];
  const categoryOptions = (references.data?.taxonomy.accountCategories ?? []).map(value => ({ value, label: value }));
  const tierOptions = (references.data?.taxonomy.accountTiers ?? []).map(value => ({ value, label: value }));

  useEffect(() => {
    setPage(1);
  }, [search, status, category, tier, sort]);
  useEffect(() => {
    if (!references.data) return;
    const params = new URLSearchParams(routeSearch);
    if (params.get("create") === "1") {
      openCreate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("open")) {
      setSelectedId(Number(params.get("open")));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [references.data, routeSearch]);

  function saved(message: string) {
    toast.success(message);
    setEditorOpen(false);
    setEditingId(null);
    utils.companies.invalidate();
    utils.dashboard.invalidate();
  }

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      ownerId: ownerOptions.length === 1 ? ownerOptions[0].value : "",
    });
    setEditorOpen(true);
  }

  function openEdit() {
    const row = detail.data?.company;
    if (!row) return;
    setEditingId(row.id);
    setForm({
      name: row.name,
      ownerId: String(row.ownerId),
      category: row.category,
      tier: row.tier,
      status: row.status,
      email: row.email || "",
      phone: row.phone || "",
      website: row.website || "",
      industry: row.industry || "",
      segment: row.segment || "",
      destinationCity: row.destinationCity || "",
      leadSource: row.leadSource || "",
      preferredRateType: row.preferredRateType || "",
      relationshipStatus: row.relationshipStatus || "",
      potentialRoomNights: row.potentialRoomNights,
      potentialRevenueCents: row.potentialRevenueCents,
      nextFollowUpAt: inputDateTime(row.nextFollowUpAt),
      contractStartDate: inputDate(row.contractStartDate),
      contractExpiryDate: inputDate(row.contractExpiryDate),
      notes: row.notes || "",
    });
    setEditorOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      ownerId: Number(form.ownerId),
      category: form.category as any,
      tier: form.tier as any,
      status: form.status,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      industry: form.industry || null,
      segment: form.segment || null,
      destinationCity: form.destinationCity || null,
      leadSource: form.leadSource || null,
      preferredRateType: form.preferredRateType || null,
      relationshipStatus: form.relationshipStatus || null,
      potentialRoomNights: form.potentialRoomNights,
      potentialRevenueCents: form.potentialRevenueCents,
      nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt) : null,
      contractStartDate: form.contractStartDate ? new Date(`${form.contractStartDate}T00:00:00`) : null,
      contractExpiryDate: form.contractExpiryDate ? new Date(`${form.contractExpiryDate}T00:00:00`) : null,
      notes: form.notes || null,
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  }

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const duplicateMatches = duplicateCheck.data?.matches ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Relationship intelligence"
        title="Companies"
        description="A focused view of hotel accounts, production potential, relationships, health, and the next commercial move."
        action={<CreateButton label="New company" onClick={openCreate} />}
      />
      <SearchFilters value={search} onChange={setSearch} searchRef={searchRef} activeFilters={[status, category, tier].filter(Boolean).length} onClear={() => { setStatus(""); setCategory(""); setTier(""); }}>
        <FilterSelect value={tier} onChange={setTier} options={tierOptions} placeholder="All tiers" />
        <FilterSelect value={category} onChange={setCategory} options={categoryOptions} placeholder="All categories" />
        <FilterSelect value={status} onChange={setStatus} options={statuses.map(value => ({ value, label: value }))} placeholder="All statuses" />
        <FilterSelect value={sort} onChange={value => setSort(value as CompanySort)} options={companySortOptions.map(option => ({ ...option }))} placeholder="Sort companies" className="w-[170px]" />
      </SearchFilters>

      {query.isLoading ? (
        <LoadingPanel rows={7} />
      ) : query.error ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <div className="surface"><EmptyState icon={Building2} title="No companies in this view" description="Create your first hotel account or broaden the current search and filters." action={<CreateButton label="New company" onClick={openCreate} />} /></div>
      ) : (
        <div className="surface overflow-hidden">
          <RecordTable columns={["Company", "Tier", "Owner", "Category", "Potential", "Next follow-up", "Health"]}>
            {rows.map(row => (
              <tr key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer border-b border-[#e8edf3] transition-colors last:border-0 hover:bg-[#f7fafc]">
                <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e6f7f9] text-[#00677f]"><Building2 className="h-4 w-4" /></div><div><p className="text-xs font-semibold">{row.name}</p><p className="mt-1 text-[12px] text-muted-foreground">{row.segment || row.industry || row.destinationCity || "Account profile"}</p></div></div></td>
                <td className="px-4 py-3.5"><TierBadge tier={row.tier} /></td>
                <td className="px-4 py-3.5 text-xs">{row.ownerName || "—"}</td>
                <td className="px-4 py-3.5 text-xs">{row.category}</td>
                <td className="px-4 py-3.5"><p className="text-xs font-semibold">{money(row.potentialRevenueCents)}</p><p className="mt-1 text-[12px] text-muted-foreground">{row.potentialRoomNights.toLocaleString()} room nights</p></td>
                <td className="px-4 py-3.5 text-xs">{shortDate(row.nextFollowUpAt)}</td>
                <td className="px-4 py-3.5"><StatusBadge value={row.accountHealth.state} /><p className="mt-1 text-[12px] text-muted-foreground">{lastActivityLabel(row.lastActivityAt)}</p></td>
              </tr>
            ))}
          </RecordTable>
          <Pagination page={query.data?.page ?? page} pageSize={query.data?.pageSize ?? 20} total={query.data?.total ?? 0} onPage={setPage} />
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.5rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Edit company" : "Create company"}</DialogTitle>
            <DialogDescription>Start with the essentials. Open the optional sections only when the account needs more commercial detail.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="mt-3 space-y-5">
            <div className="rounded-2xl border border-[#dce5ee] bg-[#f7fafc] p-4">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#00677f]">Essential account details</p>
              <FieldGrid>
                <TextField label="Company name" value={form.name} onChange={value => set("name", value)} required />
                <SelectField label="Owner" value={form.ownerId} onChange={value => set("ownerId", value)} options={ownerOptions} required />
                <SelectField label="Account category" value={form.category} onChange={value => set("category", value)} options={categoryOptions} required />
                <SelectField label="Account tier" value={form.tier} onChange={value => set("tier", value)} options={tierOptions} required />
                <SelectField label="Status" value={form.status} onChange={value => set("status", value as CompanyForm["status"])} options={statuses.map(value => ({ value, label: value }))} />
                <TextField label="Next follow-up" type="datetime-local" value={form.nextFollowUpAt} onChange={value => set("nextFollowUpAt", value)} />
              </FieldGrid>
            </div>

            {duplicateMatches.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-xs font-semibold">Possible duplicate account</p><p className="mt-1 text-[13px] leading-5">{duplicateMatches.map(match => match.name).join("; ")}. You can still save after checking these records.</p></div></div>
              </div>
            )}

            <details className="group rounded-2xl border border-[#dce5ee] bg-white p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[#002460]">Commercial details <span className="ml-2 font-normal text-muted-foreground">Potential, segment, relationship and contract</span></summary>
              <div className="mt-5 space-y-4">
                <FieldGrid>
                  <TextField label="Segment" value={form.segment} onChange={value => set("segment", value)} placeholder="e.g. Technology" />
                  <TextField label="Industry" value={form.industry} onChange={value => set("industry", value)} />
                  <TextField label="Destination city" value={form.destinationCity} onChange={value => set("destinationCity", value)} />
                  <TextField label="Lead source" value={form.leadSource} onChange={value => set("leadSource", value)} />
                  <TextField label="Preferred rate type" value={form.preferredRateType} onChange={value => set("preferredRateType", value)} />
                  <TextField label="Relationship status" value={form.relationshipStatus} onChange={value => set("relationshipStatus", value)} />
                  <TextField label="Potential room nights" type="number" min={0} value={form.potentialRoomNights} onChange={value => set("potentialRoomNights", Number(value) || 0)} />
                  <MoneyField label="Potential revenue" valueCents={form.potentialRevenueCents} onChange={value => set("potentialRevenueCents", value)} />
                  <TextField label="Contract start" type="date" value={form.contractStartDate} onChange={value => set("contractStartDate", value)} />
                  <TextField label="Contract expiry" type="date" value={form.contractExpiryDate} onChange={value => set("contractExpiryDate", value)} />
                </FieldGrid>
              </div>
            </details>

            <details className="group rounded-2xl border border-[#dce5ee] bg-white p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[#002460]">Contact details <span className="ml-2 font-normal text-muted-foreground">Email, phone and website</span></summary>
              <div className="mt-5"><FieldGrid><TextField label="Email" type="email" value={form.email} onChange={value => set("email", value)} /><TextField label="Phone" value={form.phone} onChange={value => set("phone", value)} /><TextField label="Website" value={form.website} onChange={value => set("website", value)} /></FieldGrid></div>
            </details>

            <details className="group rounded-2xl border border-[#dce5ee] bg-white p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[#002460]">Notes <span className="ml-2 font-normal text-muted-foreground">Relationship context and agreed actions</span></summary>
              <div className="mt-5"><TextAreaField label="Commercial notes" value={form.notes} onChange={value => set("notes", value)} placeholder="Relationship context, production history, needs, risks, and agreed actions…" rows={5} /></div>
            </details>

            <DialogActions onCancel={() => setEditorOpen(false)} saving={create.isPending || update.isPending} disabled={!form.name || !form.ownerId} />
          </form>
        </DialogContent>
      </Dialog>

      <CRMDetailSheet open={selectedId !== null} onOpenChange={open => !open && setSelectedId(null)} title={detail.data?.company.name || "Company profile"} eyebrow="Shared group account" loading={detail.isLoading} error={detail.error?.message} action={<Button size="sm" onClick={openEdit} className="rounded-xl"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>}>
        {detail.data && (
          <div className="space-y-7">
            <div className="rounded-2xl border border-[#dce5ee] bg-[#f5fbfc] p-4">
              <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#00677f] shadow-sm"><HeartPulse className="h-4 w-4" /></div><div><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account health</p><div className="mt-1"><StatusBadge value={detail.data.accountHealth.state} /></div></div></div><p className="max-w-[17rem] text-right text-[13px] leading-5 text-muted-foreground">{detail.data.accountHealth.reasons.join(" · ")}</p></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailPair label="Tier" value={<TierBadge tier={detail.data.company.tier} />} />
              <DetailPair label="Category" value={<StatusBadge value={detail.data.company.category} />} />
              <DetailPair label="Status" value={<StatusBadge value={detail.data.company.status} />} />
              <DetailPair label="Owner" value={detail.data.ownerName} />
              <DetailPair label="Segment" value={detail.data.company.segment} />
              <DetailPair label="Potential revenue" value={money(detail.data.company.potentialRevenueCents)} />
              <DetailPair label="Potential room nights" value={detail.data.company.potentialRoomNights.toLocaleString()} />
              <DetailPair label="Email" value={detail.data.company.email} />
              <DetailPair label="Phone" value={detail.data.company.phone} />
              <DetailPair label="Next follow-up" value={shortDate(detail.data.company.nextFollowUpAt)} />
              <DetailPair label="Relationship" value={detail.data.company.relationshipStatus} />
              <DetailPair label="Contract start" value={shortDate(detail.data.company.contractStartDate)} />
              <DetailPair label="Contract expiry" value={shortDate(detail.data.company.contractExpiryDate)} />
              <DetailPair label="Commercial notes" value={detail.data.company.notes} wide />
            </div>
            <div><SectionTitle>Relationships</SectionTitle><div className="grid gap-3 sm:grid-cols-3"><MiniStat icon={ContactRound} label="Contacts" value={detail.data.contacts.length} /><MiniStat icon={Target} label="Opportunities" value={detail.data.opportunities.length} /><MiniStat icon={CalendarClock} label="Activities" value={detail.data.activities.length} /></div></div>
            <div><SectionTitle>Open opportunities</SectionTitle>{detail.data.opportunities.length ? <div className="space-y-2">{detail.data.opportunities.slice(0, 5).map(item => <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#dce5ee] p-3"><div><p className="text-xs font-semibold">{item.name}</p><p className="mt-1 text-[12px] text-muted-foreground">{item.businessType}</p></div><div className="text-right"><p className="text-xs font-semibold">{money(item.valueCents)}</p><StatusBadge value={item.stage} /></div></div>)}</div> : <p className="text-xs text-muted-foreground">No linked opportunities yet.</p>}</div>
            <Button variant="outline" onClick={() => setArchiveOpen(true)} className="w-full rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Archive className="mr-2 h-4 w-4" />Archive company</Button>
          </div>
        )}
      </CRMDetailSheet>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Archive this company?</AlertDialogTitle><AlertDialogDescription>This removes the account from active company views. Existing linked records remain in the database and historical reporting.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => selectedId && archive.mutate({ id: selectedId })} disabled={archive.isPending} className="rounded-xl bg-rose-700 hover:bg-rose-800">{archive.isPending ? "Archiving…" : "Archive company"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return <div className="rounded-xl border border-[#dce5ee] p-3"><Icon className="h-4 w-4 text-[#00758f]" /><p className="mt-3 text-xl font-semibold">{value}</p><p className="mt-1 text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p></div>;
}

function TierBadge({ tier }: { tier: string }) {
  const palette = tier === "Key Account" ? "bg-[#fdf3dd] text-[#8a6a1f]" : tier === "Growth Account" ? "bg-[#e6f7f9] text-[#00677f]" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${palette}`}>{tier}</span>;
}

function lastActivityLabel(value: Date | string | null | undefined) {
  if (!value) return "No activity logged";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Active today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
