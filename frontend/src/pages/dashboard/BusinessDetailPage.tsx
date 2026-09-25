import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BusinessService } from '../../services/business.service';
import { EventService } from '../../services/event.service';
import { Business, BusinessStatus, EventLog } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/business/StatusBadge';
import { EditBusinessModal } from '../../components/business/EditBusinessModal';
import { QRCodeViewer } from '../../components/qr/QRCodeViewer';
import { NfcService } from '../../services/nfc.service';
import { NfcCard } from '../../types';
import { NfcStatusBadge } from '../../components/nfc/NfcStatusBadge';
import { CreateNfcModal } from '../../components/nfc/CreateNfcModal';
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  MapPin,
  Phone,
  Globe,
  MessageSquare,
  Instagram,
  QrCode,
  BarChart3,
  Calendar,
  Clock,
  Trash2,
  Radio,
  Plus,
} from 'lucide-react';

export const BusinessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [recentEvents, setRecentEvents] = useState<EventLog[]>([]);
  const [nfcCards, setNfcCards] = useState<NfcCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isNfcModalOpen, setIsNfcModalOpen] = useState<boolean>(false);

  const loadDetails = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await BusinessService.getById(id);
      if (data) {
        setBusiness(data);
        // Load recent scan events for this business
        const [eventsRes, nfcRes] = await Promise.all([
          EventService.list({ businessId: id, limit: 10 }),
          NfcService.list({ businessId: id, limit: 50 }),
        ]);

        if (eventsRes) {
          setRecentEvents(eventsRes.events);
        }
        if (nfcRes) {
          setNfcCards(nfcRes.cards);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load business');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleStatusChange = async (newStatus: BusinessStatus) => {
    if (!business) return;
    try {
      const updated = await BusinessService.updateStatus(business.id, newStatus);
      if (updated) {
        setBusiness((prev) => (prev ? { ...prev, status: updated.status, isActive: updated.isActive } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Status change failed');
    }
  };

  const handleArchive = async () => {
    if (!business) return;
    if (confirm('Are you sure you want to archive this business? Its redirect link will be deactivated.')) {
      try {
        await BusinessService.delete(business.id);
        navigate('/dashboard/businesses');
      } catch (err: any) {
        alert(err.message || 'Archive failed');
      }
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

  if (error || !business) {
    return (
      <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="glass-panel p-8 rounded-3xl max-w-md text-center border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-2">Business Not Found</h2>
            <p className="text-sm text-slate-400 mb-6">{error || 'This business could not be located.'}</p>
            <Link to="/dashboard/businesses">
              <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Businesses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/dashboard/businesses"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Businesses</span>
          </Link>
        </div>

        {/* Business Hero Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold font-heading shadow-xl shadow-indigo-600/25 shrink-0">
                {business.name.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <StatusBadge
                    status={business.status}
                    editable={true}
                    onStatusChange={handleStatusChange}
                  />
                  {business.category && (
                    <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-lg">
                      {business.category}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {business.id.slice(0, 8)}...
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                  {business.name}
                </h1>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Created on {new Date(business.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                icon={<Edit3 className="w-4 h-4" />}
              >
                Edit Profile
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchive}
                icon={<Trash2 className="w-4 h-4 text-rose-400" />}
                className="text-rose-400 hover:bg-rose-500/10"
              >
                Archive
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid: Left 2 Cols (Details & Scans), Right 1 Col (QR Code & NFC) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact & Destination Info Card */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-base font-bold text-white font-heading">
                Contact & Destination Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                    Store / Office Address
                  </span>
                  <div className="flex items-center gap-2 text-slate-200">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{business.address || 'Not specified'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                    Phone Number
                  </span>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{business.phone || 'Not specified'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                    Website URL
                  </span>
                  <div className="flex items-center gap-2 text-slate-200 truncate">
                    <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                    {business.website ? (
                      <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate">
                        {business.website}
                      </a>
                    ) : (
                      'Not specified'
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                    Social & Messaging
                  </span>
                  <div className="flex items-center gap-4 text-slate-200">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      {business.whatsapp || '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Instagram className="w-3.5 h-3.5 text-pink-400" />
                      {business.instagram || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Google Review URL */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                  Google Review Destination URL
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-indigo-300 truncate">
                    {business.googleReviewUrl}
                  </span>
                  <a
                    href={business.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                    title="Open destination in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Recent Scan Events Table */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    Recent Review Scans
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live telemetry feed for this location.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    {business.totalScans ?? 0} Total
                  </span>
                </div>
              </div>

              {recentEvents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Source</th>
                        <th className="py-2.5 px-3">Device & OS</th>
                        <th className="py-2.5 px-3">Browser</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recentEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                event.sourceType === 'NFC'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              }`}
                            >
                              {event.sourceType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-200">
                            {event.deviceType || 'Desktop'} • {event.os || 'Unknown'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {event.browser || 'Browser'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No review scans recorded yet. Scan the QR code or tap the NFC tag to see events appear live!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: QR & NFC Studio */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <h3 className="text-base font-bold text-white font-heading mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>Dynamic QR Code</span>
              </h3>
              <QRCodeViewer business={business} />
            </div>

            {/* Assigned NFC Cards Panel */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  <span>Linked NFC Cards ({nfcCards.length})</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNfcModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Link Card
                </Button>
              </div>

              {nfcCards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No NFC cards currently assigned to this profile.
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsNfcModalOpen(true)}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Provision First NFC Card
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {nfcCards.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400">{c.publicId}</span>
                          <NfcStatusBadge status={c.status} showIcon={false} />
                        </div>
                        <div className="text-slate-400 truncate mt-0.5 max-w-[160px]">{c.label}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-mono">{c.totalTaps ?? 0} taps</span>
                        <Link
                          to={`/dashboard/nfc/${c.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Open Studio"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditBusinessModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          business={business}
          onUpdated={(updated) => {
            setBusiness(updated);
            loadDetails();
          }}
        />
      )}

      {/* Provision NFC Card Modal */}
      {isNfcModalOpen && business && (
        <CreateNfcModal
          isOpen={isNfcModalOpen}
          onClose={() => setIsNfcModalOpen(false)}
          onSuccess={() => {
            loadDetails();
          }}
          businesses={[business]}
          preselectedBusinessId={business.id}
        />
      )}
    </div>
  );
};
