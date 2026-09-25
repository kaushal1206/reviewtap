import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNfcCards } from '../../hooks/useNfcCards';
import { BusinessService } from '../../services/business.service';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { NfcStatusBadge } from '../../components/nfc/NfcStatusBadge';
import { CreateNfcModal } from '../../components/nfc/CreateNfcModal';
import { AssignNfcModal } from '../../components/nfc/AssignNfcModal';
import { Business, NfcCard, NfcCardStatus } from '../../types';
import {
  Radio,
  Plus,
  Search,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  Power,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

export const NfcDashboardPage: React.FC = () => {
  const {
    cards,
    counts,
    pagination,
    isLoading,
    error,
    params,
    updateFilter,
    activate,
    deactivate,
    refresh,
  } = useNfcCards({ limit: 12 });

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignCardTarget, setAssignCardTarget] = useState<NfcCard | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    BusinessService.list({ limit: 100 })
      .then((data) => {
        if (data?.businesses) setBusinesses(data.businesses);
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter({ search: searchInput });
  };

  const handleQuickToggle = async (card: NfcCard) => {
    try {
      setActionLoadingId(card.id);
      if (card.status === 'ACTIVE') {
        await deactivate(card.id);
      } else {
        await activate(card.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusTabs: { label: string; value?: NfcCardStatus; count: number; icon: React.ReactNode }[] = [
    { label: 'All Cards', value: undefined, count: counts.total, icon: <Radio className="w-3.5 h-3.5" /> },
    { label: 'Active', value: 'ACTIVE', count: counts.active, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: 'Assigned', value: 'ASSIGNED', count: counts.assigned, icon: <Clock className="w-3.5 h-3.5 text-amber-400" /> },
    { label: 'Unassigned', value: 'UNASSIGNED', count: counts.unassigned, icon: <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> },
    { label: 'Inactive', value: 'INACTIVE', count: counts.inactive, icon: <Power className="w-3.5 h-3.5 text-rose-400" /> },
    { label: 'Retired', value: 'RETIRED', count: counts.retired, icon: <Archive className="w-3.5 h-3.5 text-zinc-400" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-indigo-400" />
                Physical Hardware Fleet
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-heading">
              NFC Cards & Product Lifecycle
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage smart physical cards, assign destinations, inspect tap telemetry, and export backup QR codes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Provision NFC Card
            </Button>
          </div>
        </div>

        {/* Stats KPIs Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Fleet</span>
              <Radio className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-white font-heading">{counts.total}</div>
            <div className="text-xs text-slate-500 mt-1">Cards registered</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active & Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 font-heading">{counts.active}</div>
            <div className="text-xs text-slate-500 mt-1">Redirecting to Google</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Ready to Activate</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 font-heading">{counts.assigned}</div>
            <div className="text-xs text-slate-500 mt-1">Assigned to a business</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Unassigned Inventory</span>
              <AlertCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-slate-300 font-heading">{counts.unassigned}</div>
            <div className="text-xs text-slate-500 mt-1">Available for linking</div>
          </div>
        </div>

        {/* Filters & Status Tabs */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActive = params.status === tab.value;
              return (
                <button
                  key={tab.label}
                  onClick={() => updateFilter({ status: tab.value })}
                  className={clsx(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
                      isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Business Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search public ID or label..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </form>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select
                  value={params.businessId || ''}
                  onChange={(e) => updateFilter({ businessId: e.target.value || undefined })}
                  className="w-full pl-8 pr-8 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Businesses</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Cards Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Radio className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
            <p className="text-sm">Loading NFC fleet...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-sm">{error}</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <Radio className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white font-heading">No NFC Cards Found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
              {params.search || params.status || params.businessId
                ? 'No cards matched your filter criteria. Try clearing filters.'
                : 'Get started by provisioning your first ReviewTap smart NFC card.'}
            </p>
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Provision First NFC Card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => {
              const isActionLoading = actionLoadingId === card.id;

              return (
                <div
                  key={card.id}
                  className="group relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 p-5 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-indigo-500/5"
                >
                  {/* Top card bar */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {card.publicId}
                        </span>
                        <h3 className="text-base font-semibold text-white mt-1.5 group-hover:text-indigo-300 transition-colors">
                          {card.label}
                        </h3>
                      </div>
                      <NfcStatusBadge status={card.status} />
                    </div>

                    {/* Hardware info & Target */}
                    <div className="space-y-2 py-3 border-y border-slate-800/60 my-3 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          Target Profile:
                        </span>
                        {card.business ? (
                          <Link
                            to={`/dashboard/businesses/${card.business.id}`}
                            className="font-medium text-white hover:text-indigo-400 flex items-center gap-1"
                          >
                            {card.business.name}
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </Link>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned (Inventory)</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Total Customer Taps:</span>
                        <span className="font-bold text-white text-sm">{card.totalTaps ?? 0}</span>
                      </div>

                      {card.batchNumber && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Batch:</span>
                          <span className="font-mono text-slate-300">{card.batchNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <Link
                      to={`/dashboard/nfc/${card.id}`}
                      className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs font-medium border border-slate-700/50 transition-colors"
                    >
                      Studio & Analytics
                    </Link>

                    {card.status !== 'RETIRED' && (
                      <>
                        <button
                          onClick={() => setAssignCardTarget(card)}
                          title="Assign or reassign business profile"
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition-colors text-xs"
                        >
                          <Building2 className="w-4 h-4" />
                        </button>

                        {card.businessId && (
                          <button
                            onClick={() => handleQuickToggle(card)}
                            disabled={isActionLoading}
                            title={card.status === 'ACTIVE' ? 'Pause / Deactivate' : 'Activate Live Redirection'}
                            className={clsx(
                              'p-2 rounded-xl border transition-colors text-xs',
                              card.status === 'ACTIVE'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            )}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-medium">{cards.length}</span> of{' '}
              <span className="text-white font-medium">{pagination.total}</span> cards
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => updateFilter({ page: pagination.page - 1 })}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <span className="px-2 font-medium text-white">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateFilter({ page: pagination.page + 1 })}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Provision Modal */}
      <CreateNfcModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          refresh();
        }}
        businesses={businesses}
      />

      {/* Assign Modal */}
      <AssignNfcModal
        card={assignCardTarget}
        isOpen={Boolean(assignCardTarget)}
        onClose={() => setAssignCardTarget(null)}
        onSuccess={() => {
          refresh();
        }}
        businesses={businesses}
      />
    </div>
  );
};
