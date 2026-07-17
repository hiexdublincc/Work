import { PropertyIdentity } from "@/components/BrandIdentity";
import { DialogActions, FieldGrid, SelectField, TextField } from "@/components/crm/CRMForms";
import { ErrorPanel, LoadingPanel, PageHeader } from "@/components/crm/CRMPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Building2, Globe2, Pencil, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SettingsForm = {
  organizationName: string;
  defaultCurrency: string;
  timezone: string;
  fiscalYearStartMonth: string;
};

type PropertyRow = {
  id: number;
  name: string;
  code: string;
  city: string;
  country: string;
  isActive: boolean;
};

type PropertyForm = Omit<PropertyRow, "id">;

const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((label, index) => ({ value: String(index + 1), label }));
const currencyOptions = [
  { value: "GBP", label: "GBP · British pound" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "USD", label: "USD · US dollar" },
];
const timezoneOptions = [
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Dublin", label: "Europe/Dublin" },
  { value: "UTC", label: "UTC" },
];

export default function SystemSettings() {
  const settingsQuery = trpc.admin.settings.useQuery();
  const propertiesQuery = trpc.admin.properties.useQuery();
  const [settings, setSettings] = useState<SettingsForm>({ organizationName: "", defaultCurrency: "GBP", timezone: "Europe/London", fiscalYearStartMonth: "1" });
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [propertyForm, setPropertyForm] = useState<PropertyForm>({ name: "", code: "", city: "", country: "United Kingdom", isActive: true });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSettings({
      organizationName: settingsQuery.data.organizationName,
      defaultCurrency: settingsQuery.data.defaultCurrency,
      timezone: settingsQuery.data.timezone,
      fiscalYearStartMonth: String(settingsQuery.data.fiscalYearStartMonth),
    });
  }, [settingsQuery.data]);

  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await settingsQuery.refetch();
      toast.success("Organisation settings saved");
    },
    onError: error => toast.error(error.message),
  });

  const updateProperty = trpc.admin.updateProperty.useMutation({
    onSuccess: async () => {
      await propertiesQuery.refetch();
      setProperty(null);
      toast.success("Hotel settings saved");
    },
    onError: error => toast.error(error.message),
  });

  const counts = useMemo(() => {
    const rows = propertiesQuery.data ?? [];
    return { total: rows.length, active: rows.filter(item => item.isActive).length, countries: new Set(rows.map(item => item.country)).size };
  }, [propertiesQuery.data]);

  const openProperty = (row: PropertyRow) => {
    setProperty(row);
    setPropertyForm({ name: row.name, code: row.code, city: row.city, country: row.country, isActive: row.isActive });
  };

  const saveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings.mutate({
      organizationName: settings.organizationName.trim(),
      defaultCurrency: settings.defaultCurrency,
      timezone: settings.timezone,
      fiscalYearStartMonth: Number(settings.fiscalYearStartMonth),
    });
  };

  const saveProperty = (event: React.FormEvent) => {
    event.preventDefault();
    if (!property) return;
    updateProperty.mutate({ id: property.id, ...propertyForm });
  };

  if (settingsQuery.isLoading || propertiesQuery.isLoading) return <div className="mx-auto max-w-[1400px]"><PageHeader eyebrow="Administration" title="System settings" description="Configure organisation defaults and hotel records." /><LoadingPanel rows={8} /></div>;
  if (settingsQuery.isError || propertiesQuery.isError) return <div className="mx-auto max-w-[1400px]"><PageHeader eyebrow="Administration" title="System settings" /><ErrorPanel message={settingsQuery.error?.message || propertiesQuery.error?.message} onRetry={() => { settingsQuery.refetch(); propertiesQuery.refetch(); }} /></div>;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader eyebrow="Administration" title="System settings" description="Manage group defaults and the hotel directory used throughout commercial records and reporting." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric icon={Building2} label="Hotels" value={counts.total} />
        <Metric icon={Settings2} label="Active hotels" value={counts.active} tone="teal" />
        <Metric icon={Globe2} label="Countries" value={counts.countries} tone="navy" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="surface h-fit p-5 sm:p-6">
          <div className="mb-5"><p className="eyebrow">Group defaults</p><h3 className="mt-2 font-display text-2xl tracking-[-0.025em]">Organisation settings</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">These values control currency, timezone, and financial-year defaults across the CRM.</p></div>
          <form onSubmit={saveSettings}>
            <div className="space-y-4">
              <TextField label="Organisation name" required value={settings.organizationName} onChange={value => setSettings(current => ({ ...current, organizationName: value }))} />
              <SelectField label="Default currency" required value={settings.defaultCurrency} onChange={value => setSettings(current => ({ ...current, defaultCurrency: value }))} options={currencyOptions} />
              <SelectField label="Timezone" required value={settings.timezone} onChange={value => setSettings(current => ({ ...current, timezone: value }))} options={timezoneOptions} />
              <SelectField label="Financial year starts" required value={settings.fiscalYearStartMonth} onChange={value => setSettings(current => ({ ...current, fiscalYearStartMonth: value }))} options={monthOptions} />
            </div>
            <div className="mt-6 flex justify-end border-t border-[#e5eae5] pt-5"><Button type="submit" disabled={updateSettings.isPending || !settings.organizationName.trim()} className="rounded-xl px-5">{updateSettings.isPending ? "Saving…" : "Save organisation settings"}</Button></div>
          </form>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-4"><div><p className="eyebrow">Portfolio directory</p><h3 className="mt-2 font-display text-2xl tracking-[-0.025em]">Hotels</h3></div><p className="text-right text-[10px] leading-4 text-muted-foreground">Edit naming and status.<br />Logo identity follows the mapped hotel brand.</p></div>
          <div className="grid gap-3">
            {propertiesQuery.data?.map(row => (
              <article key={row.id} className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <PropertyIdentity propertyName={row.name} className="min-w-0 flex-1" />
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant="outline" className="border-[#dce4e9] bg-white text-[#46576a]">{row.city}</Badge>
                  <Badge variant="outline" className={row.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                  <Button variant="outline" size="sm" onClick={() => openProperty(row as PropertyRow)} className="rounded-xl bg-white"><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={Boolean(property)} onOpenChange={open => !open && setProperty(null)}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">Edit hotel settings</DialogTitle><DialogDescription>Update the CRM directory record. Deactivating a hotel prevents new user assignments but retains its commercial history.</DialogDescription></DialogHeader>
          {property && <form onSubmit={saveProperty} className="mt-2">
            <div className="mb-5 rounded-2xl border border-[#e0e6ec] bg-[#f7f9fb] p-4"><PropertyIdentity propertyName={property.name} /></div>
            <FieldGrid>
              <TextField label="Hotel name" required value={propertyForm.name} onChange={value => setPropertyForm(current => ({ ...current, name: value }))} />
              <TextField label="Code" required value={propertyForm.code} onChange={value => setPropertyForm(current => ({ ...current, code: value.toUpperCase().slice(0, 32) }))} />
              <TextField label="City" required value={propertyForm.city} onChange={value => setPropertyForm(current => ({ ...current, city: value }))} />
              <TextField label="Country" required value={propertyForm.country} onChange={value => setPropertyForm(current => ({ ...current, country: value }))} />
            </FieldGrid>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#dde4de] bg-white px-4 py-3"><div><Label className="text-xs font-semibold">Hotel status</Label><p className="mt-1 text-[10px] text-muted-foreground">{propertyForm.isActive ? "Available for assignments and new records" : "Retained for historical reporting only"}</p></div><Switch checked={propertyForm.isActive} onCheckedChange={checked => setPropertyForm(current => ({ ...current, isActive: checked }))} /></div>
            <DialogActions onCancel={() => setProperty(null)} saving={updateProperty.isPending} submitLabel="Save hotel" disabled={!propertyForm.name.trim() || !propertyForm.code.trim() || !propertyForm.city.trim() || !propertyForm.country.trim()} />
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "slate" }: { icon: typeof Building2; label: string; value: number; tone?: "slate" | "teal" | "navy" }) {
  const palette = tone === "teal" ? "bg-[#e8f7f9] text-[#005a73]" : tone === "navy" ? "bg-[#e9eef8] text-[#002460]" : "bg-white text-foreground";
  return <div className={`surface flex items-center gap-3 px-4 py-4 ${palette}`}><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/70"><Icon className="h-4 w-4" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-65">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></div></div>;
}
