import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { BusinessListPage } from './pages/dashboard/BusinessListPage';
import { BusinessDetailPage } from './pages/dashboard/BusinessDetailPage';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage';
import { EventExplorerPage } from './pages/dashboard/EventExplorerPage';
import { NfcDashboardPage } from './pages/dashboard/NfcDashboardPage';
import { NfcDetailPage } from './pages/dashboard/NfcDetailPage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { AdminPlanManagementPage } from './pages/dashboard/AdminPlanManagementPage';
import { PublicReviewPage } from './pages/public/PublicReviewPage';

// Phase 6 Pages
import { AcceptInvitationPage } from './pages/public/AcceptInvitationPage';
import { TeamManagementPage } from './pages/dashboard/TeamManagementPage';
import { NotificationsPage } from './pages/dashboard/NotificationsPage';
import { ActivityTimelinePage } from './pages/dashboard/ActivityTimelinePage';
import { BusinessInsightsPage } from './pages/dashboard/BusinessInsightsPage';
import { UsageDashboardPage } from './pages/dashboard/UsageDashboardPage';
import { AdminOverviewPage } from './pages/dashboard/AdminOverviewPage';

import { Footer } from './components/common/Footer';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
    </div>
  );
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          {/* Invitation Acceptance Flow */}
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />

          {/* Protected Dashboard & Management Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/businesses"
            element={
              <ProtectedRoute>
                <BusinessListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/businesses/:id"
            element={
              <ProtectedRoute>
                <BusinessDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/nfc"
            element={
              <ProtectedRoute>
                <NfcDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/nfc/:id"
            element={
              <ProtectedRoute>
                <NfcDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/events"
            element={
              <ProtectedRoute>
                <EventExplorerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/billing"
            element={<Navigate to="/dashboard/subscription" replace />}
          />

          {/* Phase 6 Routes */}
          <Route
            path="/dashboard/team"
            element={
              <ProtectedRoute>
                <TeamManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/activity"
            element={
              <ProtectedRoute>
                <ActivityTimelinePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/insights"
            element={
              <ProtectedRoute>
                <BusinessInsightsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/usage"
            element={
              <ProtectedRoute>
                <UsageDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/overview"
            element={
              <ProtectedRoute>
                <AdminOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/plans"
            element={
              <ProtectedRoute>
                <AdminPlanManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Public Customer Review Fallback Page */}
          <Route path="/review/:slug" element={<PublicReviewPage />} />

          {/* Default Navigation Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
