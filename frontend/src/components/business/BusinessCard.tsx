import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Business, BusinessStatus } from '../../types';
import { Button } from '../common/Button';
import { getApiAssetUrl } from '../../api/client';
import { StatusBadge } from './StatusBadge';
import { EditBusinessModal } from './EditBusinessModal';
import {
  QrCode,
  Copy,
  Check,
  MapPin,
  Phone,
  BarChart3,
  Edit3,
  ArrowRight,
} from 'lucide-react';

interface BusinessCardProps {
  business: Business;
  onSelectQR: (business: Business) => void;
  onStatusChange?: (id: string, status: BusinessStatus) => Promise<void>;
  onBusinessUpdated?: (updated: Business) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  onSelectQR,
  onStatusChange,
  onBusinessUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const redirectUrl = `${window.location.origin}/r/${business.slug}`;

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(redirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

      <div>
        {/* Header with Title, Status and Category */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusBadge
                status={business.status || (business.isActive ? 'ACTIVE' : 'INACTIVE')}
                editable={!!onStatusChange}
                onStatusChange={onStatusChange ? (newStatus) => onStatusChange(business.id, newStatus) : undefined}
              />
              {business.category && (
                <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  {business.category}
                </span>
              )}
            </div>
            <Link
              to={`/dashboard/businesses/${business.id}`}
              className="text-lg font-bold text-white font-heading group-hover:text-indigo-300 transition-colors block truncate"
            >
              {business.name}
            </Link>
          </div>

          {/* Quick QR Thumbnail */}
          <button
            onClick={() => onSelectQR(business)}
            title="Open QR Studio"
            className="p-2 bg-white rounded-xl shadow-md border border-slate-700/60 hover:scale-105 transition-transform shrink-0"
          >
            <img
              src={getApiAssetUrl(`/api/businesses/${business.id}/qr?format=svg`)}
              alt="QR Code"
              className="w-10 h-10 block"
            />
          </button>
        </div>

        {/* Address and Phone */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-400">
          {business.address && (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{business.address}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2 truncate">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{business.phone}</span>
            </div>
          )}
        </div>

        {/* Smart Link Badge */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-2 mb-4">
          <div className="truncate text-xs font-mono text-indigo-300">
            /r/{business.slug}
          </div>
          <button
            onClick={copyUrl}
            className="p-1 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
            title="Copy Smart Link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Total Scans counter */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-white leading-none">
              {business.totalScans ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Total Scans
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            icon={<Edit3 className="w-3.5 h-3.5" />}
            title="Edit Business Details"
          >
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectQR(business)}
            icon={<QrCode className="w-3.5 h-3.5" />}
          >
            QR
          </Button>

          <Link to={`/dashboard/businesses/${business.id}`}>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              title="View Business Details"
            >
              Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditBusinessModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          business={business}
          onUpdated={(updated) => {
            if (onBusinessUpdated) onBusinessUpdated(updated);
          }}
        />
      )}
    </div>
  );
};
