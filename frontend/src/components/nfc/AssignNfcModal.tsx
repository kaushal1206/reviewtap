import React, { useState } from 'react';
import { X, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { Business, NfcCard } from '../../types';
import { NfcService } from '../../services/nfc.service';

interface AssignNfcModalProps {
  card: NfcCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businesses: Business[];
}

export const AssignNfcModal: React.FC<AssignNfcModalProps> = ({
  card,
  isOpen,
  onClose,
  onSuccess,
  businesses,
}) => {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(card?.businessId || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!isOpen || !card) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) {
      setServerError('Please select a business profile');
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError(null);
      await NfcService.assign(card.id, selectedBusinessId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message || err?.message || 'Failed to assign card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-heading">Assign NFC Card</h2>
              <p className="text-xs text-slate-400 font-mono">{card.publicId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleAssign} className="p-6 space-y-4">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Target Business Profile
            </label>
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            >
              <option value="">Select a business profile...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.slug})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              When tapped, customers will be redirected directly to this business's review destination.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Save Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
