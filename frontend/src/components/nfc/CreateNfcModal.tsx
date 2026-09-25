import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CreditCard, Radio, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { Business } from '../../types';
import { NfcService } from '../../services/nfc.service';

const createNfcCardSchema = z.object({
  label: z.string().trim().optional(),
  businessId: z.string().optional(),
  nfcTagUid: z.string().trim().optional(),
  batchNumber: z.string().trim().optional(),
  activateImmediately: z.boolean(),
});

type CreateNfcFormValues = {
  label?: string;
  businessId?: string;
  nfcTagUid?: string;
  batchNumber?: string;
  activateImmediately: boolean;
};

interface CreateNfcModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businesses: Business[];
  preselectedBusinessId?: string;
}

export const CreateNfcModal: React.FC<CreateNfcModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businesses,
  preselectedBusinessId,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateNfcFormValues>({
    resolver: zodResolver(createNfcCardSchema),
    defaultValues: {
      label: '',
      businessId: preselectedBusinessId || '',
      nfcTagUid: '',
      batchNumber: 'BATCH-2026-Q3',
      activateImmediately: true,
    },
  });

  const selectedBusinessId = watch('businessId');

  if (!isOpen) return null;

  const onSubmit = async (values: CreateNfcFormValues) => {
    try {
      setServerError(null);
      await NfcService.create({
        label: values.label?.trim() || undefined,
        businessId: values.businessId ? values.businessId : undefined,
        nfcTagUid: values.nfcTagUid?.trim() || undefined,
        batchNumber: values.batchNumber?.trim() || undefined,
        activateImmediately: Boolean(values.businessId && values.activateImmediately),
      });

      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message || err?.message || 'Failed to provision NFC card');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-heading">Provision New NFC Card</h2>
              <p className="text-xs text-slate-400">Generate a unique physical card identity with instant redirect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Card Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Front Desk NFC Stand 01"
              {...register('label')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assign to Business
            </label>
            <select
              {...register('businessId')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            >
              <option value="">Leave Unassigned (Hardware Inventory)</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.slug})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              You can keep the card unassigned and link it to any business later.
            </p>
          </div>

          {selectedBusinessId && (
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium text-slate-300">Activate Immediately on Creation</span>
              </div>
              <input
                type="checkbox"
                {...register('activateImmediately')}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                NFC Hardware UID (Optional)
              </label>
              <input
                type="text"
                placeholder="04:A2:3B:1F:90"
                {...register('nfcTagUid')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Batch Number
              </label>
              <input
                type="text"
                placeholder="BATCH-2026-Q3"
                {...register('batchNumber')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<CreditCard className="w-4 h-4" />}>
              Provision Card
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
