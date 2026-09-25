import React, { useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useBusinesses } from '../../hooks/useBusinesses';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { ScanSourceType } from '../../types';
import {
  ListFilter,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  QrCode,
  Smartphone,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { clsx } from 'clsx';

export const EventExplorerPage: React.FC = () => {
  const { businesses } = useBusinesses({ limit: 100 });
  const { events, pagination, isLoading, error, params, updateFilter, setPage } = useEvents({ limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter({ search: searchInput });
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <ListFilter className="w-3 h-3 text-indigo-400" />
                Audit & Telemetry Logs
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Event Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search and inspect every QR scan and NFC tap event across your locations.
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Filters Group */}
          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            {/* Business Dropdown */}
            <select
              value={params.businessId || ''}
              onChange={(e) => updateFilter({ businessId: e.target.value || undefined })}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Source Type Filter */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {(['ALL', 'QR', 'NFC'] as (ScanSourceType | 'ALL')[]).map((src) => {
                const isSelected = (src === 'ALL' && !params.sourceType) || params.sourceType === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => updateFilter({ sourceType: src === 'ALL' ? undefined : (src as ScanSourceType) })}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search OS, browser, device..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 mb-6">
            {error}
          </div>
        )}

        {/* Events Table */}
        <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Business</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Device & OS</th>
                  <th className="py-3.5 px-4">Browser</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-4 bg-slate-900/30">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : events.length > 0 ? (
                  events.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {e.business?.name || 'Business'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          /r/{e.business?.slug}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
                            e.sourceType === 'NFC'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          )}
                        >
                          {e.sourceType === 'NFC' ? (
                            <Smartphone className="w-3 h-3 text-purple-400" />
                          ) : (
                            <QrCode className="w-3 h-3 text-indigo-400" />
                          )}
                          <span>{e.sourceType}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-slate-500" />
                          <span className="capitalize">{e.deviceType || 'Desktop'}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{e.os || 'Unknown OS'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {e.browser || 'Browser'}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(e.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <a
                          href={e.business?.googleReviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px]"
                        >
                          <span>Google Review</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No scan events matched your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-400">
              <span>
                Showing {events.length} of {pagination.total} events
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 bg-slate-900 rounded-lg text-slate-200 font-mono">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
