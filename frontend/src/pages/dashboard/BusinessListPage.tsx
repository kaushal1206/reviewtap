import React, { useState } from 'react';
import { useBusinesses } from '../../hooks/useBusinesses';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { BusinessCard } from '../../components/business/BusinessCard';
import { CreateBusinessModal } from '../../components/business/CreateBusinessModal';
import { QRCodeViewer } from '../../components/qr/QRCodeViewer';
import { Business, BusinessStatus } from '../../types';
import {
  Plus,
  Search,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

export const BusinessListPage: React.FC = () => {
  const {
    businesses,
    counts,
    pagination,
    isLoading,
    error,
    params,
    updateFilter,
    updateStatus,
    refresh,
  } = useBusinesses({ limit: 12 });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQRBusiness, setSelectedQRBusiness] = useState<Business | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter({ search: searchInput });
  };

  const statusTabs: { label: string; value?: BusinessStatus; count: number }[] = [
    { label: 'All Businesses', value: undefined, count: counts.total },
    { label: 'Active', value: 'ACTIVE', count: counts.active },
    { label: 'Inactive', value: 'INACTIVE', count: counts.inactive },
    { label: 'Archived', value: 'ARCHIVED', count: counts.archived },
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
                <Store className="w-3 h-3 text-indigo-400" />
                Business Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Manage Businesses & Locations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure review links, manage status states, and view individual touchpoint performance.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Business
          </Button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {statusTabs.map((tab) => {
              const isSelected = params.status === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => updateFilter({ status: tab.value })}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2',
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={clsx(
                      'px-1.5 py-0.2 rounded-full text-[10px]',
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or category..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 mb-6">
            {error}
          </div>
        )}

        {/* Businesses Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : businesses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onSelectQR={(b) => setSelectedQRBusiness(b)}
                  onStatusChange={async (id, newStatus) => {
                    await updateStatus(id, newStatus);
                  }}
                  onBusinessUpdated={refresh}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 glass-panel rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                <span>
                  Showing {businesses.length} of {pagination.total} businesses
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => updateFilter({ page: pagination.page - 1 })}
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
                    onClick={() => updateFilter({ page: pagination.page + 1 })}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-4 glass-panel rounded-3xl border border-slate-800/80">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center mb-4 border border-indigo-500/20">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white font-heading">
              No businesses found
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              {params.search || params.status
                ? 'Try adjusting your search or status filter.'
                : 'Create your first business profile to get started.'}
            </p>
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add New Business
            </Button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <CreateBusinessModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => refresh()}
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
