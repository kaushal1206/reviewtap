import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../api/client';
import { Business } from '../../types';
import { Sparkles, Info, CheckCircle2 } from 'lucide-react';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (business: Business) => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [category, setCategory] = useState('Cafe & Restaurant');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill sample button for quick demonstration
  const handleQuickDemo = () => {
    setName('Blue Wave Espresso Lounge');
    setGoogleReviewUrl('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
    setCategory('Cafe & Restaurant');
    setPhone('+1 (512) 890-2100');
    setAddress('800 South Congress, Austin, TX');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Business name is required');
      return;
    }

    if (!googleReviewUrl.trim()) {
      setError('Google Review URL is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/businesses', {
        name,
        googleReviewUrl,
        category,
        phone: phone || undefined,
        address: address || undefined,
      });

      if (response.data.success) {
        onCreated(response.data.data.business);
        setName('');
        setGoogleReviewUrl('');
        setPhone('');
        setAddress('');
        onClose();
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { message?: string } } };
        setError(axErr.response?.data?.message || 'Failed to create business');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Business Profile"
      subtitle="Configure your Google Review URL and generate your unique QR/NFC smart link."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Quick Demo Autofill */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleQuickDemo}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            Fill demo sample data
          </button>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Business Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blue Wave Espresso Lounge"
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Google Review Destination URL */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Google Review URL *
            </label>
            <span className="text-[10px] text-slate-500">
              Direct review intent link
            </span>
          </div>
          <input
            type="url"
            required
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            placeholder="https://search.google.com/local/writereview?placeid=... or https://g.page/r/..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <div className="mt-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> In your Google Business Profile dashboard, click <em>&ldquo;Ask for reviews&rdquo;</em> and paste the review link directly here. ReviewTap uses this to route customers straight to your 5-star review modal.
            </span>
          </div>
        </div>

        {/* Category & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Cafe & Restaurant">Cafe & Restaurant</option>
              <option value="Retail & Boutique">Retail & Boutique</option>
              <option value="Health & Medical">Health & Medical</option>
              <option value="Beauty & Wellness">Beauty & Wellness</option>
              <option value="Automotive & Repair">Automotive & Repair</option>
              <option value="Professional Services">Professional Services</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (512) 555-0199"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Store / Office Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Main St, Suite 400, Austin, TX"
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Submit */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800/80">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Create Business & Generate QR
          </Button>
        </div>
      </form>
    </Modal>
  );
};
