import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSubscription } from '../../hooks/useSubscription';
import { BusinessService } from '../../services/business.service';
import { BillingService } from '../../services/billing.service';
import { Business, Plan, PaymentOrder, BillingInvoice } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
  Radio,
  BarChart3,
  ArrowRight,
  RotateCcw,
  Building2,
  Check,
  X,
  Zap,
  Info,
  Receipt,
  ShieldCheck,
  Lock,
  Download,
  FileText,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

export const SubscriptionPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  
  // Checkout & Plan Change States
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<PaymentOrder | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<string | null>(null);

  // Invoices & Billing History States
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState<boolean>(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<BillingInvoice | null>(null);

  // Feedback Notifications
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Initial Business List Fetch
  useEffect(() => {
    BusinessService.list({ limit: 50 })
      .then((res) => {
        if (res?.businesses && res.businesses.length > 0) {
          setBusinesses(res.businesses);
          setSelectedBusinessId(res.businesses[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const { details, plans, isLoading, error, refresh, cancel, reactivate } =
    useSubscription(selectedBusinessId || undefined);

  // Fetch Invoices when business selection changes
  const fetchInvoices = (businessId?: string) => {
    setIsLoadingInvoices(true);
    BillingService.listInvoices(businessId, 1, 20)
      .then((res) => {
        setInvoices(res.invoices || []);
      })
      .catch(() => {
        setInvoices([]);
      })
      .finally(() => {
        setIsLoadingInvoices(false);
      });
  };

  useEffect(() => {
    if (selectedBusinessId) {
      fetchInvoices(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  // Open Checkout Flow
  const handleInitiatePlanChange = async (plan: Plan) => {
    if (!selectedBusinessId) return;
    setCheckoutError(null);
    setCheckoutSuccessMessage(null);
    setSelectedPlanForCheckout(plan);

    // Free Tier ($0): can be switched directly via zero-dollar order
    if (plan.price === 0) {
      setCheckoutOrder(null);
      return;
    }

    try {
      setIsCreatingOrder(true);
      const res = await BillingService.createOrder(selectedBusinessId, plan.code);
      setCheckoutOrder(res.order);
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.error?.message || err?.message || 'Failed to initialize payment order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Confirm Free Tier Switch
  const handleConfirmFreeSwitch = async () => {
    if (!selectedBusinessId || !selectedPlanForCheckout) return;
    try {
      setIsCreatingOrder(true);
      await BillingService.createOrder(selectedBusinessId, selectedPlanForCheckout.code);
      setActionMessage(`Plan successfully switched to ${selectedPlanForCheckout.name}`);
      setSelectedPlanForCheckout(null);
      refresh();
      fetchInvoices(selectedBusinessId);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.error?.message || err?.message || 'Failed to switch plan');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Execute Simulated Payment & Authoritative Verification
  const handleExecutePayment = async () => {
    if (!checkoutOrder) return;
    try {
      setIsVerifyingPayment(true);
      setCheckoutError(null);

      const res = await BillingService.verifyPayment(
        checkoutOrder.orderReference,
        checkoutOrder.checkoutSignature,
        `pay_sim_${Date.now()}`
      );

      setCheckoutSuccessMessage(res.message);

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#10b981', '#3b82f6'],
        });
      } catch {
        // Confetti fallback
      }

      // Refresh subscription & invoices after 1.5 seconds and close modal
      setTimeout(() => {
        setSelectedPlanForCheckout(null);
        setCheckoutOrder(null);
        setCheckoutSuccessMessage(null);
        refresh();
        fetchInvoices(selectedBusinessId);
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 5000);
      }, 1800);
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.error?.message || err?.message || 'Payment verification failed');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Schedule cancellation at period end
  const handleCancel = async () => {
    if (
      confirm(
        'Are you sure you want to cancel your plan renewal? Your subscription and existing cards/QRs will remain fully active until the end of the current billing period.'
      )
    ) {
      try {
        const res = await cancel();
        setActionMessage(res?.message || 'Subscription renewal cancelled.');
        fetchInvoices(selectedBusinessId);
        setTimeout(() => setActionMessage(null), 4000);
      } catch (err: any) {
        alert(err?.message || 'Cancellation failed');
      }
    }
  };

  // Reactivate renewal
  const handleReactivate = async () => {
    try {
      const res = await reactivate();
      setActionMessage(res?.message || 'Subscription renewal reactivated.');
      fetchInvoices(selectedBusinessId);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Reactivation failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  const subscription = details?.subscription;
  const currentPlan = details?.plan;
  const usage = details?.usage;
  const limits = details?.limits;

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3 text-indigo-400" />
                SaaS Monetization, Payments & Invoices
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-heading">
              Subscription & Billing
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your ReviewTap subscription tier, inspect live hardware & scan quotas, and review immutable billing invoices.
            </p>
          </div>

          {/* Business Profile Selector */}
          {businesses.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action feedback toast */}
        {actionMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : subscription && currentPlan && usage && limits ? (
          <>
            {/* Current Plan & Billing Status Banner */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Plan</span>
                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        subscription.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      )}
                    >
                      {subscription.status}
                    </span>
                    {subscription.cancelAtPeriodEnd && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Cancels at period end
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-3 mt-2">
                    <h2 className="text-3xl font-bold text-white font-heading">{currentPlan.name}</h2>
                    <span className="text-lg font-mono text-indigo-400">
                      ${(currentPlan.price / 100).toFixed(2)}
                      <span className="text-xs text-slate-400 font-sans">/{currentPlan.billingInterval.toLowerCase()}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Billing Cycle: {new Date(subscription.currentPeriodStart).toLocaleDateString()} –{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                    {subscription.business && (
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        Target: {subscription.business.name}
                      </span>
                    )}
                  </p>
                </div>

                {/* Plan action buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  {subscription.cancelAtPeriodEnd ? (
                    <Button variant="primary" size="sm" onClick={handleReactivate} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                      Reactivate Renewal
                    </Button>
                  ) : currentPlan.price > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
                    >
                      Cancel Renewal
                    </Button>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refresh();
                      fetchInvoices(selectedBusinessId);
                    }}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            </div>

            {/* Real-time Usage Meters */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Plan Quotas & Usage</span>
                </h3>
                <span className="text-xs text-slate-500">Calculated directly from authoritative database events</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* QR Stands Quota */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      QR Stands
                    </span>
                    <span className="font-bold text-white font-mono">
                      {usage.activeQrSources} / {limits.maxQrSources}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      style={{
                        width: `${Math.min(100, (usage.activeQrSources / limits.maxQrSources) * 100)}%`,
                      }}
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        usage.activeQrSources >= limits.maxQrSources ? 'bg-rose-500' : 'bg-indigo-500'
                      )}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Available slots:</span>
                    <span className="text-slate-300 font-medium">{details.remaining.qrSources} remaining</span>
                  </p>
                </div>

                {/* NFC Cards Quota */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-400" />
                      Active NFC Cards
                    </span>
                    <span className="font-bold text-white font-mono">
                      {usage.activeNfcCards} / {limits.maxNfcCards}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      style={{
                        width: `${Math.min(100, (usage.activeNfcCards / limits.maxNfcCards) * 100)}%`,
                      }}
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        usage.activeNfcCards >= limits.maxNfcCards ? 'bg-rose-500' : 'bg-purple-500'
                      )}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Available slots:</span>
                    <span className="text-slate-300 font-medium">{details.remaining.nfcCards} remaining</span>
                  </p>
                </div>

                {/* Monthly Event Quota */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Monthly Scans & Taps
                    </span>
                    <span className="font-bold text-white font-mono">
                      {usage.monthlyTotalEvents.toLocaleString()} / {limits.maxMonthlyEvents.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      style={{
                        width: `${Math.min(100, (usage.monthlyTotalEvents / limits.maxMonthlyEvents) * 100)}%`,
                      }}
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        usage.monthlyTotalEvents >= limits.maxMonthlyEvents ? 'bg-rose-500' : 'bg-amber-400'
                      )}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Breakdown:</span>
                    <span className="text-slate-300">
                      {usage.monthlyQrScans} QR • {usage.monthlyNfcTaps} NFC
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Comparison & Upgrade Matrix */}
            <div className="mb-14">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white font-heading">Available Subscription Plans</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose the right tier for your locations. Upgrades apply immediately with authoritative billing. Downgrades safely preserve all existing cards.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => {
                  const isCurrent = currentPlan.code === plan.code;

                  return (
                    <div
                      key={plan.id}
                      className={clsx(
                        'relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 border',
                        isCurrent
                          ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500/50 shadow-xl shadow-indigo-950/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      )}
                    >
                      {plan.code === 'PRO' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-base font-bold text-white font-heading">{plan.name}</h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 min-h-[36px] mb-4">{plan.description}</p>

                        <div className="mb-6">
                          <span className="text-2xl font-bold text-white font-mono">
                            ${(plan.price / 100).toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 font-sans">
                            /{plan.billingInterval.toLowerCase()}
                          </span>
                        </div>

                        {/* Features list */}
                        <div className="space-y-2.5 text-xs text-slate-300 mb-6 border-t border-slate-800/80 pt-4">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Up to <strong>{plan.maxBusinesses}</strong> business profiles</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span><strong>{plan.maxQrSources}</strong> QR Stands</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span><strong>{plan.maxNfcCards}</strong> Physical NFC Cards</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span><strong>{plan.maxMonthlyEvents.toLocaleString()}</strong> Scans/month</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span><strong>{plan.analyticsRetentionDays}</strong>-day Analytics Retention</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.customBranding ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span className={plan.customBranding ? '' : 'text-slate-500'}>
                              Custom Landing Branding
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.exportAnalytics ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span className={plan.exportAnalytics ? '' : 'text-slate-500'}>
                              Analytics CSV Export
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <div className="w-full text-center py-2 px-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium cursor-default">
                            Current Plan
                          </div>
                        ) : (
                          <Button
                            variant={plan.code === 'PRO' ? 'primary' : 'outline'}
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleInitiatePlanChange(plan)}
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            {plan.price > currentPlan.price ? 'Upgrade' : 'Switch Plan'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Billing History & Immutable Invoices */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white font-heading flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-400" />
                    <span>Billing History & Invoices</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Immutable records of all subscription activations, payment orders, and charges.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800">
                {isLoadingInvoices ? (
                  <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <span>Loading billing history...</span>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No invoices on record</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Invoices will appear here automatically upon plan upgrades and renewals.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px]">
                          <th className="py-3.5 px-4 font-semibold">Date</th>
                          <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                          <th className="py-3.5 px-4 font-semibold">Plan Tier</th>
                          <th className="py-3.5 px-4 font-semibold">Amount</th>
                          <th className="py-3.5 px-4 font-semibold">Status</th>
                          <th className="py-3.5 px-4 font-semibold">Reference</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-slate-400">
                              {new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-200">
                              {inv.planName}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              ${(inv.amount / 100).toFixed(2)} {inv.currency}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={clsx(
                                  'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                )}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                              {inv.paymentOrder?.orderReference || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-indigo-400 hover:text-indigo-300"
                                onClick={() => setSelectedInvoiceForModal(inv)}
                                leftIcon={<FileText className="w-3.5 h-3.5" />}
                              >
                                Receipt
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Checkout & Payment Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    {selectedPlanForCheckout.price === 0 ? 'Confirm Plan Switch' : 'Complete Subscription Upgrade'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Authoritative Server Checkout</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPlanForCheckout(null);
                  setCheckoutOrder(null);
                  setCheckoutError(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {checkoutError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Success Banner */}
            {checkoutSuccessMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{checkoutSuccessMessage}</span>
              </div>
            )}

            {/* Order Loading State */}
            {isCreatingOrder ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs">Generating authoritative payment order...</p>
              </div>
            ) : selectedPlanForCheckout.price === 0 ? (
              /* Free Plan Downgrade Confirmation */
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{selectedPlanForCheckout.name}</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">$0.00 / month</span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedPlanForCheckout.description}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Downgrade Safety Guarantee:</strong> All existing NFC cards, QR codes, and review telemetry are never deleted or modified. Only the creation of new assets beyond the Free quota is restricted.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPlanForCheckout(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleConfirmFreeSwitch}>
                    Confirm Free Tier
                  </Button>
                </div>
              </div>
            ) : checkoutOrder ? (
              /* Paid Plan Checkout Flow */
              <div className="py-4 space-y-5">
                {/* Order Summary Box */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Selected Plan</span>
                    <span className="text-xs text-slate-400">Billing Interval</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold text-white font-heading">{checkoutOrder.planName}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Monthly Recurring
                    </span>
                  </div>

                  <div className="border-t border-slate-700/60 pt-3 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-300">Authoritative Total:</span>
                    <span className="text-xl font-bold font-mono text-white">
                      ${(checkoutOrder.amount / 100).toFixed(2)}{' '}
                      <span className="text-xs font-sans text-slate-400">{checkoutOrder.currency}</span>
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Order Ref: {checkoutOrder.orderReference}</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Lock className="w-2.5 h-2.5" /> 256-bit Encrypted
                    </span>
                  </div>
                </div>

                {/* Simulated Payment Card / One-Click Provider */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Simulated Payment Engine (Developer Mode)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                      Sandbox Ready
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">
                    Clicking below will simulate a secure payment gateway transaction, cryptographically verify the signature, and instantly provision your subscription.
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cryptographic signature verification enforced server-side.</span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full text-xs font-semibold justify-center"
                    isLoading={isVerifyingPayment}
                    onClick={handleExecutePayment}
                    leftIcon={<Lock className="w-3.5 h-3.5" />}
                  >
                    {isVerifyingPayment ? 'Verifying & Provisioning...' : `Pay $${(checkoutOrder.amount / 100).toFixed(2)} USD & Activate`}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Payment Receipt</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedInvoiceForModal.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="py-4 space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan Tier:</span>
                  <span className="font-bold text-white">{selectedInvoiceForModal.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Billing Period:</span>
                  <span>
                    {new Date(selectedInvoiceForModal.billingPeriodStart).toLocaleDateString()} –{' '}
                    {new Date(selectedInvoiceForModal.billingPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Date:</span>
                  <span>{new Date(selectedInvoiceForModal.paidAt || selectedInvoiceForModal.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Order Reference:</span>
                  <span className="font-mono text-slate-300">
                    {selectedInvoiceForModal.paymentOrder?.orderReference || 'N/A'}
                  </span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex justify-between items-baseline font-bold text-sm text-white">
                  <span>Amount Paid:</span>
                  <span className="font-mono text-emerald-400">
                    ${(selectedInvoiceForModal.amount / 100).toFixed(2)} {selectedInvoiceForModal.currency}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified by ReviewTap Authoritative Billing Engine</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Print / Save
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedInvoiceForModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
