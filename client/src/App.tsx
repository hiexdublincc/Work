import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./_core/hooks/useAuth";
import { ThemeProvider } from "./contexts/ThemeContext";
import Achievements from "./pages/Achievements";
import Activities from "./pages/Activities";
import CalendarPage from "./pages/Calendar";
import Companies from "./pages/Companies";
import Contacts from "./pages/Contacts";
import Home from "./pages/Home";
import Leads from "./pages/Leads";
import Opportunities from "./pages/Opportunities";
import SystemSettings from "./pages/SystemSettings";
import UserManagement from "./pages/UserManagement";
import WeeklyUpdates from "./pages/WeeklyUpdates";

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
        <Route path="/admin/users" component={AdminUsersRoute} />
        <Route path="/admin/settings" component={AdminSettingsRoute} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
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
