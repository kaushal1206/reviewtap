import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { NfcService } from '../../services/nfc.service';
import { BusinessService } from '../../services/business.service';
import { NfcCard, Business } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { NfcStatusBadge } from '../../components/nfc/NfcStatusBadge';
import { AssignNfcModal } from '../../components/nfc/AssignNfcModal';
import {
  ArrowLeft,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Download,
  Building2,
  Calendar,
  Archive,
  Power,
  Edit3,
  QrCode,
  Sparkles,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';

export const NfcDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<NfcCard | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editLabel, setEditLabel] = useState<string>('');
  const [editUid, setEditUid] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadCard = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await NfcService.getById(id);
      if (data) {
        setCard(data);
        setEditLabel(data.label);
        setEditUid(data.nfcTagUid || '');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load NFC card');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCard();
    BusinessService.list({ limit: 100 })
      .then((res) => {
        if (res?.businesses) setBusinesses(res.businesses);
      })
      .catch(() => {});
  }, [loadCard]);

  const handleCopyUrl = () => {
    if (!card?.nfcUrl) return;
    navigator.clipboard.writeText(card.nfcUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!card) return;
    try {
      setActionLoading(true);
      const updated = await NfcService.activate(card.id);
      if (updated) setCard((prev) => (prev ? { ...prev, status: updated.status } : null));
    } catch (err: any) {
      alert(err.message || 'Activation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!card) return;
    try {
      setActionLoading(true);
      const updated = await NfcService.deactivate(card.id);
      if (updated) setCard((prev) => (prev ? { ...prev, status: updated.status } : null));
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetire = async () => {
    if (!card) return;
    if (
      confirm(
        `Are you sure you want to permanently retire card ${card.publicId}? Once retired, this hardware card can never be reactivated or reassigned.`
      )
    ) {
      try {
        setActionLoading(true);
        const updated = await NfcService.retire(card.id);
        if (updated) setCard((prev) => (prev ? { ...prev, status: updated.status } : null));
      } catch (err: any) {
        alert(err.message || 'Retire failed');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    try {
      setActionLoading(true);
      const updated = await NfcService.update(card.id, {
        label: editLabel.trim() || undefined,
        nfcTagUid: editUid.trim() || undefined,
      });
      if (updated) {
        setCard((prev) => (prev ? { ...prev, label: updated.label, nfcTagUid: updated.nfcTagUid } : null));
        setIsEditOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setActionLoading(false);
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

  if (error || !card) {
    return (
      <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 font-heading">NFC Card Not Found</h2>
            <p className="text-sm text-slate-400 mb-6">{error || 'The requested card does not exist.'}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard/nfc')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Fleet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const dailyAnalytics = card.analytics?.dailyTaps || [];
  const maxTapCount = Math.max(...dailyAnalytics.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Link to="/dashboard/nfc" className="hover:text-white flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            NFC Fleet
          </Link>
          <span>/</span>
          <span className="text-indigo-400 font-mono">{card.publicId}</span>
        </div>

        {/* Hero Card Overview */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md mb-8">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <Radio className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded border border-indigo-500/30">
                  {card.publicId}
                </span>
                <NfcStatusBadge status={card.status} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 font-heading">{card.label}</h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Created {new Date(card.createdAt).toLocaleDateString()}
                </span>
                {card.batchNumber && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Batch: {card.batchNumber}
                  </span>
                )}
                {card.nfcTagUid && (
                  <span className="flex items-center gap-1 font-mono text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    UID: {card.nfcTagUid}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Info
            </Button>

            {card.status !== 'RETIRED' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignOpen(true)}
                  leftIcon={<Building2 className="w-3.5 h-3.5" />}
                >
                  {card.business ? 'Reassign Business' : 'Assign Business'}
                </Button>

                {card.businessId && card.status !== 'ACTIVE' && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={actionLoading}
                    onClick={handleActivate}
                    leftIcon={<Power className="w-3.5 h-3.5" />}
                  >
                    Activate Card
                  </Button>
                )}

                {card.status === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={handleDeactivate}
                    leftIcon={<Power className="w-3.5 h-3.5 text-rose-400" />}
                    className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                  >
                    Deactivate
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleRetire}
                  leftIcon={<Archive className="w-3.5 h-3.5 text-zinc-400" />}
                  className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Retire
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Grid Layout: Card Visual Studio + Smart Redirect Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Physical Card Studio Preview Mockup */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 w-full flex items-center justify-between">
                <span>Card Hardware Mockup</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </h2>

              {/* Realistic Physical Card Mockup */}
              <div className="relative w-full aspect-[1.586/1] max-w-sm rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/30 shadow-2xl shadow-indigo-950/60 flex flex-col justify-between overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
                
                {/* Contactless symbol & ReviewTap brand */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                      <Radio className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-white font-heading">
                      Review<span className="text-indigo-400">Tap</span>
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-full border border-indigo-300/40 flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                  </div>
                </div>

                {/* Smart Chip graphic */}
                <div className="relative z-10 my-2">
                  <div className="w-11 h-8 rounded bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-300/60 shadow-inner flex items-center justify-center">
                    <div className="w-8 h-5 border border-amber-500/50 rounded-sm opacity-60" />
                  </div>
                </div>

                {/* Business name and public ID */}
                <div className="relative z-10">
                  <div className="text-xs font-semibold text-white tracking-wide truncate">
                    {card.business ? card.business.name : 'Unassigned Physical Card'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-indigo-200/80 mt-1">
                    <span>{card.publicId}</span>
                    <span className="text-[10px] tracking-widest uppercase opacity-75">NFC TAP</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                Programmed with NTAG213/215/216 chips for zero-app customer taps.
              </p>
            </div>

            {/* Backup QR Code Box */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  Backup QR Code
                </div>
                <span className="text-xs text-slate-500">Auto-generated</span>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Printed on the back of the physical NFC card for older smartphones without NFC sensors.
              </p>

              <div className="flex items-center justify-center p-4 bg-white rounded-xl shadow-inner mb-4">
                <img
                  src={NfcService.getQrCodeUrl(card.id, 'svg')}
                  alt={`QR code for ${card.publicId}`}
                  className="w-44 h-44 object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={NfcService.getQrCodeUrl(card.id, 'svg', true)}
                  download={`${card.publicId}-qr.svg`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs" leftIcon={<Download className="w-3.5 h-3.5" />}>
                    SVG (Print)
                  </Button>
                </a>
                <a
                  href={NfcService.getQrCodeUrl(card.id, 'png', true)}
                  download={`${card.publicId}-qr.png`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs" leftIcon={<Download className="w-3.5 h-3.5" />}>
                    PNG (HD)
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Smart Redirect Engine Details & Telemetry */}
          <div className="lg:col-span-2 space-y-6">
            {/* Smart Redirect Verification Section */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-semibold text-white font-heading">
                    NFC Smart Redirect Engine
                  </h2>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  HTTP 302 Instant Direct
                </span>
              </div>

              {/* Hardware Tap URL */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Physical Hardware Target URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={card.nfcUrl || ''}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                    leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <a href={card.nfcUrl} target="_blank" rel="noreferrer">
                    <Button variant="primary" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                      Test Tap
                    </Button>
                  </a>
                </div>
              </div>

              {/* Destination URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Assigned Google Review Destination
                </label>
                {card.business ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white">{card.business.name}</div>
                      <div className="text-xs text-slate-400 font-mono truncate">{card.business.googleReviewUrl}</div>
                    </div>
                    <Link
                      to={`/dashboard/businesses/${card.business.id}`}
                      className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      View Profile
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                    <span>Card is unassigned. Assign it to a business to activate automatic redirection.</span>
                    <Button variant="primary" size="sm" onClick={() => setIsAssignOpen(true)}>
                      Assign Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 14-Day Tap Activity Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-semibold text-white font-heading">
                    14-Day Customer Tap Activity
                  </h2>
                </div>
                <div className="text-xs text-slate-400">
                  Total Recorded Taps: <span className="text-white font-bold">{card.totalTaps ?? 0}</span>
                </div>
              </div>

              {/* Simple CSS Bar Graph */}
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
                {dailyAnalytics.map((point) => {
                  const heightPercent = maxTapCount > 0 ? (point.count / maxTapCount) * 100 : 0;
                  return (
                    <div key={point.date} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded shadow">
                        {point.count}
                      </div>
                      <div
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                        className={clsx(
                          'w-full max-w-[28px] rounded-t transition-all',
                          point.count > 0 ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-slate-800/40'
                        )}
                      />
                      <div className="text-[9px] text-slate-500 font-mono rotate-45 origin-left truncate max-w-[28px]">
                        {point.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Scan Events Table */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h2 className="text-base font-semibold text-white font-heading mb-4">
                Recent Tap Telemetry
              </h2>

              {!card.analytics?.recentEvents || card.analytics.recentEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No tap events recorded for this NFC card yet. Test tap above to verify tracking!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="pb-2">Time</th>
                        <th className="pb-2">Device</th>
                        <th className="pb-2">Operating System</th>
                        <th className="pb-2">Browser</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {card.analytics.recentEvents.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-mono text-slate-400">
                            {new Date(evt.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 capitalize">{evt.deviceType || 'Unknown'}</td>
                          <td className="py-2.5">{evt.os || 'Unknown'}</td>
                          <td className="py-2.5">{evt.browser || 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      <AssignNfcModal
        card={card}
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onSuccess={() => {
          loadCard();
        }}
        businesses={businesses}
      />

      {/* Edit Details Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white font-heading mb-4">Edit Card Info</h3>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Label
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Hardware UID (Optional)
                </label>
                <input
                  type="text"
                  value={editUid}
                  onChange={(e) => setEditUid(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
