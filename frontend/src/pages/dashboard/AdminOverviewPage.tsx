import React, { useState, useEffect } from 'react';
import { AdminService, AdminBusinessSearchItem } from '../../services/admin.service';
import { PlatformOverview, PaginationMeta } from '../../types';
import { Navbar } from '../../components/common/Navbar';

export const AdminOverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusinessSearchItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminService.getOverview();
      if (res) {
        setOverview(res);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load admin overview');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async (page = 1) => {
    try {
      setTableLoading(true);
      const res = await AdminService.searchBusinesses({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      if (res) {
        setBusinesses(res.businesses || []);
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err: any) {
      console.error('Failed to search businesses:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchBusinesses(1);
  }, [search, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <p className="font-medium">Error loading platform administration: {error || 'Data unavailable'}</p>
            <button
              onClick={fetchOverview}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm transition font-medium"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { overview: stats, recentActivity } = overview;

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin Platform Operations</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              SYSTEM CONTROL
            </span>
          </div>
          <p className="text-slate-400 mt-1">
            Platform-wide subscriber analytics, hardware fleet utilization, and global business directory.
          </p>
        </div>

        {/* High Level KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Businesses</span>
            <p className="text-3xl font-extrabold text-white mt-2">{stats.businesses.total}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{stats.businesses.active} active</span>
              <span>•</span>
              <span className="text-slate-500">{stats.businesses.inactive} inactive</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Revenue Run-rate</span>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">${(stats.subscriptions.mrr / 100).toFixed(0)} MRR</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span>${(stats.subscriptions.arr / 100).toFixed(0)} ARR</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">{stats.subscriptions.totalActive} active subscriptions</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Global Scans & Taps</span>
            <p className="text-3xl font-extrabold text-indigo-400 mt-2">{stats.telemetry.totalScans.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="text-cyan-400">{stats.telemetry.nfcTaps.toLocaleString()} NFC ({stats.telemetry.nfcPercentage}%)</span>
              <span>•</span>
              <span>{stats.telemetry.qrScans.toLocaleString()} QR</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NFC Fleet Utilization</span>
            <p className="text-3xl font-extrabold text-purple-400 mt-2">{stats.nfcInventory.utilizationPercent}%</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span>{stats.nfcInventory.active} deployed</span>
              <span>•</span>
              <span>{stats.nfcInventory.unassigned} unassigned</span>
            </div>
          </div>
        </div>

        {/* Global Business Directory Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Platform Businesses</h2>
              <p className="text-xs text-slate-400">Search and monitor tenant organizations across the platform.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Search by business name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Scans</th>
                  <th className="px-4 py-3">NFC Cards</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tableLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Loading businesses...
                    </td>
                  </tr>
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No businesses matched your search filters.
                    </td>
                  </tr>
                ) : (
                  businesses.map((biz) => (
                    <tr key={biz.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-medium text-white">
                        <div>{biz.name}</div>
                        <div className="text-xs font-mono text-slate-500">/{biz.slug}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="text-white font-medium">{biz.owner.fullName}</div>
                        <div className="text-slate-500 font-mono">{biz.owner.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-indigo-300">{biz.plan}</span>
                        <div className="text-slate-500">{biz.subscriptionStatus}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-white text-xs">{biz.totalScans.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-mono text-white text-xs">{biz.totalNfcCards}</td>
                      <td className="px-4 py-3.5 font-mono text-white text-xs">{biz.totalTeamMembers}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                            biz.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {biz.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
              <span>
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchBusinesses(pagination.page - 1)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchBusinesses(pagination.page + 1)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Platform Recent Audit Trail */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Platform Audit Activity Feed</h2>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No recent activity logged across tenants.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentActivity.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{log.action}</span>
                    <span className="text-slate-400 ml-2">by {log.user?.fullName || 'System Event'}</span>
                    {log.entityType && (
                      <span className="text-slate-500 ml-1">({log.entityType})</span>
                    )}
                  </div>
                  <div className="text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
