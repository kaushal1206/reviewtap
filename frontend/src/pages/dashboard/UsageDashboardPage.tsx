import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBusinesses } from '../../hooks/useBusinesses';
import { usageService, BusinessUsageDetails } from '../../services/usage.service';
import { Navbar } from '../../components/common/Navbar';
import { Gauge, Sparkles } from 'lucide-react';

export const UsageDashboardPage: React.FC = () => {
  const { businesses, isLoading: isBusinessesLoading } = useBusinesses({ limit: 100 });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [data, setData] = useState<BusinessUsageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const fetchUsage = async () => {
    if (!selectedBusinessId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await usageService.getUsage(selectedBusinessId);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      fetchUsage();
    }
  }, [selectedBusinessId]);

  const calculatePercentage = (current: number, max: number) => {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const getMeterColor = (pct: number) => {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-indigo-500';
  };

  const currentBusiness = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Gauge className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
                Resource Quotas & Capacity
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Real-time usage tracking, seat allocations, and hardware limits for {currentBusiness?.name}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {businesses.length > 1 && (
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade Plan
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        {isBusinessesLoading || loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Gauge className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No businesses found</h3>
            <p className="text-sm text-slate-400 mt-1">Please create a business profile before viewing usage.</p>
          </div>
        ) : !data ? null : (
          <div className="space-y-8">
            {/* Plan Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Plan</span>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                      {data.plan.name}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {data.subscription.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-2">
                    Current billing period:{' '}
                    <span className="font-mono text-white">
                      {new Date(data.subscription.currentPeriodStart).toLocaleDateString()}
                    </span>{' '}
                    to{' '}
                    <span className="font-mono text-white">
                      {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-extrabold text-white">
                    ${(data.plan.priceMonthly / 100).toFixed(2)}
                    <span className="text-xs font-normal text-slate-400"> / month</span>
                  </div>
                  <span className="text-xs text-slate-500">Auto-renews at end of billing cycle</span>
                </div>
              </div>
            </div>

            {/* Resource Quotas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Members */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">Team Member Seats</h2>
                    <p className="text-xs text-slate-400">Total operational staff and manager accounts</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {data.usage.totalCommittedSeats} / {data.limits.maxTeamMembers} seats
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getMeterColor(
                      calculatePercentage(data.usage.totalCommittedSeats, data.limits.maxTeamMembers)
                    )}`}
                    style={{
                      width: `${calculatePercentage(data.usage.totalCommittedSeats, data.limits.maxTeamMembers)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>
                    {data.usage.activeTeamMembers} Active • {data.usage.pendingInvitations} Pending Invite
                  </span>
                  <span className={data.remaining.teamMembers === 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                    {data.remaining.teamMembers} seats remaining
                  </span>
                </div>
              </div>

              {/* NFC Cards */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">NFC Hardware Cards</h2>
                    <p className="text-xs text-slate-400">Registered physical tap cards</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {data.usage.activeNfcCards} / {data.limits.maxNfcCards} cards
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getMeterColor(
                      calculatePercentage(data.usage.activeNfcCards, data.limits.maxNfcCards)
                    )}`}
                    style={{
                      width: `${calculatePercentage(data.usage.activeNfcCards, data.limits.maxNfcCards)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Active provisioned cards</span>
                  <span className={data.remaining.nfcCards === 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                    {data.remaining.nfcCards} available to link
                  </span>
                </div>
              </div>

              {/* QR Stands / Sources */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">QR Code Touchpoints</h2>
                    <p className="text-xs text-slate-400">Table stands, counter stickers & print collateral</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {data.usage.activeQrSources} / {data.limits.maxQrSources} stands
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getMeterColor(
                      calculatePercentage(data.usage.activeQrSources, data.limits.maxQrSources)
                    )}`}
                    style={{
                      width: `${calculatePercentage(data.usage.activeQrSources, data.limits.maxQrSources)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Configured QR placements</span>
                  <span className={data.remaining.qrSources === 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                    {data.remaining.qrSources} available
                  </span>
                </div>
              </div>

              {/* Monthly Scan Events */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">Monthly Scan Events</h2>
                    <p className="text-xs text-slate-400">Total review requests and customer interactions</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {data.usage.monthlyTotalEvents.toLocaleString()} / {data.limits.maxMonthlyEvents.toLocaleString()} scans
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getMeterColor(
                      calculatePercentage(data.usage.monthlyTotalEvents, data.limits.maxMonthlyEvents)
                    )}`}
                    style={{
                      width: `${calculatePercentage(data.usage.monthlyTotalEvents, data.limits.maxMonthlyEvents)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>{data.usage.monthlyRedirectEvents.toLocaleString()} redirects converted</span>
                  <span className={data.remaining.monthlyEvents === 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                    {data.remaining.monthlyEvents.toLocaleString()} scans remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Entitlements Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Plan Feature Entitlements</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs font-medium text-slate-400">Analytics Retention</div>
                  <div className="text-lg font-bold text-white mt-1">{data.limits.analyticsRetentionDays} Days</div>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs font-medium text-slate-400">Custom Branding</div>
                  <div className="text-lg font-bold mt-1">
                    {data.limits.customBranding ? (
                      <span className="text-emerald-400">Included</span>
                    ) : (
                      <span className="text-slate-500">Upgrade Required</span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs font-medium text-slate-400">Analytics CSV Export</div>
                  <div className="text-lg font-bold mt-1">
                    {data.limits.exportAnalytics ? (
                      <span className="text-emerald-400">Included</span>
                    ) : (
                      <span className="text-slate-500">Upgrade Required</span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs font-medium text-slate-400">Dedicated Support</div>
                  <div className="text-lg font-bold mt-1">
                    {data.limits.prioritySupport ? (
                      <span className="text-emerald-400">Priority Support</span>
                    ) : (
                      <span className="text-slate-500">Standard Community</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
