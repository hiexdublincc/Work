import { CRMDetailSheet, RecordTable } from "@/components/crm/CRMRecords";
import { DetailPair, DialogActions, FieldGrid, FilterSelect, SearchFilters, SelectField, SectionTitle, TextAreaField, TextField } from "@/components/crm/CRMForms";
import { CreateButton, EmptyState, ErrorPanel, LoadingPanel, PageHeader, Pagination, StatusBadge, fullDateTime, money, useSearchShortcut } from "@/components/crm/CRMPrimitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, Archive, Building2, ContactRound, Pencil, Target } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const statuses = ["Active", "Inactive"] as const;
const contactSortOptions = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Contact name" },
  { value: "created", label: "Newest created" },
] as const;
type ContactSort = (typeof contactSortOptions)[number]["value"];
type ContactForm = {
  firstName: string;
  lastName: string;
  preferredName: string;
  ownerId: string;
  companyId: string;
  status: (typeof statuses)[number];
  email: string;
  phone: string;
  mobile: string;
  jobTitle: string;
  department: string;
  relationshipStatus: string;
  city: string;
  country: string;
  notes: string;
};

const emptyForm: ContactForm = {
  firstName: "",
  lastName: "",
  preferredName: "",
  ownerId: "",
  companyId: "",
  status: "Active",
  email: "",
  phone: "",
  mobile: "",
  jobTitle: "",
  department: "",
  relationshipStatus: "",
  city: "",
  country: "",
  notes: "",
};

