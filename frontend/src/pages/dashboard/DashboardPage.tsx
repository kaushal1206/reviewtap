import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useBusinesses } from '../../hooks/useBusinesses';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { BusinessCard } from '../../components/business/BusinessCard';
import { CreateBusinessModal } from '../../components/business/CreateBusinessModal';
import { QRCodeViewer } from '../../components/qr/QRCodeViewer';
import { Business } from '../../types';
import {
  Plus,
  Building2,
  QrCode,
  Smartphone,
  BarChart3,
  ArrowRight,
  Store,
  Sparkles,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { overview } = useAnalytics();
  const { businesses, isLoading: isBusinessesLoading, refresh: refreshBusinesses } = useBusinesses({ limit: 6 });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQRBusiness, setSelectedQRBusiness] = useState<Business | null>(null);

  const kpis = overview?.kpis || {
    totalEvents: 0,
    qrEvents: 0,
    nfcEvents: 0,
    todayEvents: 0,
    last7DaysEvents: 0,
    last30DaysEvents: 0,
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
  };

  const distribution = overview?.distribution || {
    qr: 0,
    nfc: 0,
    total: 0,
    qrPercentage: 0,
    nfcPercentage: 0,
  };

  const trends = overview?.trends || [];
  const maxTrendTotal = Math.max(1, ...trends.map((t) => t.total));

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Hero Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-slate-800/80 shadow-2xl mb-8 overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  Phase 2 Management & Analytics
                </span>
                <span className="text-xs text-slate-400">
                  Welcome back, <strong className="text-white">{user?.fullName}</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
                Review Collection Overview
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Track NFC card taps and QR scans in real time, manage locations, and convert visitors into 5-star Google Reviews.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/dashboard/businesses">
                <Button variant="secondary" size="md" icon={<Store className="w-4 h-4" />}>
                  All Businesses
                </Button>
              </Link>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Business
              </Button>
            </div>
          </div>
        </div>

        {/* 6 Metric KPI Cards (Section 9) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Total Businesses
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.totalBusinesses}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-400" />
              <span>Locations</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Active Locations
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-heading">
              {kpis.activeBusinesses}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Redirecting</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Inactive / Paused
            </span>
            <div className="text-2xl font-extrabold text-amber-400 font-heading">
              {kpis.inactiveBusinesses}
            </div>
            <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <span>Paused</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              QR Code Scans
            </span>
            <div className="text-2xl font-extrabold text-indigo-400 font-heading">
              {kpis.qrEvents}
            </div>
            <div className="text-[11px] text-indigo-300 mt-1 flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              <span>{distribution.qrPercentage}% of total</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              NFC Card Taps
            </span>
            <div className="text-2xl font-extrabold text-purple-400 font-heading">
              {kpis.nfcEvents}
            </div>
            <div className="text-[11px] text-purple-300 mt-1 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>{distribution.nfcPercentage}% of total</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Total Redirects
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.totalEvents}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-indigo-400" />
              <span>Events logged</span>
            </div>
          </div>
        </div>

        {/* Trends and Breakdown Visual Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Daily Scan Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  14-Day Activity Trends
                </h3>
                <p className="text-xs text-slate-400">
                  Daily review scans and NFC taps.
                </p>
              </div>

              <Link
                to="/dashboard/analytics"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>Full Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Sparkline / Bar Chart */}
            <div className="h-48 flex items-end justify-between gap-1.5 pt-6 pb-2 border-b border-slate-800">
              {trends.map((point) => {
                const totalHeight = Math.max(6, Math.round((point.total / maxTrendTotal) * 100));
                return (
                  <div key={point.date} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                    <div
                      className="w-full max-w-[24px] rounded-t-md bg-gradient-to-t from-indigo-700 to-indigo-500 group-hover:brightness-125 transition-all"
                      style={{ height: `${totalHeight}%` }}
                    />
                    <span className="text-[9px] text-slate-500 font-mono">
                      {point.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source Distribution Card (1 Col) */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-heading mb-1">
                Traffic Distribution
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                QR Scans vs NFC Taps ratio.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-indigo-300 font-medium flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code Scans</span>
                    </span>
                    <span className="font-bold text-white">{distribution.qr}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${distribution.qrPercentage}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-300 font-medium flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>NFC Card Taps</span>
                    </span>
                    <span className="font-bold text-white">{distribution.nfc}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${distribution.nfcPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total interactions</span>
              <span className="font-bold text-white">{distribution.total}</span>
            </div>
          </div>
        </div>

        {/* Businesses Showcase */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                Your Locations & Stands
              </h3>
              <p className="text-xs text-slate-400">
                Manage profiles, adjust statuses, and open QR studios.
              </p>
            </div>

            <Link
              to="/dashboard/businesses"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All ({businesses.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isBusinessesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : businesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.slice(0, 6).map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onSelectQR={(b) => setSelectedQRBusiness(b)}
                  onBusinessUpdated={refreshBusinesses}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass-panel rounded-3xl border border-slate-800/80">
              <Store className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No businesses yet</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">Create your first business profile to begin collecting reviews.</p>
              <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                Add Business
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      <CreateBusinessModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => refreshBusinesses()}
      />

      {/* QR Studio Modal */}
      {selectedQRBusiness && (
        <Modal
          isOpen={!!selectedQRBusiness}
          onClose={() => setSelectedQRBusiness(null)}
          title={`${selectedQRBusiness.name} — QR & NFC Studio`}
          subtitle="Generate, preview, customize and download print assets."
          maxWidth="lg"
        >
          <QRCodeViewer business={selectedQRBusiness} />
        </Modal>
      )}
    </div>
  );
};
