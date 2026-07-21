import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";

export type Option = { value: string; label: string; description?: string };

export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function TextField({ label, value, onChange, placeholder, type = "text", required, className, min, max }: {
  label: string; value: string | number; onChange: (value: string) => void; placeholder?: string;
  type?: string; required?: boolean; className?: string; min?: number; max?: number;
}) {
  return <div className={cn("space-y-2", className)}><Label className="text-[13px] font-semibold text-foreground">{label}{required && <span className="ml-1 text-[#a15c45]">*</span>}</Label><Input type={type} value={value} min={min} max={max} required={required} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-10 rounded-xl border-[#dde4de] bg-white text-sm shadow-none focus-visible:ring-[#47735f]/25" /></div>;
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 4, className }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; className?: string;
}) {
  return <div className={cn("space-y-2", className)}><Label className="text-[13px] font-semibold text-foreground">{label}</Label><Textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="resize-none rounded-xl border-[#dde4de] bg-white text-sm shadow-none focus-visible:ring-[#47735f]/25" /></div>;
}

export function SelectField({ label, value, onChange, options, placeholder = "Select", required, className }: {
  label: string; value?: string; onChange: (value: string) => void; options: Option[];
  placeholder?: string; required?: boolean; className?: string;
}) {
  return <div className={cn("space-y-2", className)}><Label className="text-[13px] font-semibold text-foreground">{label}{required && <span className="ml-1 text-[#a15c45]">*</span>}</Label><Select value={value || undefined} onValueChange={onChange}><SelectTrigger className="h-10 w-full rounded-xl border-[#dde4de] bg-white text-sm shadow-none"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent className="rounded-xl">{options.map(option => <SelectItem key={option.value} value={option.value} className="rounded-lg"><div><p>{option.label}</p>{option.description && <p className="mt-0.5 text-[12px] text-muted-foreground">{option.description}</p>}</div></SelectItem>)}</SelectContent></Select></div>;
}

export function MoneyField({ label, valueCents, onChange, required, className }: {
  label: string; valueCents: number; onChange: (cents: number) => void; required?: boolean; className?: string;
}) {
  const value = Number.isFinite(valueCents) ? String(valueCents / 100) : "0";
  return <div className={cn("space-y-2", className)}><Label className="text-[13px] font-semibold text-foreground">{label}{required && <span className="ml-1 text-[#a15c45]">*</span>}</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">£</span><Input type="number" min={0} step="0.01" value={value} required={required} onChange={event => onChange(Math.round(Math.max(0, Number(event.target.value) || 0) * 100))} className="h-10 rounded-xl border-[#dde4de] bg-white pl-7 text-sm shadow-none focus-visible:ring-[#47735f]/25" /></div></div>;
}

export function SearchFilters({ value, onChange, searchRef, children, onClear, activeFilters = 0 }: {
  value: string; onChange: (value: string) => void; searchRef?: React.RefObject<HTMLInputElement | null>;
  children?: ReactNode; onClear?: () => void; activeFilters?: number;
}) {
  return <div className="surface mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={searchRef} value={value} onChange={event => onChange(event.target.value)} placeholder="Search records…" className="h-10 rounded-xl border-transparent bg-[#f3f6f2] pl-9 shadow-none focus-visible:bg-white" /></div>{children && <div className="flex flex-wrap items-center gap-2"><span className="hidden items-center gap-1 text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground xl:flex"><SlidersHorizontal className="h-3.5 w-3.5" />Filters</span>{children}{activeFilters > 0 && onClear && <Button variant="ghost" size="sm" onClick={onClear} className="h-9 rounded-xl px-2 text-xs text-muted-foreground"><X className="mr-1 h-3.5 w-3.5" />Clear ({activeFilters})</Button>}</div>}</div>;
}

export function FilterSelect({ value, onChange, options, placeholder, className }: {
  value: string; onChange: (value: string) => void; options: Option[]; placeholder: string; className?: string;
}) {
  return <Select value={value || "all"} onValueChange={value => onChange(value === "all" ? "" : value)}><SelectTrigger className={cn("h-9 w-[145px] rounded-xl border-[#dde4de] bg-white text-xs shadow-none", className)}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all" className="rounded-lg">{placeholder}</SelectItem>{options.map(option => <SelectItem key={option.value} value={option.value} className="rounded-lg">{option.label}</SelectItem>)}</SelectContent></Select>;
}

export function DialogActions({ onCancel, saving, submitLabel = "Save record", disabled }: { onCancel: () => void; saving: boolean; submitLabel?: string; disabled?: boolean }) {
  return <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#e8ece8] pt-5"><Button type="button" variant="outline" onClick={onCancel} className="rounded-xl bg-white">Cancel</Button><Button type="submit" disabled={saving || disabled} className="rounded-xl px-5">{saving ? "Saving…" : submitLabel}</Button></div>;
}

export function DetailPair({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return <div className={cn("min-w-0 rounded-xl bg-[#f5f7f4] px-3.5 py-3", wide && "sm:col-span-2")}><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><div className="mt-1.5 break-words text-xs font-medium text-foreground">{value || "—"}</div></div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-display text-lg tracking-[-0.015em] text-foreground">{children}</h3>{action}</div>;
}
