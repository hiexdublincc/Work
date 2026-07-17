import { ErrorPanel, LoadingPanel } from "@/components/crm/CRMPrimitives";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ReactNode } from "react";

export function RecordTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[780px] border-collapse"><thead><tr className="border-b border-[#e5eae5] bg-[#fafbf9]">{columns.map(column => <th key={column} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function CRMDetailSheet({ open, onOpenChange, title, eyebrow, description, loading, error, action, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; eyebrow?: string; description?: string;
  loading?: boolean; error?: string; action?: ReactNode; children?: ReactNode;
}) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full border-l border-[#dfe6df] bg-[#fbfcfa] p-0 sm:max-w-xl"><div className="border-b border-[#e5eae5] bg-white px-6 py-5"><SheetHeader className="text-left"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="eyebrow">{eyebrow || "JMK Group CRM"}</p><SheetTitle className="mt-2 truncate font-display text-2xl tracking-[-0.025em]">{title}</SheetTitle>{description && <SheetDescription className="mt-2 text-xs leading-5">{description}</SheetDescription>}</div>{action}</div></SheetHeader></div><ScrollArea className="h-[calc(100vh-102px)]"><div className="p-6">{loading ? <LoadingPanel rows={7} /> : error ? <ErrorPanel message={error} /> : children}</div></ScrollArea></SheetContent></Sheet>;
}