export default function Contacts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [sort, setSort] = useState<ContactSort>("updated");
  const [editorOpen, setEditorOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const searchRef = useSearchShortcut();
  const utils = trpc.useUtils();
  const references = trpc.metadata.references.useQuery();

  const query = trpc.contacts.list.useQuery({
    page,
    pageSize: 20,
    search,
    status: (status as (typeof statuses)[number]) || undefined,
    companyId: companyId ? Number(companyId) : undefined,
    sort,
  });
  const detail = trpc.contacts.get.useQuery({ id: selectedId! }, { enabled: selectedId !== null });
  const duplicateInput = useMemo(
    () => ({
      companyId: form.companyId ? Number(form.companyId) : null,
      excludeId: editingId ?? undefined,
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      mobile: form.mobile.trim() || undefined,
    }),
    [editingId, form.companyId, form.email, form.firstName, form.lastName, form.mobile, form.phone],
  );
  const duplicateCheck = trpc.contacts.duplicateCheck.useQuery(duplicateInput, {
    enabled: editorOpen && Boolean((form.firstName.trim() && form.lastName.trim()) || form.email.trim() || form.phone.trim() || form.mobile.trim()),
  });
  const create = trpc.contacts.create.useMutation({ onSuccess: () => saved("Contact created"), onError: error => toast.error(error.message) });
  const update = trpc.contacts.update.useMutation({ onSuccess: () => saved("Contact updated"), onError: error => toast.error(error.message) });
  const archive = trpc.contacts.archive.useMutation({
    onSuccess: () => {
      toast.success("Contact archived");
      setArchiveOpen(false);
      setSelectedId(null);
      utils.contacts.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const ownerOptions = references.data?.assignees.map(item => ({ value: String(item.id), label: item.name || item.email || "JMK user" })) ?? [];
  const companyOptions = references.data?.companies.map(item => ({ value: String(item.id), label: item.label })) ?? [];

  useEffect(() => setPage(1), [search, status, companyId, sort]);
  useEffect(() => {
    if (!references.data) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      openCreate();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [references.data]);

  function set<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function saved(message: string) {
    toast.success(message);
    setEditorOpen(false);
    setEditingId(null);
    utils.contacts.invalidate();
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
    const row = detail.data?.contact;
    if (!row) return;
    setEditingId(row.id);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      preferredName: row.preferredName || "",
      ownerId: String(row.ownerId),
      companyId: row.companyId ? String(row.companyId) : "",
      status: row.status,
      email: row.email || "",
      phone: row.phone || "",
      mobile: row.mobile || "",
      jobTitle: row.jobTitle || "",
      department: row.department || "",
      relationshipStatus: row.relationshipStatus || "",
      city: row.city || "",
      country: row.country || "",
      notes: row.notes || "",
    });
    setEditorOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      preferredName: form.preferredName || null,
      ownerId: Number(form.ownerId),
      companyId: form.companyId ? Number(form.companyId) : null,
      status: form.status,
      email: form.email || null,
      phone: form.phone || null,
      mobile: form.mobile || null,
      jobTitle: form.jobTitle || null,
      department: form.department || null,
      relationshipStatus: form.relationshipStatus || null,
      city: form.city || null,
      country: form.country || null,
      notes: form.notes || null,
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  }

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const duplicateMatches = duplicateCheck.data?.matches ?? [];

  return (
    <>
      <PageHeader eyebrow="People and influence" title="Contacts" description="Keep every decision-maker, relationship signal, and commercial conversation connected to the right account." action={<CreateButton label="New contact" onClick={openCreate} />} />
      <SearchFilters value={search} onChange={setSearch} searchRef={searchRef} activeFilters={[status, companyId].filter(Boolean).length} onClear={() => { setStatus(""); setCompanyId(""); }}>
        <FilterSelect value={companyId} onChange={setCompanyId} options={(references.data?.companies ?? []).map(item => ({ value: String(item.id), label: item.label }))} placeholder="All companies" className="w-[170px]" />
        <FilterSelect value={status} onChange={setStatus} options={statuses.map(value => ({ value, label: value }))} placeholder="All statuses" />
        <FilterSelect value={sort} onChange={value => setSort(value as ContactSort)} options={contactSortOptions.map(option => ({ ...option }))} placeholder="Sort contacts" className="w-[165px]" />
      </SearchFilters>

      {query.isLoading ? (
        <LoadingPanel rows={7} />
      ) : query.error ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : !rows.length ? (
        <div className="surface"><EmptyState icon={ContactRound} title="No contacts in this view" description="Add a relationship or broaden the current search and filters." action={<CreateButton label="New contact" onClick={openCreate} />} /></div>
      ) : (
        <div className="surface overflow-hidden">
          <RecordTable columns={["Contact", "Company", "Relationship", "Owner", "Status"]}>
            {rows.map(row => {
              const name = `${row.firstName} ${row.lastName}`;
              return (
                <tr key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer border-b border-[#edf0ed] transition-colors last:border-0 hover:bg-[#f8faf7]">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-3"><Avatar className="h-9 w-9 border border-[#dce5de]"><AvatarFallback className="bg-[#e8f0e9] text-[11px] font-bold text-[#2e5d48]">{row.firstName[0]}{row.lastName[0]}</AvatarFallback></Avatar><div><p className="text-xs font-semibold">{name}</p><p className="mt-1 text-[10px] text-muted-foreground">{row.jobTitle || row.email || "Contact profile"}</p></div></div></td>
                  <td className="px-4 py-3.5 text-xs">{row.companyName || "Independent"}</td>
                  <td className="px-4 py-3.5 text-xs">{row.relationshipStatus || "—"}</td>
                  <td className="px-4 py-3.5 text-xs">{row.ownerName || "—"}</td>
                  <td className="px-4 py-3.5"><StatusBadge value={row.status} /></td>
                </tr>
              );
            })}
          </RecordTable>
          <Pagination page={query.data?.page ?? page} pageSize={query.data?.pageSize ?? 20} total={query.data?.total ?? 0} onPage={setPage} />
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.5rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Edit contact" : "Create contact"}</DialogTitle>
            <DialogDescription>Capture the essentials first, then add relationship context only when it is useful.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="mt-3 space-y-5">
            <div className="rounded-2xl border border-[#e3e8e3] bg-[#fbfcfa] p-4">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#577363]">Essential contact details</p>
              <FieldGrid>
                <TextField label="First name" value={form.firstName} onChange={value => set("firstName", value)} required />
                <TextField label="Last name" value={form.lastName} onChange={value => set("lastName", value)} required />
                <SelectField label="Linked company" value={form.companyId} onChange={value => set("companyId", value)} options={companyOptions} placeholder="No company" />
                <SelectField label="Owner" value={form.ownerId} onChange={value => set("ownerId", value)} options={ownerOptions} required />
                <TextField label="Email" type="email" value={form.email} onChange={value => set("email", value)} />
              </FieldGrid>
            </div>

            {duplicateMatches.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-xs font-semibold">Possible duplicate contact</p><p className="mt-1 text-[11px] leading-5">{duplicateMatches.map(match => `${match.firstName} ${match.lastName} · ${match.companyName || "Independent"}`).join("; ")}. You can still save after checking these records.</p></div></div>
              </div>
            )}

            <details className="rounded-2xl border border-[#e3e8e3] bg-white p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[#244638]">Role and relationship <span className="ml-2 font-normal text-muted-foreground">Position, influence and current status</span></summary>
              <div className="mt-5"><FieldGrid><TextField label="Preferred name" value={form.preferredName} onChange={value => set("preferredName", value)} /><SelectField label="Status" value={form.status} onChange={value => set("status", value as ContactForm["status"])} options={statuses.map(value => ({ value, label: value }))} /><TextField label="Relationship status" value={form.relationshipStatus} onChange={value => set("relationshipStatus", value)} placeholder="e.g. Champion" /><TextField label="Job title" value={form.jobTitle} onChange={value => set("jobTitle", value)} /><TextField label="Department" value={form.department} onChange={value => set("department", value)} /></FieldGrid></div>
            </details>

            <details className="rounded-2xl border border-[#e3e8e3] bg-white p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[#244638]">Additional contact details <span className="ml-2 font-normal text-muted-foreground">Phone, mobile and location</span></summary>
              <div className="mt-5"><FieldGrid><TextField label="Phone" value={form.phone} onChange={value => set("phone", value)} /><TextField label="Mobile" value={form.mobile} onChange={value => set("mobile", value)} /><TextField label="City" value={form.city} onChange={value => set("city", value)} /><TextField label="Country" value={form.country} onChange={value => set("country", value)} /></FieldGrid></div>
            </details>

            <details className="rounded-2xl border border-[#e3e8e3] bg-white p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[#244638]">Relationship notes <span className="ml-2 font-normal text-muted-foreground">Context, preferences and agreed actions</span></summary>
              <div className="mt-5"><TextAreaField label="Notes" value={form.notes} onChange={value => set("notes", value)} rows={5} /></div>
            </details>

            <DialogActions onCancel={() => setEditorOpen(false)} saving={create.isPending || update.isPending} disabled={!form.firstName || !form.lastName || !form.ownerId} />
          </form>
        </DialogContent>
      </Dialog>

      <CRMDetailSheet open={selectedId !== null} onOpenChange={open => !open && setSelectedId(null)} title={detail.data ? `${detail.data.contact.firstName} ${detail.data.contact.lastName}` : "Contact profile"} eyebrow={detail.data?.companyName || "Relationship"} loading={detail.isLoading} error={detail.error?.message} action={<Button size="sm" onClick={openEdit} className="rounded-xl"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>}>
        {detail.data && <div className="space-y-7"><div className="grid gap-2 sm:grid-cols-2"><DetailPair label="Company" value={detail.data.companyName} /><DetailPair label="Role" value={detail.data.contact.jobTitle} /><DetailPair label="Department" value={detail.data.contact.department} /><DetailPair label="Email" value={detail.data.contact.email} /><DetailPair label="Mobile" value={detail.data.contact.mobile || detail.data.contact.phone} /><DetailPair label="Relationship" value={detail.data.contact.relationshipStatus} /><DetailPair label="Owner" value={detail.data.ownerName} /><DetailPair label="Notes" value={detail.data.contact.notes} wide /></div><div><SectionTitle>Connected commercial work</SectionTitle><div className="grid gap-3 sm:grid-cols-2"><MiniStat icon={Target} label="Opportunities" value={detail.data.opportunities.length} /><MiniStat icon={Activity} label="Activities" value={detail.data.activities.length} /></div></div>{detail.data.opportunities.length > 0 && <div><SectionTitle>Opportunities</SectionTitle><div className="space-y-2">{detail.data.opportunities.slice(0, 5).map(item => <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#e5eae5] p-3"><div><p className="text-xs font-semibold">{item.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{fullDateTime(item.nextActionAt)}</p></div><div className="text-right"><p className="text-xs font-semibold">{money(item.valueCents)}</p><StatusBadge value={item.stage} /></div></div>)}</div></div>}<Button variant="outline" onClick={() => setArchiveOpen(true)} className="w-full rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Archive className="mr-2 h-4 w-4" />Archive contact</Button></div>}
      </CRMDetailSheet>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Archive this contact?</AlertDialogTitle><AlertDialogDescription>This removes the contact from active relationship views. Existing linked activities and opportunities remain available for historical context and reporting.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => selectedId && archive.mutate({ id: selectedId })} disabled={archive.isPending} className="rounded-xl bg-rose-700 hover:bg-rose-800">{archive.isPending ? "Archiving…" : "Archive contact"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return <div className="rounded-xl border border-[#e5eae5] p-3"><Icon className="h-4 w-4 text-[#47735f]" /><p className="mt-3 text-xl font-semibold">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p></div>;
}
