import { useAuth } from "@/_core/hooks/useAuth";
import { PropertyLogo } from "@/components/BrandIdentity";
import { DialogActions, FieldGrid, SelectField, TextAreaField, TextField } from "@/components/crm/CRMForms";
import {
  CreateButton,
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  shortDate,
} from "@/components/crm/CRMPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Archive, BookOpen, Building2, Download, FileText, ParkingCircle, Phone, Sparkles, Upload, Users } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { applyPropertyBrandTheme, getPropertyBrand } from "@/lib/brand";

type Form = {
  overview: string;
  facilities: string;
  meetingCapacity: string;
  parkingInfo: string;
  sellingPoints: string;
  salesContacts: string;
};

const emptyForm: Form = { overview: "", facilities: "", meetingCapacity: "", parkingInfo: "", sellingPoints: "", salesContacts: "" };

export default function HotelKnowledge() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [propertyId, setPropertyId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Brochure");
  const [form, setForm] = useState<Form>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const list = trpc.hotelKnowledge.list.useQuery();
  const detail = trpc.hotelKnowledge.get.useQuery({ propertyId: Number(propertyId) }, { enabled: !!propertyId });
  const update = trpc.hotelKnowledge.update.useMutation({
    onSuccess: () => { toast.success("Hotel knowledge saved"); setEditorOpen(false); utils.hotelKnowledge.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const upload = trpc.hotelKnowledge.uploadCollateral.useMutation({
    onSuccess: () => { toast.success("Collateral uploaded"); setUploadLabel(""); if (fileRef.current) fileRef.current.value = ""; utils.hotelKnowledge.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const archiveCollateral = trpc.hotelKnowledge.archiveCollateral.useMutation({
    onSuccess: () => { toast.success("Collateral archived"); utils.hotelKnowledge.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const properties = useMemo(() => list.data ?? [], [list.data]);

  useMemo(() => {
    if (!propertyId && properties.length) setPropertyId(String(properties[0].propertyId));
  }, [properties, propertyId]);

  const active = properties.find(item => String(item.propertyId) === propertyId) ?? properties[0];
  useEffect(() => {
    applyPropertyBrandTheme(getPropertyBrand(active?.propertyName) ?? null);
  }, [active?.propertyName]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openEdit() {
    const knowledge = detail.data?.knowledge;
    setForm({
      overview: knowledge?.overview || "",
      facilities: knowledge?.facilities || "",
      meetingCapacity: knowledge?.meetingRoomCapacity || "",
      parkingInfo: knowledge?.parking || "",
      sellingPoints: knowledge?.sellingPoints || "",
      salesContacts: knowledge?.salesContacts || "",
    });
    setEditorOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    update.mutate({ propertyId: Number(propertyId), ...form });
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !propertyId) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("File must be 8 MB or smaller"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = String(reader.result);
      upload.mutate({
        propertyId: Number(propertyId),
        label: uploadLabel.trim() || file.name,
        category: uploadCategory,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        base64Data,
      });
    };
    reader.readAsDataURL(file);
  }

  if (list.isLoading) return <div className="page-enter max-w-[1400px]"><PageHeader eyebrow="Shared knowledge base" title="Hotel knowledge" /><LoadingPanel rows={7} /></div>;
  if (list.error) return <div className="page-enter max-w-[1400px]"><PageHeader eyebrow="Shared knowledge base" title="Hotel knowledge" /><ErrorPanel message={list.error.message} onRetry={() => list.refetch()} /></div>;
  if (!properties.length) return <div className="page-enter max-w-[1400px]"><PageHeader eyebrow="Shared knowledge base" title="Hotel knowledge" /><div className="surface"><EmptyState icon={BookOpen} title="No properties in your scope" description="You do not have any assigned properties yet." /></div></div>;

  return (
    <div className="page-enter max-w-[1400px]">
      <PageHeader
        eyebrow="Shared knowledge base"
        title="Hotel knowledge"
        description="Overview, facilities, meeting capacities, parking, selling points, sales contacts, and collateral for each property."
        action={isAdmin ? <CreateButton label="Edit page" onClick={openEdit} /> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {properties.map(item => (
          <button
            key={item.propertyId}
            onClick={() => setPropertyId(String(item.propertyId))}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors duration-500 ${String(item.propertyId) === propertyId ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white" : "border-[#dde4de] bg-white text-foreground hover:bg-[#f7fafc]"}`}
          >
            <PropertyLogo propertyName={item.propertyName} />
            {item.propertyName}
          </button>
        ))}
      </div>

      {detail.isLoading ? (
        <LoadingPanel rows={6} />
      ) : detail.error ? (
        <ErrorPanel message={detail.error.message} onRetry={() => detail.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <KnowledgeSection icon={Building2} title="Overview" content={detail.data?.knowledge?.overview} empty="No overview added yet." />
            <KnowledgeSection icon={Sparkles} title="Key selling points" content={detail.data?.knowledge?.sellingPoints} empty="No selling points added yet." />
            <KnowledgeSection icon={FileText} title="Facilities" content={detail.data?.knowledge?.facilities} empty="No facilities information added yet." />
            <div className="grid gap-4 sm:grid-cols-2">
              <KnowledgeSection icon={Users} title="Meeting room capacities" content={detail.data?.knowledge?.meetingRoomCapacity} empty="Not added yet." />
              <KnowledgeSection icon={ParkingCircle} title="Parking" content={detail.data?.knowledge?.parking} empty="Not added yet." />
            </div>
            <KnowledgeSection icon={Phone} title="Sales contacts" content={detail.data?.knowledge?.salesContacts} empty="No sales contacts added yet." />
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-[#e8edf3] px-5 py-4"><h3 className="text-sm font-semibold">Collateral</h3><p className="mt-1 text-[12px] text-muted-foreground">Brochures, floor plans, and brand documents.</p></div>
            {isAdmin && (
              <div className="space-y-2 border-b border-[#e8edf3] p-4">
                <TextField label="Label" value={uploadLabel} onChange={setUploadLabel} placeholder="e.g. 2026 brochure" />
                <SelectField
                  label="Category"
                  value={uploadCategory}
                  onChange={setUploadCategory}
                  options={["Brochure", "Floor plan", "Presentation", "Brand document"].map(item => ({ value: item, label: item }))}
                />
                <input ref={fileRef} type="file" onChange={handleFile} className="hidden" id="collateral-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" />
                <label htmlFor="collateral-file" className="flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#c3d0c8] bg-[#f7faf7] text-xs font-semibold text-[#47735f] hover:bg-[#eef4e9]">
                  <Upload className="mr-2 h-3.5 w-3.5" />{upload.isPending ? "Uploading…" : "Upload collateral"}
                </label>
              </div>
            )}
            <div className="divide-y divide-[#e8edf3]">
              {!detail.data?.collateral.length ? (
                <div className="p-5"><EmptyState icon={FileText} title="No collateral yet" description="Approved sales collateral for this property will appear here." /></div>
              ) : (
                detail.data.collateral.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf3f8] text-[#00758f]"><FileText className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.label}</p><p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{item.category} · {shortDate(item.createdAt)}</p></div>
                    <a href={item.fileUrl} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Download className="h-3.5 w-3.5" /></Button></a>
                    {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700" onClick={() => archiveCollateral.mutate({ id: item.id })}><Archive className="h-3.5 w-3.5" /></Button>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[1.5rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Edit {active?.propertyName}</DialogTitle>
            <DialogDescription>Update the shared sales-information page for this property.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="mt-3 space-y-5">
            <TextAreaField label="Overview" value={form.overview} onChange={value => set("overview", value)} rows={4} />
            <TextAreaField label="Facilities" value={form.facilities} onChange={value => set("facilities", value)} rows={4} />
            <FieldGrid>
              <TextAreaField label="Meeting room capacities" value={form.meetingCapacity} onChange={value => set("meetingCapacity", value)} rows={3} />
              <TextAreaField label="Parking information" value={form.parkingInfo} onChange={value => set("parkingInfo", value)} rows={3} />
            </FieldGrid>
            <TextAreaField label="Key selling points" value={form.sellingPoints} onChange={value => set("sellingPoints", value)} rows={4} />
            <TextAreaField label="Sales contacts" value={form.salesContacts} onChange={value => set("salesContacts", value)} rows={3} />
            <DialogActions onCancel={() => setEditorOpen(false)} saving={update.isPending} submitLabel="Save page" />
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KnowledgeSection({ icon: Icon, title, content, empty }: { icon: typeof Building2; title: string; content?: string | null; empty: string }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e8f7f9] text-[#00758f]"><Icon className="h-4 w-4" /></span><h3 className="text-sm font-semibold">{title}</h3></div>
      <p className="mt-3 whitespace-pre-line text-xs leading-5 text-muted-foreground">{content || empty}</p>
    </div>
  );
}
