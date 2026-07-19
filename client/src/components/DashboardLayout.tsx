import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GroupLogo } from "@/components/BrandIdentity";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ContactRound,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Share2,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const primaryItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Companies", path: "/companies" },
  { icon: ContactRound, label: "Contacts", path: "/contacts" },
  { icon: Target, label: "Leads", path: "/leads" },
  { icon: CircleDollarSign, label: "Pipeline", path: "/opportunities" },
  { icon: Activity, label: "Activities", path: "/activities" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
];

const insightItems = [
  { icon: Trophy, label: "Achievements", path: "/achievements" },
  { icon: Radar, label: "Competitor intelligence", path: "/competitor-intelligence" },
  { icon: Share2, label: "Referrals", path: "/referrals" },
  { icon: BookOpen, label: "Hotel knowledge", path: "/hotel-knowledge" },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: Database, label: "Data", path: "/data" },
];

const adminItems = [
  { icon: UsersRound, label: "User management", path: "/admin/users" },
  { icon: Settings, label: "System settings", path: "/admin/settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="auth-canvas min-h-screen p-6 lg:p-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-[0_32px_90px_rgba(22,31,27,0.16)] backdrop-blur-xl lg:min-h-[calc(100vh-5rem)]">
          <section className="relative hidden w-[54%] overflow-hidden bg-[#002460] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_15%_20%,rgba(108,204,216,.24),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(0,144,180,.24),transparent_42%)]" />
            <div className="relative flex items-center gap-4">
              <GroupLogo className="h-12 w-40 rounded-xl bg-white px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.14)]" />
              <div><p className="text-sm font-semibold tracking-[0.16em]">COMMERCIAL CRM</p><p className="text-xs text-white/58">Relationship intelligence</p></div>
            </div>
            <div className="relative max-w-xl">
              <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8ee3eb]"><Sparkles className="h-4 w-4" /> Your commercial workspace</p>
              <h1 className="font-display text-5xl leading-[1.08] tracking-[-0.035em]">Build stronger relationships. Move every opportunity forward.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/65">A focused CRM for JMK Group’s companies, contacts, sales pipeline, and client activity—designed to keep the team aligned.</p>
            </div>
            <p className="relative text-xs text-white/40">Private and secure · Authorised JMK Group users only</p>
          </section>
          <section className="flex flex-1 items-center justify-center p-8 sm:p-12">
            <div className="w-full max-w-md">
              <div className="mb-10 lg:hidden"><GroupLogo className="h-12 w-36 rounded-xl border border-border bg-white px-3 py-2 shadow-sm" /></div>
              <p className="eyebrow">JMK Group CRM</p>
              <h2 className="mt-3 font-display text-4xl tracking-[-0.03em] text-foreground">Welcome back</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Sign in with your authorised account to access your records, pipeline, and activities.</p>
              <Button onClick={() => startLogin()} size="lg" className="mt-9 h-12 w-full rounded-xl shadow-[0_12px_24px_rgba(0,36,96,0.18)]">Continue securely</Button>
              <p className="mt-6 text-center text-xs text-muted-foreground">Your access is governed by your assigned JMK Group role.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "270px" } as CSSProperties}>
      <CRMLayout>{children}</CRMLayout>
    </SidebarProvider>
  );
}

function CRMLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const allItems = [...primaryItems, ...insightItems, ...(user?.role === "admin" ? adminItems : [])];
  const active = [...allItems].sort((a, b) => b.path.length - a.path.length).find(item => item.path === "/" ? location === "/" : location.startsWith(item.path));

  const menu = (items: typeof primaryItems) => (
    <SidebarMenu className="gap-1 px-2">
      {items.map(item => {
        const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              isActive={isActive}
              onClick={() => setLocation(item.path)}
              tooltip={item.label}
              className="h-10 rounded-xl px-3 text-[13px] font-medium data-[active=true]:bg-white data-[active=true]:text-[#002460] data-[active=true]:[box-shadow:inset_3px_0_0_#6cccd8,0_7px_20px_rgba(0,36,96,0.08)]"
            >
              <item.icon className="h-[17px] w-[17px]" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-[#d9e3ed] bg-[#eef3f8]">
        <SidebarHeader className="px-4 pb-4 pt-5 group-data-[collapsible=icon]:px-1.5">
          <button onClick={() => setLocation("/")} className="flex items-center justify-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <GroupLogo className="h-10 w-40 rounded-xl border border-[#d7e1eb] bg-white px-2.5 py-1.5 shadow-[0_7px_18px_rgba(0,36,96,0.08)] group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-1" />
            <span className="sr-only">JMK Group dashboard</span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-1">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#77869a] group-data-[collapsible=icon]:hidden">Workspace</SidebarGroupLabel>
            {menu(primaryItems)}
          </SidebarGroup>
          <SidebarSeparator className="mx-4 my-3 w-auto bg-[#d9e3ed]" />
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#77869a] group-data-[collapsible=icon]:hidden">Insights</SidebarGroupLabel>
            {menu(insightItems)}
          </SidebarGroup>
          {user?.role === "admin" && <><SidebarSeparator className="mx-4 my-3 w-auto bg-[#d9e3ed]" /><SidebarGroup className="p-0"><SidebarGroupLabel className="px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#77869a] group-data-[collapsible=icon]:hidden">Administration</SidebarGroupLabel>{menu(adminItems)}</SidebarGroup></>}
        </SidebarContent>
        <SidebarFooter className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 border border-white bg-[#dff3f6]"><AvatarFallback className="bg-[#dff3f6] text-xs font-bold text-[#002460]">{initials(user?.name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-[#102b50]">{user?.name || "JMK user"}</p><p className="mt-0.5 truncate text-[10px] capitalize text-[#6c7c91]">{user?.role}</p></div>
                <ChevronDown className="h-3.5 w-3.5 text-[#738298] group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 rounded-xl p-1.5">
              <div className="px-2 py-2"><p className="truncate text-xs font-semibold">{user?.name}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{user?.email}</p></div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-[#f5f7fa]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dde5ee] bg-[#f5f7fa]/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="h-9 w-9 rounded-xl border border-[#d9e3ed] bg-white lg:hidden"><Menu className="h-4 w-4" /></SidebarTrigger>
            <div className="sm:hidden">
              <GroupLogo className="h-6 w-20 rounded-md bg-white px-1.5 py-0.5" />
              <h1 className="mt-0.5 max-w-20 truncate text-[10px] font-semibold text-foreground">{active?.label ?? "Workspace"}</h1>
            </div>
            <GroupLogo className="hidden h-7 w-24 rounded-md bg-white px-1.5 py-1 sm:inline-flex lg:hidden" />
            <div className="hidden sm:block"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">JMK Group CRM</p><h1 className="mt-0.5 text-sm font-semibold text-foreground">{active?.label ?? "Workspace"}</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" className="h-9 rounded-xl px-3 shadow-[0_8px_18px_rgba(0,36,96,0.16)]"><Plus className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Quick add</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5"><div className="px-2 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Create a record</p><p className="mt-1 text-[10px] text-muted-foreground">Start the most common sales actions.</p></div><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setLocation("/activities?create=1")} className="cursor-pointer rounded-lg"><Activity className="mr-2 h-4 w-4" />Log activity</DropdownMenuItem><DropdownMenuItem onClick={() => setLocation("/leads?create=1")} className="cursor-pointer rounded-lg"><Target className="mr-2 h-4 w-4" />Add enquiry</DropdownMenuItem><DropdownMenuItem onClick={() => setLocation("/opportunities?create=1")} className="cursor-pointer rounded-lg"><CircleDollarSign className="mr-2 h-4 w-4" />Add opportunity</DropdownMenuItem><DropdownMenuItem onClick={() => setLocation("/companies?create=1")} className="cursor-pointer rounded-lg"><Building2 className="mr-2 h-4 w-4" />Add company</DropdownMenuItem><DropdownMenuItem onClick={() => setLocation("/contacts?create=1")} className="cursor-pointer rounded-lg"><ContactRound className="mr-2 h-4 w-4" />Add contact</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setLocation("/achievements?create=1")} className="cursor-pointer rounded-lg"><Trophy className="mr-2 h-4 w-4" />Add achievement</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => document.dispatchEvent(new CustomEvent("jmk:search"))} className="hidden h-9 min-w-52 justify-between rounded-xl border-[#d9e3ed] bg-white px-3 text-muted-foreground shadow-none md:flex"><span className="flex items-center gap-2"><Search className="h-3.5 w-3.5" />Search this view</span><kbd className="rounded border bg-[#f1f5f9] px-1.5 py-0.5 text-[9px]">⌘ K</kbd></Button>
            {user?.role === "admin" && <Badge variant="outline" className="h-8 rounded-lg border-[#b9e3e8] bg-[#e8f7f9] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#005a73]"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Admin</Badge>}
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </SidebarInset>
    </>
  );
}

function initials(name?: string | null) {
  return (name || "JMK").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}
