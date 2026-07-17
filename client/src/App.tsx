import { LoadingPanel } from "@/components/crm/CRMPrimitives";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./_core/hooks/useAuth";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Companies = lazy(() => import("./pages/Companies"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Leads = lazy(() => import("./pages/Leads"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const Activities = lazy(() => import("./pages/Activities"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const Achievements = lazy(() => import("./pages/Achievements"));
const WeeklyUpdates = lazy(() => import("./pages/WeeklyUpdates"));
const CompetitorIntelligence = lazy(() => import("./pages/CompetitorIntelligence"));
const Referrals = lazy(() => import("./pages/Referrals"));
const HotelKnowledge = lazy(() => import("./pages/HotelKnowledge"));
const Reports = lazy(() => import("./pages/Reports"));
const DataStudio = lazy(() => import("./pages/DataStudio"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== "admin") return <NotFound />;
  return <>{children}</>;
}

function AdminUsersRoute() {
  return <AdminOnly><UserManagement /></AdminOnly>;
}

function AdminSettingsRoute() {
  return <AdminOnly><SystemSettings /></AdminOnly>;
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingPanel rows={7} />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/companies" component={Companies} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/leads" component={Leads} />
          <Route path="/opportunities" component={Opportunities} />
          <Route path="/activities" component={Activities} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/weekly-updates" component={WeeklyUpdates} />
          <Route path="/competitor-intelligence" component={CompetitorIntelligence} />
          <Route path="/referrals" component={Referrals} />
          <Route path="/hotel-knowledge" component={HotelKnowledge} />
          <Route path="/reports" component={Reports} />
          <Route path="/data" component={DataStudio} />
          <Route path="/admin/users" component={AdminUsersRoute} />
          <Route path="/admin/settings" component={AdminSettingsRoute} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
