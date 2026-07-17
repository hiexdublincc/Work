import { SelectField } from "@/components/crm/CRMForms";
import { ErrorPanel, LoadingPanel, PageHeader } from "@/components/crm/CRMPrimitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Database, Download, FileWarning, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Entity = "companies" | "contacts" | "leads" | "opportunities";

const ENTITY_OPTIONS = [
  { value: "companies", label: "Companies" },
  { value: "contacts", label: "Contacts" },
  { value: "leads", label: "Leads" },
  { value: "opportunities", label: "Opportunities" },
];

export default function DataStudio() {
  const [entity, setEntity] = useState<Entity>("companies");
  const [step, setStep] = useState<"select" | "preview">("select");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ imported: number; errors: Array<{ row: number; message: string }>; ready: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const templates = trpc.data.templates.useQuery();
  const exportQuery = trpc.data.exportCsv.useQuery({ entity }, { enabled: false });
  const importRows = trpc.data.importRows.useMutation({
    onSuccess: data => {
      setResult(data);
      if (data.ready) toast.success(`Imported ${data.imported} ${entity}`);
      else toast.error("Some rows need fixing before import");
    },
    onError: error => toast.error(error.message),
  });

  const columns = templates.data?.[entity] ?? [];

  function downloadTemplate() {
    const csv = columns.join(",") + "\n";
    triggerDownload(`jmk-${entity}-template.csv`, csv);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result));
        if (!parsed.length) {
          toast.error("The file has no data rows");
          return;
        }
        setRows(parsed);
        setStep("preview");
      } catch {
        toast.error("Could not read this CSV file");
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    importRows.mutate({ entity, rows });
  }

  async function handleExport() {
    const { data } = await exportQuery.refetch();
    if (!data) return;
    if (!data.count) {
      toast.info(`No ${entity} records in your scope to export`);
      return;
    }
    triggerDownload(data.filename, data.csv);
  }

  function reset() {
    setStep("select");
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="page-enter max-w-[1200px]">
      <PageHeader
        eyebrow="Bulk data management"
        title="Data studio"
        description="Import Companies, Contacts, Leads, and Opportunities from CSV, or export your authorised scope for reporting."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f7f9] text-[#00758f]"><Download className="h-4 w-4" /></span>
            <div><h3 className="font-display text-lg tracking-[-0.015em]">Export</h3><p className="mt-0.5 text-xs text-muted-foreground">Download the entity in your authorised scope as CSV.</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <SelectField label="Entity" value={entity} onChange={value => setEntity(value as Entity)} options={ENTITY_OPTIONS} />
            <Button onClick={handleExport} disabled={exportQuery.isFetching} className="w-full rounded-xl">
              {exportQuery.isFetching ? "Preparing export…" : `Export ${entity} to CSV`}
            </Button>
          </div>
        </div>

        <div className="surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef4e9] text-[#47735f]"><Upload className="h-4 w-4" /></span>
            <div><h3 className="font-display text-lg tracking-[-0.015em]">Import</h3><p className="mt-0.5 text-xs text-muted-foreground">Select, validate, preview, then confirm a bulk import.</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <SelectField label="Entity" value={entity} onChange={value => { setEntity(value as Entity); reset(); }} options={ENTITY_OPTIONS} />
            <Button variant="outline" onClick={downloadTemplate} className="w-full rounded-xl bg-white">
              <Database className="mr-2 h-3.5 w-3.5" />Download {entity} CSV template
            </Button>
            <div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" id="import-file" />
              <label htmlFor="import-file" className="flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#c3d0c8] bg-[#f7faf7] text-xs font-semibold text-[#47735f] hover:bg-[#eef4e9]">
                {fileName || "Choose a CSV file to import"}
              </label>
            </div>
          </div>
        </div>
      </div>

      {step === "preview" && (
        <div className="surface mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf3] px-5 py-4 sm:px-6">
            <div><h3 className="text-sm font-semibold">Preview · {rows.length} row{rows.length === 1 ? "" : "s"}</h3><p className="mt-1 text-[10px] text-muted-foreground">Review parsed rows before confirming the import.</p></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="rounded-xl bg-white">Cancel</Button>
              <Button size="sm" onClick={confirmImport} disabled={importRows.isPending} className="rounded-xl">
                {importRows.isPending ? "Importing…" : `Confirm import (${rows.length})`}
              </Button>
            </div>
          </div>

          {result && !result.ready && (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2 text-rose-800"><FileWarning className="h-4 w-4" /><p className="text-xs font-semibold">{result.errors.length} row{result.errors.length === 1 ? "" : "s"} failed validation — fix and re-upload</p></div>
              <ul className="mt-2 space-y-1 text-[11px] text-rose-700">
                {result.errors.slice(0, 20).map((issue, index) => <li key={index}>Row {issue.row}: {issue.message}</li>)}
              </ul>
            </div>
          )}
          {result?.ready && (
            <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-4 w-4" /><p className="text-xs font-semibold">Imported {result.imported} {entity}</p></div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e5eae5] bg-[#fafbf9]">
                  {columns.map(column => <th key={column} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, index) => (
                  <tr key={index} className="border-b border-[#e8edf3] last:border-0">
                    {columns.map(column => <td key={column} className="max-w-[220px] truncate px-4 py-2.5">{row[column] || "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && <p className="px-5 py-3 text-[10px] text-muted-foreground">Showing first 50 of {rows.length} rows.</p>}
          </div>
        </div>
      )}

      {templates.isLoading && <LoadingPanel rows={3} />}
      {templates.error && <ErrorPanel message={templates.error.message} onRetry={() => templates.refetch()} />}
    </div>
  );
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ""; });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"' && line[index + 1] === '"') { current += '"'; index++; }
      else if (char === '"') inQuotes = false;
      else current += char;
    } else if (char === '"') inQuotes = true;
    else if (char === ",") { values.push(current); current = ""; }
    else current += char;
  }
  values.push(current);
  return values.map(value => value.trim());
}
