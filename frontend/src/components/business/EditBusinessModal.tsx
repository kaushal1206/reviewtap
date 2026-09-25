import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Business } from '../../types';
import { BusinessService } from '../../services/business.service';
import { Lock, Save, Globe, MessageSquare, Instagram, Phone, MapPin } from 'lucide-react';

const editBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').trim(),
  category: z.string().optional(),
  googleReviewUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url: string) =>
        url.includes('google.com') ||
        url.includes('goo.gl') ||
        url.includes('g.page') ||
        url.includes('http'),
      {
        message: 'Must be a valid review destination URL',
      }
    ),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
});

type EditBusinessFormData = z.infer<typeof editBusinessSchema>;

interface EditBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onUpdated: (updated: Business) => void;
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  isOpen,
  onClose,
  business,
  onUpdated,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditBusinessFormData>({
    resolver: zodResolver(editBusinessSchema),
    defaultValues: {
      name: business.name,
      category: business.category || 'Cafe & Restaurant',
      googleReviewUrl: business.googleReviewUrl,
      phone: business.phone || '',
      address: business.address || '',
      website: business.website || '',
      whatsapp: business.whatsapp || '',
      instagram: business.instagram || '',
      logoUrl: business.logoUrl || '',
    },
  });

  const onSubmit = async (data: EditBusinessFormData) => {
    setServerError(null);
    try {
      const updated = await BusinessService.update(business.id, {
        ...data,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
      });
      if (updated) {
        onUpdated(updated);
        onClose();
      }
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message || err?.message || 'Failed to update business');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Business Profile"
      subtitle="Update contact details, social links, and Google Review destination."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {serverError}
          </div>
        )}

        {/* Stable Slug Display (Rule 10) */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Permanent Smart Link Slug:</span>
            <span className="font-mono text-indigo-300 font-semibold">/r/{business.slug}</span>
          </div>
          <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Locked (Preserves QR & NFC)
          </span>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Business Name *
          </label>
          <input
            type="text"
            {...register('name')}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
        </div>

        {/* Google Review Destination URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Google Review URL *
          </label>
          <input
            type="url"
            {...register('googleReviewUrl')}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.googleReviewUrl && (
            <p className="text-xs text-rose-400 mt-1">{errors.googleReviewUrl.message}</p>
          )}
        </div>

        {/* Category & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              {...register('category')}
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
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                {...register('phone')}
                placeholder="+1 (512) 555-0199"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Store / Office Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              {...register('address')}
              placeholder="e.g. 100 Main St, Austin, TX"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Website & Socials */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Website
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="url"
                {...register('website')}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            {errors.website && <p className="text-[10px] text-rose-400 mt-0.5">{errors.website.message}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              WhatsApp
            </label>
            <div className="relative">
              <MessageSquare className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                {...register('whatsapp')}
                placeholder="+1..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Instagram
            </label>
            <div className="relative">
              <Instagram className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                {...register('instagram')}
                placeholder="@handle"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
