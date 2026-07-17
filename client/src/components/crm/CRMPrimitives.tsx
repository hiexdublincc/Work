import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowLeft, ArrowRight, Inbox, Plus, RefreshCcw, type LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

export function PageHeader({ eyebrow, title, description, action, secondary }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="page-header page-enter">
      <div><p className="eyebrow">{eyebrow ?? "JMK Group CRM"}</p><h2 className="page-title mt-2">{title}</h2>{description && <p className="page-description">{description}</p>}</div>
      {(action || secondary) && <div className="flex flex-wrap items-center gap-2">{secondary}{action}</div>}
    </div>
  );
}

export function CreateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button onClick={onClick} className="h-10 rounded-xl px-4 shadow-[0_9px_20px_rgba(27,66,51,0.16)]"><Plus className="mr-2 h-4 w-4" />{label}</Button>;
}

export function LoadingPanel({ rows = 5 }: { rows?: number }) {
  return <div className="surface space-y-3 p-5">{Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-11 w-full rounded-xl" />)}</div>;
}

export function ErrorPanel({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="surface flex min-h-56 flex-col items-center justify-center px-6 text-center"><div className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600"><AlertCircle className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-semibold">We couldn’t load this view</h3><p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">{message || "Please try again. If the problem continues, contact your administrator."}</p>{onRetry && <Button variant="outline" size="sm" onClick={onRetry} className="mt-5 rounded-xl"><RefreshCcw className="mr-2 h-3.5 w-3.5" />Try again</Button>}</div>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e0e7e1] bg-[#f3f7f3] text-[#4f735f]"><Icon className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const palette = statusPalette(value);
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", palette.bg, palette.text)}><span className={cn("status-dot", palette.dot)} />{value}</span>;
}

function statusPalette(value: string) {
  if (["Active", "Qualified", "Closed Won", "Converted", "Completed"].includes(value)) return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (["Proposal", "Negotiation", "Contacted", "Nurturing", "In Progress"].includes(value)) return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
  if (["Closed Lost", "Disqualified", "Inactive", "Overdue"].includes(value)) return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" };
  return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };
}

export function money(cents: number | null | undefined, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fullDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex items-center justify-between border-t border-[#eaeeea] px-4 py-3"><p className="text-[11px] text-muted-foreground">{total === 0 ? "No records" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</p><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-white" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ArrowLeft className="h-3.5 w-3.5" /></Button><span className="min-w-16 text-center text-[11px] font-medium">{page} / {pages}</span><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-white" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ArrowRight className="h-3.5 w-3.5" /></Button></div></div>;
}

export function useSearchShortcut() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focus = () => ref.current?.focus();
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); focus(); }
    };
    document.addEventListener("jmk:search", focus);
    window.addEventListener("keydown", shortcut);
    return () => { document.removeEventListener("jmk:search", focus); window.removeEventListener("keydown", shortcut); };
  }, []);
  return ref;
}

export function ownerLabel(name?: string | null) {
  return name || "Unassigned";
}
