import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { LandingPage } from "@/features/landing/landing-page";
import { LoginPage } from "@/features/auth/login-page";
import { AuthCallback } from "@/features/auth/auth-callback";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AgentsPage } from "@/features/agents/agents-page";
import { AgentDetailPage } from "@/features/agents/agent-detail-page";
import { CallsPage } from "@/features/calls/calls-page";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { BillingPage } from "@/features/billing/billing-page";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Voxa. Manage your AI voice agents.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Active Agents</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Calls</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Knowledge Docs</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization settings.</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Settings will be available once the backend is connected.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected dashboard routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/agents" element={<AgentsPage />} />
              <Route path="/dashboard/agents/:id" element={<AgentDetailPage />} />
              <Route path="/dashboard/calls" element={<CallsPage />} />
              <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard/billing" element={<BillingPage />} />
              <Route path="/dashboard/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
