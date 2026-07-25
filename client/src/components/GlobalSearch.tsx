import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, Building2, CircleDollarSign, ContactRound, Database, LayoutDashboard, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const actions = [
  { label: "Log activity", icon: Activity, path: "/activities?create=1" },
  { label: "Add enquiry", icon: Target, path: "/leads?create=1" },
  { label: "Add opportunity", icon: CircleDollarSign, path: "/opportunities?create=1" },
  { label: "Add company", icon: Building2, path: "/companies?create=1" },
  { label: "Add contact", icon: ContactRound, path: "/contacts?create=1" },
  { label: "Add achievement", icon: Trophy, path: "/achievements?create=1" },
  { label: "Go to Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Go to Reports", icon: BarChart3, path: "/reports" },
  { label: "Go to Data Studio", icon: Database, path: "/data" },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const openPalette = () => setOpen(true);
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
    };
    document.addEventListener("jmk:global-search", openPalette);
    window.addEventListener("keydown", shortcut);
    return () => { document.removeEventListener("jmk:global-search", openPalette); window.removeEventListener("keydown", shortcut); };
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = trpc.metadata.globalSearch.useQuery({ query }, { enabled: open && query.trim().length >= 2 });

  function go(path: string, id: number) {
    setOpen(false);
    setLocation(`${path}?open=${id}`);
  }

  function act(path: string) {
    setOpen(false);
    setLocation(path);
  }

  const data = results.data;
  const hasResults = Boolean(data && (data.companies.length || data.contacts.length || data.leads.length || data.opportunities.length));
  const filteredActions = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? actions.filter(action => action.label.toLowerCase().includes(term)) : actions;
  }, [query]);
  const showingRecords = query.trim().length >= 2;
  const searching = showingRecords && results.isFetching && !data;
  const nothingToShow = filteredActions.length === 0 && (!showingRecords || (!searching && !hasResults));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeader className="sr-only"><DialogTitle>Search everything</DialogTitle><DialogDescription>Find a company, contact, lead, or opportunity from anywhere, or run a quick action.</DialogDescription></DialogHeader>
      <DialogContent className="overflow-hidden p-0">
      <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
      <CommandInput placeholder="Search everything, or run a quick action…" value={query} onValueChange={setQuery} />
      <CommandList>
        {nothingToShow && <CommandEmpty>No matches for "{query}".</CommandEmpty>}
        {filteredActions.length > 0 && (
          <CommandGroup heading="Quick actions">
            {filteredActions.map(action => (
              <CommandItem key={action.label} onSelect={() => act(action.path)}>
                <action.icon />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {showingRecords && searching && <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</div>}
        {showingRecords && hasResults && (
          <>
            {data!.companies.length > 0 && (
              <CommandGroup heading="Companies">
                {data!.companies.map(item => (
                  <CommandItem key={`company-${item.id}`} onSelect={() => go("/companies", item.id)}>
                    <Building2 />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {data!.contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {data!.contacts.map(item => (
                  <CommandItem key={`contact-${item.id}`} onSelect={() => go("/contacts", item.id)}>
                    <ContactRound />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {data!.leads.length > 0 && (
              <CommandGroup heading="Leads">
                {data!.leads.map(item => (
                  <CommandItem key={`lead-${item.id}`} onSelect={() => go("/leads", item.id)}>
                    <Target />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {data!.opportunities.length > 0 && (
              <CommandGroup heading="Pipeline">
                {data!.opportunities.map(item => (
                  <CommandItem key={`opportunity-${item.id}`} onSelect={() => go("/opportunities", item.id)}>
                    <CircleDollarSign />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
      </Command>
      </DialogContent>
    </Dialog>
  );
}
