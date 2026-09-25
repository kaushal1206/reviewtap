import React, { useState, useEffect } from 'react';
import { ActivityService } from '../../services/activity.service';
import { useBusinesses } from '../../hooks/useBusinesses';
import { Navbar } from '../../components/common/Navbar';
import { ActivityLog, PaginationMeta } from '../../types';
import {
  Activity,
  User,
  Radio,
  QrCode,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react';

export const ActivityTimelinePage: React.FC = () => {
  const { businesses, isLoading: isBusinessesLoading } = useBusinesses({ limit: 100 });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const loadActivities = async (page = 1) => {
    if (!selectedBusinessId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await ActivityService.getTimeline(selectedBusinessId, {
        page,
        limit: 20,
      });
      if (res) {
        setLogs(res.activities || []);
        setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      loadActivities(1);
    }
  }, [selectedBusinessId]);

  const getActionIcon = (action: string) => {
    if (action.includes('NFC')) return <Radio className="w-4 h-4 text-cyan-400" />;
    if (action.includes('QR')) return <QrCode className="w-4 h-4 text-indigo-400" />;
    if (action.includes('SUBSCRIPTION') || action.includes('PLAN')) return <CreditCard className="w-4 h-4 text-purple-400" />;
    if (action.includes('USER') || action.includes('INVITATION') || action.includes('MEMBER')) return <User className="w-4 h-4 text-emerald-400" />;
    return <Building2 className="w-4 h-4 text-slate-400" />;
  };

  const currentBusiness = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">Activity Timeline</h1>
            </div>
            <p className="text-sm text-slate-400">
              Audit trail of operational events, hardware updates, invitations and plan changes for {currentBusiness?.name}.
            </p>
          </div>

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
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        {isBusinessesLoading || isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No activity logged yet</h3>
            <p className="text-sm text-slate-400 mt-1">Actions taken within this business will be recorded here.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="relative pl-6 border-l border-slate-800 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-indigo-500 group-hover:scale-125 transition-transform flex items-center justify-center" />

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 transition hover:border-slate-700">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-slate-900 border border-slate-800">
                          {getActionIcon(log.action)}
                        </span>
                        <span className="font-semibold text-white text-sm">{log.action}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                      <span>Triggered by:</span>
                      <span className="font-medium text-slate-300">
                        {log.user ? `${log.user.fullName} (${log.user.email})` : 'System Event'}
                      </span>
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] font-mono text-slate-400">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800 text-xs text-slate-400">
                <span>
                  Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total events)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => loadActivities(pagination.page - 1)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => loadActivities(pagination.page + 1)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
