import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DialogActions, FilterSelect, FieldGrid, SearchFilters, SelectField, TextField } from "@/components/crm/CRMForms";
import { EmptyState, ErrorPanel, LoadingPanel, PageHeader, fullDateTime, initials, useSearchShortcut } from "@/components/crm/CRMPrimitives";
import { RecordTable } from "@/components/crm/CRMRecords";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
  isActive: boolean;
  jobTitle: string | null;
  department: string | null;
  lastSignedIn: Date | null;
  createdAt: Date;
  propertyIds: number[];
};

type UserForm = {
  role: "admin" | "user";
  isActive: boolean;
  jobTitle: string;
  department: string;
  propertyIds: number[];
};

const emptyForm: UserForm = { role: "user", isActive: true, jobTitle: "", department: "", propertyIds: [] };

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const searchRef = useSearchShortcut();
  const utils = trpc.useUtils();

  const usersQuery = trpc.admin.users.useQuery({
    search,
    role: role ? role as "admin" | "user" : undefined,
    active: active === "active" ? true : active === "inactive" ? false : undefined,
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      await usersQuery.refetch();
      await utils.auth.me.invalidate();
      setSelected(null);
      toast.success("User access updated");
    },
    onError: error => toast.error(error.message),
  });

  const openEditor = (user: AdminUser) => {
    setSelected(user);
    setForm({
      role: user.role,
      isActive: user.isActive,
      jobTitle: user.jobTitle ?? "",
      department: user.department ?? "",
      propertyIds: user.propertyIds,
    });
  };

  const activeFilters = Number(Boolean(role)) + Number(Boolean(active));
  const counts = useMemo(() => {
    const rows = usersQuery.data?.users ?? [];
    return {
      total: rows.length,
      admins: rows.filter(user => user.role === "admin").length,
      active: rows.filter(user => user.isActive).length,
    };
  }, [usersQuery.data?.users]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (form.role === "user" && form.isActive && form.propertyIds.length === 0) {
      toast.error("Assign at least one property to an active User.");
      return;
    }
    updateUser.mutate({
      id: selected.id,
      role: form.role,
      isActive: form.isActive,
      jobTitle: form.jobTitle.trim() || null,
      department: form.department.trim() || null,
      propertyIds: form.propertyIds,
    });
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Manage CRM roles, hotel access, departments, and account status for authorised JMK Group users."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Matching users" value={counts.total} />
        <Metric label="Active users" value={counts.active} tone="teal" />
        <Metric label="Administrators" value={counts.admins} tone="navy" />
      </div>

      <SearchFilters
        value={search}
        onChange={setSearch}
        searchRef={searchRef}
        activeFilters={activeFilters}
        onClear={() => { setRole(""); setActive(""); }}
      >
        <FilterSelect value={role} onChange={setRole} placeholder="All roles" options={[{ value: "admin", label: "Admin" }, { value: "user", label: "User" }]} />
        <FilterSelect value={active} onChange={setActive} placeholder="Any status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      </SearchFilters>

      {usersQuery.isLoading ? <LoadingPanel rows={6} /> : usersQuery.isError ? (
        <ErrorPanel message={usersQuery.error.message} onRetry={() => usersQuery.refetch()} />
      ) : usersQuery.data?.users.length === 0 ? (
        <div className="surface"><EmptyState icon={UsersRound} title="No users match these filters" description="Clear a filter or search for another authorised user." /></div>
      ) : (
        <>
          <div className="hidden lg:block">
            <RecordTable columns={["User", "Role", "Hotel access", "Department", "Last sign-in", "Action"]}>
              {usersQuery.data?.users.map(user => (
                <tr key={user.id}>
                  <td><UserIdentity user={user as AdminUser} /></td>
                  <td><RoleBadge role={user.role} active={user.isActive} /></td>
                  <td className="max-w-72"><PropertySummary ids={user.propertyIds} properties={usersQuery.data.properties} /></td>
                  <td><p className="text-xs font-medium">{user.department || "—"}</p><p className="mt-1 text-[12px] text-muted-foreground">{user.jobTitle || "No title"}</p></td>
                  <td className="text-xs text-muted-foreground">{fullDateTime(user.lastSignedIn)}</td>
                  <td className="text-right"><Button variant="outline" size="sm" onClick={() => openEditor(user as AdminUser)} className="rounded-xl bg-white"><UserCog className="mr-2 h-3.5 w-3.5" />Manage</Button></td>
                </tr>
              ))}
            </RecordTable>
          </div>

          <div className="grid gap-3 lg:hidden">
            {usersQuery.data?.users.map(user => (
              <button key={user.id} onClick={() => openEditor(user as AdminUser)} className="surface flex w-full items-start gap-3 p-4 text-left transition-transform active:scale-[0.99]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f4f5] text-xs font-bold text-[#005a73]">{initials(user.name || user.email || "JMK user")}</div>
                <div className="min-w-0 flex-1"><UserIdentity user={user as AdminUser} compact /><div className="mt-3 flex flex-wrap items-center gap-2"><RoleBadge role={user.role} active={user.isActive} /><span className="text-[12px] text-muted-foreground">{user.propertyIds.length} hotel{user.propertyIds.length === 1 ? "" : "s"}</span></div></div>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">Manage user access</DialogTitle><DialogDescription>Update role, hotel assignments, and profile details. Users are provisioned through secure sign-in.</DialogDescription></DialogHeader>
          {selected && <form onSubmit={submit} className="mt-2 space-y-6">
            <div className="rounded-2xl border border-[#e0e6ec] bg-[#f6f8fa] p-4"><UserIdentity user={selected} /><p className="mt-2 text-[12px] text-muted-foreground">Joined {fullDateTime(selected.createdAt)}</p></div>
            <FieldGrid>
              <SelectField label="CRM role" required value={form.role} onChange={value => setForm(current => ({ ...current, role: value as UserForm["role"] }))} options={[{ value: "user", label: "User", description: "Limited to assigned hotels" }, { value: "admin", label: "Admin", description: "Group-wide access and administration" }]} />
              <div className="space-y-2"><Label className="text-[13px] font-semibold">Account status</Label><div className="flex h-10 items-center justify-between rounded-xl border border-[#dde4de] bg-white px-3"><span className="text-xs font-medium">{form.isActive ? "Active" : "Inactive"}</span><Switch checked={form.isActive} onCheckedChange={checked => setForm(current => ({ ...current, isActive: checked }))} /></div></div>
              <TextField label="Job title" value={form.jobTitle} onChange={value => setForm(current => ({ ...current, jobTitle: value }))} placeholder="e.g. Director of Sales" />
              <TextField label="Department" value={form.department} onChange={value => setForm(current => ({ ...current, department: value }))} placeholder="e.g. Commercial" />
            </FieldGrid>

            <div>
              <div className="mb-3"><Label className="text-[13px] font-semibold">Hotel access</Label><p className="mt-1 text-[12px] leading-4 text-muted-foreground">Active Users require at least one hotel. Admins have group-wide visibility, but assignments can still identify their primary properties.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {usersQuery.data?.properties.filter(property => property.isActive).map(property => {
                  const checked = form.propertyIds.includes(property.id);
                  return <label key={property.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e0e6ec] bg-white p-3 transition-colors hover:bg-[#f8fafc]"><Checkbox checked={checked} onCheckedChange={value => setForm(current => ({ ...current, propertyIds: value ? [...current.propertyIds, property.id] : current.propertyIds.filter(id => id !== property.id) }))} /><span><span className="block text-xs font-semibold">{property.name}</span><span className="mt-0.5 block text-[12px] text-muted-foreground">{property.city} · {property.code}</span></span></label>;
                })}
              </div>
            </div>
            <DialogActions onCancel={() => setSelected(null)} saving={updateUser.isPending} submitLabel="Save user access" />
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "teal" | "navy" }) {
  const className = tone === "teal" ? "bg-[#e8f7f9] text-[#005a73]" : tone === "navy" ? "bg-[#e9eef8] text-[#002460]" : "bg-white text-foreground";
  return <div className={`surface px-4 py-4 ${className}`}><p className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-65">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}

function UserIdentity({ user, compact = false }: { user: AdminUser; compact?: boolean }) {
  return <div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">{user.name || "Unnamed user"}</p><p className={`truncate text-muted-foreground ${compact ? "mt-0.5 text-[12px]" : "mt-1 text-[13px]"}`}>{user.email || "No email"}</p></div>;
}

function RoleBadge({ role, active }: { role: "admin" | "user"; active: boolean }) {
  return <div className="flex flex-wrap items-center gap-1.5"><Badge variant="outline" className={role === "admin" ? "border-[#b9e3e8] bg-[#e8f7f9] text-[#005a73]" : "border-[#dce3ea] bg-white text-[#536277]"}>{role === "admin" && <ShieldCheck className="mr-1 h-3 w-3" />}{role}</Badge>{!active && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Inactive</Badge>}</div>;
}

function PropertySummary({ ids, properties }: { ids: number[]; properties: Array<{ id: number; name: string }> }) {
  if (!ids.length) return <span className="text-xs text-muted-foreground">Group-wide / unassigned</span>;
  const names = ids.map(id => properties.find(property => property.id === id)?.name).filter(Boolean) as string[];
  return <div className="flex flex-wrap gap-1">{names.slice(0, 2).map(name => <Badge key={name} variant="outline" className="max-w-full truncate border-[#dce4e9] bg-white text-[11px] text-[#46576a]">{name}</Badge>)}{names.length > 2 && <Badge variant="outline" className="border-[#dce4e9] bg-white text-[11px] text-[#46576a]">+{names.length - 2}</Badge>}</div>;
}
