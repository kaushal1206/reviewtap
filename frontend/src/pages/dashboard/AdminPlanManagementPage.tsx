import React, { useState, useEffect } from 'react';
import { SubscriptionService } from '../../services/subscription.service';
import { Plan } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import {
  ShieldAlert,
  Edit3,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';

export const AdminPlanManagementPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [plansData, subsData] = await Promise.all([
        SubscriptionService.adminListPlans(),
        SubscriptionService.adminListSubscriptions({ limit: 50 }),
      ]);
      setPlans(plansData);
      if (subsData?.subscriptions) {
        setSubscriptions(subsData.subscriptions);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setIsSaving(true);
      await SubscriptionService.adminUpdatePlan(editingPlan.id, {
        name: editingPlan.name,
        description: editingPlan.description || undefined,
        price: Number(editingPlan.price),
        maxBusinesses: Number(editingPlan.maxBusinesses),
        maxQrSources: Number(editingPlan.maxQrSources),
        maxNfcCards: Number(editingPlan.maxNfcCards),
        maxMonthlyEvents: Number(editingPlan.maxMonthlyEvents),
        analyticsRetentionDays: Number(editingPlan.analyticsRetentionDays),
        customBranding: Boolean(editingPlan.customBranding),
        exportAnalytics: Boolean(editingPlan.exportAnalytics),
        prioritySupport: Boolean(editingPlan.prioritySupport),
        isActive: Boolean(editingPlan.isActive),
      });

      setEditingPlan(null);
      await loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-purple-400" />
                Super Admin Console
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-heading">
              SaaS Plan & Subscription Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure system-wide subscription pricing, hardware quotas, scan limits, and inspect global tenant subscriptions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadAdminData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-6 text-xs">
          <button
            onClick={() => setActiveTab('plans')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-colors',
              activeTab === 'plans'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            )}
          >
            System Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl font-medium transition-colors',
              activeTab === 'subscriptions'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            )}
          >
            Global Subscriptions ({subscriptions.length})
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-xs">Loading admin data...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : activeTab === 'plans' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div key={p.id} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {p.code}
                    </span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        p.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      )}
                    >
                      {p.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white font-heading mt-2">{p.name}</h3>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ${(p.price / 100).toFixed(2)}
                    <span className="text-xs text-slate-400 font-sans">/{p.billingInterval.toLowerCase()}</span>
                  </div>

                  {/* Limits summary */}
                  <div className="space-y-1.5 my-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Businesses:</span>
                      <span>{p.maxBusinesses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max QR Stands:</span>
                      <span>{p.maxQrSources}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max NFC Cards:</span>
                      <span>{p.maxNfcCards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly Scans:</span>
                      <span>{p.maxMonthlyEvents.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Retention:</span>
                      <span>{p.analyticsRetentionDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Branding:</span>
                      <span>{p.customBranding ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPlan(p)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  className="w-full text-xs"
                >
                  Edit Configuration
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-slate-900/60 border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Current Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Period End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-medium text-white">{sub.business?.name}</td>
                    <td className="py-3 px-4 text-slate-400">{sub.business?.owner?.email}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">{sub.plan?.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white font-heading mb-4">
              Edit Plan Limits: {editingPlan.code}
            </h3>

            <form onSubmit={handleUpdatePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Price in Cents (e.g. 1900 = $19)</label>
                  <input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Max Businesses</label>
                  <input
                    type="number"
                    value={editingPlan.maxBusinesses}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxBusinesses: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max QR Stands</label>
                  <input
                    type="number"
                    value={editingPlan.maxQrSources}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxQrSources: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Max NFC Cards</label>
                  <input
                    type="number"
                    value={editingPlan.maxNfcCards}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxNfcCards: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Monthly Scan/Tap Events</label>
                  <input
                    type="number"
                    value={editingPlan.maxMonthlyEvents}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxMonthlyEvents: parseInt(e.target.value, 10) || 100 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="customBranding"
                    checked={editingPlan.customBranding}
                    onChange={(e) => setEditingPlan({ ...editingPlan, customBranding: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600"
                  />
                  <label htmlFor="customBranding" className="text-slate-300">Custom Branding</label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingPlan.isActive}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600"
                  />
                  <label htmlFor="isActive" className="text-slate-300">Plan Active for Signups</label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setEditingPlan(null)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
                  Save Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
